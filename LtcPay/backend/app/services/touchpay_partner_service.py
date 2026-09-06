"""
TouchPay partner API — check_status, get_balance, cashin.

Three endpoints TouchPay documents in its Insomnia collection and that we
had never used, all POST under {partner_api_url}/{agency}/ and all
authenticated with a partner_id + login_api + password_api triple that is
NOT the agency + loginAgent + passwordAgent pair the payin API takes:

    POST /{agency}/check_status   {partner_id, partner_transaction_id, login_api, password_api}
    POST /{agency}/get_balance    {partner_id, login_api, password_api}
    POST /{agency}/cashin         {service_id, recipient_phone_number, amount,
                                   partner_id, partner_transaction_id,
                                   login_api, password_api}

Why each matters here:

  check_status  a payin can succeed and never produce a callback. On
                2026-09-01 a TouchPay payment of 6 899 XAF sat PROCESSING
                until it was looked up by hand; on 2026-09-04 an AccountPE
                one expired while the provider had it as successful. This is
                the supported way to close that class instead of waiting.

  get_balance   we have no visibility on the agency float. A float at zero
                would produce exactly the kind of mass unexplained failures
                that took three days to diagnose on Gabon.

  cashin        merchant payouts are entirely manual today; two approved
                withdrawals have been unpaid since 2026-05-17. This is the
                rail that could settle them.

Credentials are per country (`supported_countries.tp_*`), falling back to
the global env settings, exactly like the payin ones.
"""
import logging
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.country_service import country_service

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 30.0

# check_status answers with the payin's own lifecycle state.
STATUS_SUCCESS = {"SUCCESSFUL", "SUCCEED", "SUCCESS", "COMPLETED"}
STATUS_FAILED = {"FAILED", "CANCELLED", "CANCELED", "REJECTED", "EXPIRED"}
STATUS_PENDING = {"PENDING", "INITIATED", "PROCESSING", "INPROGRESS", "IN_PROGRESS"}


class TouchPayPartnerError(Exception):
    """A partner API call could not be completed or was refused."""

    def __init__(self, message: str, status_code: int | None = None, raw: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.raw = raw or {}


class TouchPayPartnerService:

    @staticmethod
    def _url(base: str, agency: str, path: str) -> str:
        return f"{base.rstrip('/')}/{agency}/{path.lstrip('/')}"

    async def _credentials(self, db: AsyncSession, country_code: str) -> dict:
        creds = await country_service.get_decrypted_credentials(db, country_code)
        missing = [
            key for key in ("agency_code", "partner_id", "login_api", "password_api")
            if not creds.get(key)
        ]
        if missing:
            raise TouchPayPartnerError(
                f"TouchPay partner API not configured for {country_code}: "
                f"missing {', '.join(missing)}"
            )
        return creds

    async def _post(
        self, creds: dict, path: str, payload: dict, *, label: str,
    ) -> dict:
        """POST to the partner API and return the parsed body.

        Never raises on a business refusal: TouchPay answers HTTP 200 with an
        error status inside, and callers need the body to tell a genuine
        "not found" from an outage.
        """
        url = self._url(creds["partner_api_url"], creds["agency_code"], path)
        body = {
            **payload,
            "partner_id": creds["partner_id"],
            "login_api": creds["login_api"],
            "password_api": creds["password_api"],
        }
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                response = await client.post(url, json=body)
        except httpx.HTTPError as exc:
            raise TouchPayPartnerError(f"{label} unreachable: {exc}") from exc

        try:
            data = response.json()
        except ValueError:
            raise TouchPayPartnerError(
                f"{label} returned a non-JSON body (HTTP {response.status_code})",
                status_code=response.status_code,
            )
        if not isinstance(data, dict):
            raise TouchPayPartnerError(
                f"{label} returned an unexpected body", status_code=response.status_code,
            )
        if response.status_code >= 400:
            raise TouchPayPartnerError(
                str(data.get("detailMessage") or data.get("message") or f"HTTP {response.status_code}"),
                status_code=response.status_code,
                raw=data,
            )
        return data

    # -- check_status -----------------------------------------------------

    async def check_status(
        self, db: AsyncSession, country_code: str, partner_transaction_id: str,
    ) -> dict | None:
        """Server-side state of one payin, or None when it cannot be read.

        Returns {status, is_paid, is_failed, is_pending, raw}. None means
        "no usable answer" — callers must leave the payment alone rather
        than guess, which is the whole point of asking.
        """
        creds = await self._credentials(db, country_code)
        data = await self._post(
            creds, "check_status",
            {"partner_transaction_id": partner_transaction_id},
            label="check_status",
        )

        raw_status = data.get("status")
        if raw_status is None:
            inner = data.get("data")
            if isinstance(inner, dict):
                raw_status = inner.get("status")
        if raw_status is None:
            logger.warning(
                "check_status: no status for %s in %s",
                partner_transaction_id, str(data)[:300],
            )
            return None

        label = str(raw_status).strip().upper()
        return {
            "status": label,
            "is_paid": label in STATUS_SUCCESS,
            "is_failed": label in STATUS_FAILED,
            "is_pending": label in STATUS_PENDING,
            "raw": data,
        }

    # -- get_balance ------------------------------------------------------

    async def get_balance(self, db: AsyncSession, country_code: str) -> dict:
        """Current float of the country's agency.

        Returns {amount, currency, raw}; amount is None when TouchPay
        answers without a figure we can read, so a display never invents 0.
        """
        creds = await self._credentials(db, country_code)
        data = await self._post(creds, "get_balance", {}, label="get_balance")

        amount = None
        for key in ("balance", "amount", "solde", "available_balance"):
            value = data.get(key)
            if value is None and isinstance(data.get("data"), dict):
                value = data["data"].get(key)
            if value is not None:
                try:
                    amount = float(value)
                except (TypeError, ValueError):
                    amount = None
                if amount is not None:
                    break

        return {
            "amount": amount,
            "currency": data.get("currency") or data.get("currency_code"),
            "raw": data,
        }

    # -- cashin -----------------------------------------------------------

    async def cashin(
        self,
        db: AsyncSession,
        country_code: str,
        *,
        service_id: str,
        recipient_phone_number: str,
        amount: int,
        partner_transaction_id: str,
    ) -> dict:
        """Send money OUT to a mobile wallet — a merchant payout.

        Deliberately has no automatic caller: this moves real money out of
        the agency float, so it stays admin-triggered. `service_id` is a
        cash-in code (CASHINMTNCMPART, CASHINOMCMPART2, ...), which is a
        different namespace from the payin service codes.
        """
        creds = await self._credentials(db, country_code)
        logger.info(
            "TouchPay cashin: %s %s to %s (ref=%s)",
            amount, country_code, recipient_phone_number, partner_transaction_id,
        )
        return await self._post(
            creds, "cashin",
            {
                "service_id": service_id,
                "recipient_phone_number": recipient_phone_number,
                "amount": amount,
                "partner_transaction_id": partner_transaction_id,
            },
            label="cashin",
        )


touchpay_partner_service = TouchPayPartnerService()
