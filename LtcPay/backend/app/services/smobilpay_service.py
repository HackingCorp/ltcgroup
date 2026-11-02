"""
Smobilpay (Maviance S3P) Collections Service

Server-to-server mobile money collection via the S3P API
(https://s3papidoc.smobilpay.maviance.info, v3.2.0):

  POST {base_url}/oauth/token        client_credentials, Basic publicKey:secretKey
  GET  {base_url}/v2/service         service master data (isReq* flags, masks)
  GET  {base_url}/v2/cashout         COLLECTION catalogue (money in to us)
  POST {base_url}/v2/quotestd        {payItemId, amount} -> single-use quoteId
  POST {base_url}/v2/collectstd      executes the quote -> ptn, status PENDING
  GET  {base_url}/v2/verifytx        status by trid or ptn (a LIST)

The names are inverted on purpose by Maviance: /cashout is the collection
catalogue, /cashin the payout one.

What the docs get wrong or leave out, checked on staging on 2026-11-02:
  - serviceNumber (the wallet, local digits) IS required by the mobile money
    services (40302 without it), and so is customerEmailaddress (4105).
  - verifytx answers a list; errorCode is null on success.
  - error bodies mix `respCode` as int or string, and `usrMsg` or
    `customerMsg: [{langCode, message}]`.
  - payItemIds look like S-112-949-MTNMOMO-20053-200050001-1; the documented
    S-1-/S-2- prefix rule does not hold.
  - With x-api-version 3.0.0 a successful collectstd answers PENDING anyway:
    only the webhook or verifytx settles a payment.
  - verifytx: at most once per 10 s per transaction, or the account can be
    suspended without warning (_verify_throttle).

A timeout or 5xx on collectstd is an unknown outcome (no failover): the
quote is consumed and the push may already be on the customer's phone.
A failed quote, or an unreachable host, means nothing is live.

Account-level config lives in payment_providers.config for code SMOBILPAY,
each key falling back to the environment (S3P_KEY, S3P_SECRET,
S3P_WEBHOOK_SECRET, S3P_URL — the production values live in Dokploy):
  public_key      (plain)
  secret_key      (encrypted)
  webhook_secret  (encrypted)  - shared secret given to Maviance ops; signs
                                 callbacks (HMAC-SHA1 in X-Signature)
  base_url        (plain)      - default: staging; production is
                                 https://s3pv2cm.smobilpay.com
"""
import hashlib
import hmac
import logging
import time
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.velocity import check_phone_velocity
from app.models.provider import ProviderConfig
from app.services.country_service import country_service
from app.services.failure_reasons import is_customer_failure
from app.services.provider_service import provider_service
from app.services.touchpay_direct_service import (
    InvalidPhoneNumberError,
    OperatorMismatchError,
    TouchPayDirectError,
)

logger = logging.getLogger(__name__)

STAGING_BASE_URL = "https://s3p.smobilpay.staging.maviance.info"
API_VERSION = "3.0.0"
FALLBACK_EMAIL = "paiements@ltcgroup.site"

STATUS_SUCCESS = "SUCCESS"
STATUS_ERRORED = "ERRORED"
STATUS_REVERSED = "REVERSED"
STATUS_PENDING = "PENDING"

VERIFY_MIN_INTERVAL_SECONDS = 10

# Smobilpay merchant code -> (our country, our operator). The `country` field
# of /v2/service is unreliable (Moov Tchad, Orange RCA and Airtel Congo are
# all labelled CMR on staging), the merchant code is not. Lower rank wins
# when several services collect for the same operator (Orange Cameroon has
# three).
MERCHANT_MAP: dict[str, tuple[str, str, int]] = {
    # Production (2026-11-02): the "Collections" services.
    "CMMTNMOMOCC": ("CM", "MTN", 0),
    "CMORANGEOMCC": ("CM", "ORANGE", 0),
    # Staging names.
    "MTNMOMO": ("CM", "MTN", 1),
    "CMORANGEMOMO": ("CM", "ORANGE", 1),
    "CMORANGEOM": ("CM", "ORANGE", 2),
    "GABAIRTELMONEY": ("GA", "AIRTEL", 0),
    "GABMOOVMONEY": ("GA", "MOOV", 0),
    "TCDMOOVMONEY": ("TD", "MOOV", 0),
    "TCDAIRTELMONEY": ("TD", "AIRTEL", 0),
    "CGMTNMOMO": ("CG", "MTN", 0),
    "CGAIRTELMONEY": ("CG", "AIRTEL", 0),
    "RCAOM": ("CF", "ORANGE", 0),
    "MTNCI": ("CI", "MTN", 0),
}

# Payment errors (errorCode on verifytx / callbacks) worded so that
# failure_reasons classifies them like the other providers' messages.
ERROR_MESSAGES = {
    "703107": "Solde insuffisant sur le compte Mobile Money (703107)",
    "703202": "Paiement refuse par le client - declined (703202)",
    "703201": "Paiement non confirme par le client dans le delai (703201)",
    "703203": "Code PIN ou OTP incorrect (703203)",
    "703103": "Compte Mobile Money bloque (703103)",
    "702102": "Montant inferieur au minimum de l'operateur (702102)",
    "702103": "Montant superieur au maximum de l'operateur (702103)",
}


class SmobilpayError(TouchPayDirectError):
    """Smobilpay API error. Subclasses TouchPayDirectError so the existing
    initiation error handling (customer-error classification, friendly
    messages, HTTP mapping, failover rules) applies unchanged."""


def error_code_message(error_code: Any) -> str:
    code = str(error_code or "").strip()
    if not code or code == "0":
        return "Smobilpay: paiement refuse"
    return ERROR_MESSAGES.get(code, f"Smobilpay: paiement refuse (code {code})")


def _error_message(body: Any, status_code: int) -> str:
    """Readable message from an S3P error body, whichever shape it takes."""
    if not isinstance(body, dict):
        return f"Smobilpay HTTP {status_code}"
    text = body.get("usrMsg") or ""
    if not text and isinstance(body.get("customerMsg"), list):
        for entry in body["customerMsg"]:
            if isinstance(entry, dict) and entry.get("message"):
                text = entry["message"]
                if str(entry.get("langCode", "")).lower().startswith("fr"):
                    break
    dev = body.get("devMsg") or ""
    code = body.get("respCode")
    parts = [p for p in (text, dev) if p]
    message = " - ".join(parts) or f"Smobilpay HTTP {status_code}"
    return f"{message} ({code})" if code not in (None, "") else message


def _resp_code(body: Any) -> str:
    return str(body.get("respCode") or "") if isinstance(body, dict) else ""


def is_staging(base_url: str) -> bool:
    return "staging" in (base_url or "").lower() or "acceptance" in (base_url or "").lower()


def amount_covers(reported: Any, expected: Any) -> bool:
    """Whether a reported price pays at least the amount we asked for."""
    if reported in (None, ""):
        return False
    try:
        return Decimal(str(reported)) >= Decimal(int(expected))
    except (InvalidOperation, ValueError, TypeError):
        return False


# Bearer cache: (base_url, public_key) -> (token, monotonic expiry).
_tokens: dict[tuple[str, str], tuple[str, float]] = {}
# Last verifytx per transaction (monotonic), see VERIFY_MIN_INTERVAL_SECONDS.
_last_verify: dict[str, float] = {}


def normalize_base_url(url: str) -> str:
    """API root: /oauth/token hangs off it, the /v2 paths are appended."""
    url = (url or "").strip().rstrip("/")
    return url[:-3] if url.endswith("/v2") else url


def effective_config(provider: ProviderConfig) -> dict:
    """Provider config, each missing key taken from the environment."""
    config = provider_service.decrypted_config(provider)
    env = {
        "public_key": settings.S3P_KEY,
        "secret_key": settings.S3P_SECRET,
        "webhook_secret": settings.S3P_WEBHOOK_SECRET,
        "base_url": settings.S3P_URL,
    }
    out = dict(config)
    for key, value in env.items():
        value = (value or "").strip().strip('"').strip("'")
        if not out.get(key) and value:
            out[key] = value
    out["base_url"] = normalize_base_url(out.get("base_url") or STAGING_BASE_URL)
    return out


def env_config_keys() -> list[str]:
    """Config keys the environment provides (shown as set on the providers screen)."""
    pairs = (("public_key", settings.S3P_KEY), ("secret_key", settings.S3P_SECRET),
             ("webhook_secret", settings.S3P_WEBHOOK_SECRET), ("base_url", settings.S3P_URL))
    return [key for key, value in pairs if (value or "").strip()]


class SmobilpayService:

    @staticmethod
    def _config(provider: ProviderConfig) -> tuple[str, str, str]:
        config = effective_config(provider)
        return config.get("public_key") or "", config.get("secret_key") or "", config["base_url"]

    async def _token(self, client: httpx.AsyncClient, base_url: str, public_key: str,
                     secret_key: str, force: bool = False) -> str:
        key = (base_url, public_key)
        cached = _tokens.get(key)
        if cached and not force and cached[1] > time.monotonic():
            return cached[0]
        response = await client.post(
            f"{base_url}/oauth/token",
            auth=(public_key, secret_key),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json"},
        )
        try:
            body = response.json()
        except ValueError:
            body = None
        if response.status_code != 200 or not isinstance(body, dict) or not body.get("access_token"):
            raise SmobilpayError(
                f"Smobilpay authentification refusee: {_error_message(body, response.status_code)}",
                status_code=response.status_code,
                raw_response=body if isinstance(body, dict) else None,
            )
        ttl = int(body.get("expires_in") or 3600)
        _tokens[key] = (body["access_token"], time.monotonic() + max(ttl - 60, 30))
        return body["access_token"]

    async def _request(
        self, client: httpx.AsyncClient, provider: ProviderConfig, method: str,
        path: str, **kwargs,
    ) -> httpx.Response:
        """Authenticated call; mints a fresh bearer once if it was rejected."""
        public_key, secret_key, base_url = self._config(provider)
        if not public_key or not secret_key:
            raise SmobilpayError("Smobilpay public_key/secret_key are not configured")
        for attempt in (0, 1):
            token = await self._token(client, base_url, public_key, secret_key, force=attempt == 1)
            headers = {
                "Authorization": f"Bearer {token}",
                "x-api-version": API_VERSION,
                "Accept": "application/json",
            }
            response = await client.request(method, f"{base_url}{path}", headers=headers, **kwargs)
            if response.status_code == 401 and attempt == 0:
                continue
            try:
                body = response.json()
            except ValueError:
                body = None
            if attempt == 0 and _resp_code(body) in ("4009", "4001", "4000"):
                continue
            return response
        return response

    @staticmethod
    def _json(response: httpx.Response) -> Any:
        try:
            return response.json()
        except ValueError:
            return None

    # ── Master data ──────────────────────────────────────────────

    async def get_catalogue(self, provider: ProviderConfig) -> dict:
        """Services, collection items and account of the agent. Raises SmobilpayError."""
        out: dict = {}
        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                for name, path in (("services", "/v2/service"), ("cashout", "/v2/cashout"),
                                   ("account", "/v2/account")):
                    response = await self._request(client, provider, "GET", path)
                    body = self._json(response)
                    if response.status_code != 200:
                        raise SmobilpayError(
                            f"{path}: {_error_message(body, response.status_code)}",
                            status_code=response.status_code,
                        )
                    out[name] = body
        except httpx.HTTPError as exc:
            raise SmobilpayError(f"Smobilpay injoignable: {exc}") from exc
        return out

    # ── Status ───────────────────────────────────────────────────

    async def verify_transaction(
        self, provider: ProviderConfig, trid: str | None = None, ptn: str | None = None,
    ) -> dict | None:
        """The transaction's PaymentStatus, or None when unusable or throttled.

        Callers must leave the payment untouched on None rather than guess.
        """
        key = trid or ptn
        if not key:
            return None
        now = time.monotonic()
        last = _last_verify.get(key)
        if last is not None and now - last < VERIFY_MIN_INTERVAL_SECONDS:
            logger.info("Smobilpay verifytx for %s skipped: last call %.0fs ago", key, now - last)
            return None
        _last_verify[key] = now
        params = {"ptn": ptn} if ptn else {"trid": trid}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await self._request(client, provider, "GET", "/v2/verifytx", params=params)
        except (httpx.HTTPError, SmobilpayError) as exc:
            logger.warning("Smobilpay verifytx failed for %s: %s", key, exc)
            return None
        body = self._json(response)
        if response.status_code != 200:
            logger.warning(
                "Smobilpay verifytx for %s: HTTP %s %s", key, response.status_code, response.text[:200],
            )
            return None
        items = body if isinstance(body, list) else [body] if isinstance(body, dict) else []
        items = [i for i in items if isinstance(i, dict) and i.get("status")]
        if trid:
            items = [i for i in items if str(i.get("trid") or "") == trid] or items
        if ptn:
            items = [i for i in items if str(i.get("ptn") or "") == ptn] or items
        if not items:
            return None
        # trid is not unique at Maviance: a success anywhere wins, then the latest.
        for item in items:
            if str(item.get("status")).upper() == STATUS_SUCCESS:
                return item
        return sorted(items, key=lambda i: str(i.get("timestamp") or ""))[-1]

    # ── Initiation ───────────────────────────────────────────────

    async def initiate_payment(
        self,
        db: AsyncSession,
        provider: ProviderConfig,
        payment_reference: str,
        amount: int,
        phone_number: str,
        operator_code: str,
        country_code: str,
        callback_url: str | None = None,
        customer_email: str | None = None,
        customer_name: str | None = None,
    ) -> dict:
        """Quote then collect. Raises SmobilpayError on any refusal.

        The returned dict exposes the PTN as `transactionId`, which is where
        extract_transaction_ids looks for it.
        """
        public_key, secret_key, base_url = self._config(provider)
        if not public_key or not secret_key:
            raise SmobilpayError("Smobilpay public_key/secret_key are not configured")
        if settings.environment == "production" and is_staging(base_url):
            # Staging approves every collection: on the live platform that
            # would credit merchants for money nobody paid.
            raise SmobilpayError(
                "Smobilpay est configure sur l'environnement de test : refuse en production"
            )

        country = await country_service.get_active_country(db, country_code)
        normalized_phone = country_service.normalize_phone(
            phone_number, country.phone_prefix, country.phone_digits,
        )
        length_error = country_service.phone_length_error(normalized_phone, country)
        if length_error:
            raise InvalidPhoneNumberError(length_error)

        # The collection payItemId is stored as service_code on the row.
        operators = await country_service.get_active_operators(
            db, country_code, provider_code="SMOBILPAY",
        )
        op = next((o for o in operators if o.operator_code == operator_code.upper()), None)
        if not op or not op.service_code:
            raise SmobilpayError(
                f"Operator '{operator_code}' not available via Smobilpay for '{country_code}'"
            )

        if getattr(country, "enforce_phone_prefix_check", True):
            all_operators = await country_service.get_operators(db, country_code)
            mismatch = country_service.operator_mismatch(
                all_operators, normalized_phone, operator_code,
            )
            if mismatch:
                raise OperatorMismatchError(
                    country_service.operator_mismatch_message(all_operators, mismatch),
                    raw_response={
                        "detected_operator": mismatch.operator_code,
                        "detected_operator_available": country_service.operator_is_available(
                            all_operators, mismatch.operator_code,
                        ),
                    },
                )
        check_phone_velocity(normalized_phone)

        logger.info(
            "Smobilpay: initiating collection ref=%s amount=%s operator=%s country=%s phone=%s item=%s",
            payment_reference, amount, operator_code, country_code, normalized_phone, op.service_code,
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 1. Quote. Nothing is live until collectstd: any failure here
                # lets the router fail over.
                try:
                    response = await self._request(
                        client, provider, "POST", "/v2/quotestd",
                        json={"payItemId": op.service_code, "amount": int(amount)},
                    )
                except httpx.HTTPError as exc:
                    raise SmobilpayError(f"Smobilpay quote failed: {exc}") from exc
                body = self._json(response)
                if response.status_code != 200 or not isinstance(body, dict) or not body.get("quoteId"):
                    msg = _error_message(body, response.status_code)
                    logger.warning("Smobilpay quote refused ref=%s: %s", payment_reference, msg)
                    raise SmobilpayError(
                        msg, status_code=response.status_code,
                        raw_response=body if isinstance(body, dict) else None,
                    )
                quote = body

                # 2. Collect.
                payload: dict[str, Any] = {
                    "quoteId": quote["quoteId"],
                    "customerPhonenumber": f"{country.phone_prefix}{normalized_phone}",
                    "customerEmailaddress": (customer_email or "").strip() or FALLBACK_EMAIL,
                    "serviceNumber": normalized_phone,
                    "trid": payment_reference,
                }
                if customer_name:
                    payload["customerName"] = customer_name[:100]
                if callback_url:
                    payload["callbackUrl"] = callback_url
                try:
                    response = await self._request(
                        client, provider, "POST", "/v2/collectstd", json=payload,
                    )
                except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
                    logger.error("Smobilpay unreachable for ref=%s: %s", payment_reference, exc)
                    raise SmobilpayError(f"Smobilpay unreachable: {exc}") from exc
                except httpx.HTTPError as exc:
                    logger.error("Smobilpay no answer for ref=%s: %s", payment_reference, exc)
                    raise SmobilpayError(f"Request timed out: {exc}", outcome_unknown=True) from exc
        except httpx.HTTPError as exc:  # token endpoint
            raise SmobilpayError(f"Smobilpay unreachable: {exc}") from exc

        body = self._json(response)
        status_code = response.status_code
        if status_code == 408 or status_code >= 500:
            logger.error(
                "Smobilpay HTTP %s for ref=%s body=%s", status_code, payment_reference, response.text[:500],
            )
            raise SmobilpayError(
                _error_message(body, status_code), status_code=status_code,
                raw_response=body if isinstance(body, dict) else None, outcome_unknown=True,
            )
        if status_code != 200 or not isinstance(body, dict) or not body.get("ptn"):
            msg = _error_message(body, status_code)
            level = logging.INFO if is_customer_failure(msg) else logging.WARNING
            logger.log(level, "Smobilpay refused ref=%s: HTTP %s %s", payment_reference, status_code, msg)
            raise SmobilpayError(
                msg, status_code=status_code, raw_response=body if isinstance(body, dict) else None,
            )

        status = str(body.get("status") or STATUS_PENDING).upper()
        if status in (STATUS_ERRORED, STATUS_REVERSED):
            msg = error_code_message(body.get("errorCode"))
            logger.info("Smobilpay rejected ref=%s at initiation: %s", payment_reference, msg)
            raise SmobilpayError(msg, raw_response=body)

        logger.info(
            "Smobilpay: collection created ref=%s ptn=%s status=%s",
            payment_reference, body.get("ptn"), status,
        )
        # SUCCESS here is never final (the doc rewrites it to PENDING under
        # x-api-version 3.0.0): settlement waits for the callback or verifytx.
        return {
            "status": "pending",
            "transactionId": str(body["ptn"]),
            "smobilpay": body,
        }


def verify_webhook_signature(raw_body: bytes, signature: str | None, secret: str) -> bool:
    """HMAC-SHA1 of the raw body with the shared secret, lowercase hex."""
    if not signature or not secret:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha1).hexdigest()
    return hmac.compare_digest(expected, signature.strip().lower())


smobilpay_service = SmobilpayService()
