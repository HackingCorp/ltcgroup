"""
Mobile payment initiation router.

Single entry point used by both the merchant API (POST /api/v1/payments)
and the hosted checkout page (POST /pay/{ref}/submit) to initiate a mobile
money collection through the right PSP:

    provider_code, response = await initiate_mobile_payment(...)

Candidates come from provider_service.resolve_mobile_providers (active
providers of the country that serve the requested operator, by priority).
The loop fails over to the next candidate only on provider-side errors:
customer-caused rejections (insufficient balance, blocked wallet, wrong
operator, velocity cap) abort immediately — retrying the same wallet with
another PSP would just send the customer a second doomed payment push.

Raises:
    ProviderRoutingError   - no usable provider for (country, operator)
    OperatorMismatchError  - number provably belongs to another operator
    PaymentVelocityError   - too many attempts for this phone number
    TouchPayDirectError    - all candidates failed (or customer error);
                             raw_response["failover_trail"] lists earlier
                             attempts when a failover happened.
"""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.payment import Payment
from app.services.accountpe_service import accountpe_service
from app.services.provider_service import ProviderRoutingError, provider_service
from app.services.touchpay_direct_service import (
    OperatorMismatchError,
    TouchPayDirectError,
    is_customer_error,
    touchpay_direct_service,
)
from app.core.velocity import PaymentVelocityError
from app.services.failure_reasons import extract_operator_reference

logger = logging.getLogger(__name__)

# Payments whose initiation is running in this process, with the failure
# verdicts their callbacks brought in meanwhile, keyed by provider.
#
# A provider can call back before its own refusal has even reached us. On
# 2026-10-04 AccountPE refused PAY-26C68CAD7A59484C (115 381 XOF, Moov
# Togo) and forwarded GU's FAILED callback 0.2 s before its HTTP answer.
# The callback settled the payment FAILED and the merchant was told so,
# while the router was handing the payin to TouchPay, which accepted it and
# pushed the USSD prompt to the customer. A refusal from a leg we are
# leaving behind says nothing about the leg that is live; only the outcome
# of the whole initiation does. Uvicorn runs a single worker, so a dict is
# shared by the request and its callbacks.
_initiating: dict[str, dict[str, str]] = {}


def hold_failure_during_initiation(reference: str, provider_code: str, message: str | None) -> bool:
    """Keep a FAILED callback aside while its payment is still being initiated.

    Returns True when the verdict was held: the caller must not settle it.
    The initiation decides instead — FAILED if every provider refused, or
    if the one that accepted is the one whose refusal was held.
    """
    held = _initiating.get(reference)
    if held is None:
        return False
    held[provider_code] = message or f"{provider_code}: FAILED"
    logger.info(
        "Failure callback from %s for %s held: initiation still in flight",
        provider_code, reference,
    )
    return True


def extract_transaction_ids(response: dict) -> dict:
    """Provider and operator transaction ids from an accepted initiation.

    Both columns used to be filled from the callback only — so they stayed
    NULL on exactly the payments that never get one, which are the payments
    support has to look up (PAY-3433A41AF4E24354, stuck 40 minutes with both
    ids sitting unreachable inside the response JSON).

    TouchPay returns its own id as idFromGU. numTransaction is the operator's
    reference on Orange ("MP260828.1458.A39708") but merely repeats idFromGU
    on MTN, so it is kept only when it differs. AccountPE returns its id under
    data.id; its transaction_id field is our own reference echoed back.
    """
    ids: dict = {}
    provider_id = response.get("idFromGU") or response.get("transactionId")
    if not provider_id:
        data = response.get("data")
        if isinstance(data, dict) and data.get("id") is not None:
            provider_id = data["id"]

    operator_reference = response.get("numTransaction")

    if provider_id:
        ids["provider_transaction_id"] = str(provider_id)
    if operator_reference and str(operator_reference) != str(provider_id):
        ids["operator_transaction_id"] = str(operator_reference)
    return ids


async def _dispatch(
    db: AsyncSession,
    provider,
    payment: Payment,
    reference: str,
    amount: int,
    phone_number: str,
    operator_code: str,
    country_code: str,
    customer_info: dict | None,
    description: str | None,
) -> dict:
    if provider.code == "TOUCHPAY":
        callback_url = f"{settings.webhook_base_url}/api/v1/callbacks/touchpay-direct"
        return await touchpay_direct_service.initiate_payment(
            db=db,
            payment_reference=reference,
            amount=amount,
            phone_number=phone_number,
            operator_code=operator_code,
            country_code=country_code,
            callback_url=callback_url,
        )
    if provider.code == "ACCOUNTPE":
        # Unsigned per-request callbacks authenticate with this token; the
        # outcome param tells success from failure since their payload may
        # carry no status. The signed account-level webhook works regardless.
        base_cb = f"{settings.webhook_base_url}/api/v1/callbacks/accountpe?token={payment.payment_token}"
        cb = f"{base_cb}&outcome=success"
        failed_cb = f"{base_cb}&outcome=failed"
        info = customer_info or {}
        return await accountpe_service.initiate_payment(
            db=db,
            provider=provider,
            payment_reference=reference,
            amount=amount,
            phone_number=phone_number,
            operator_code=operator_code,
            country_code=country_code,
            customer_name=info.get("name"),
            customer_email=info.get("email"),
            description=description,
            callback_url=cb,
            failed_callback_url=failed_cb,
        )
    raise TouchPayDirectError(f"No integration for provider '{provider.code}'")


async def initiate_mobile_payment(
    db: AsyncSession,
    *,
    payment: Payment,
    reference: str,
    amount: int,
    phone_number: str,
    operator_code: str,
    country_code: str,
    customer_info: dict | None = None,
    description: str | None = None,
    merchant=None,
) -> tuple[str, dict]:
    """Initiate via the country's providers in priority order, with failover.

    Returns (provider_code_used, provider_response). When a failover
    happened, provider_response["failover_trail"] lists the failed attempts.
    """
    candidates = await provider_service.resolve_mobile_providers(
        db, country_code, operator_code,
    )
    candidates = provider_service.apply_merchant_prefs(
        candidates, merchant, "MOBILE", country_code,
    )
    if not candidates:
        raise ProviderRoutingError(
            f"Aucun fournisseur de paiement disponible pour l'operateur "
            f"'{operator_code}' dans le pays '{country_code}'."
        )

    _initiating[reference] = {}
    try:
        return await _initiate_in_order(
            db, candidates,
            payment=payment, reference=reference, amount=amount,
            phone_number=phone_number, operator_code=operator_code,
            country_code=country_code, customer_info=customer_info,
            description=description,
        )
    finally:
        _initiating.pop(reference, None)


async def _initiate_in_order(
    db: AsyncSession,
    candidates: list,
    *,
    payment: Payment,
    reference: str,
    amount: int,
    phone_number: str,
    operator_code: str,
    country_code: str,
    customer_info: dict | None,
    description: str | None,
) -> tuple[str, dict]:
    failover_trail: list[dict] = []
    for position, (provider, _op_row) in enumerate(candidates):
        is_last = position == len(candidates) - 1
        try:
            response = await _dispatch(
                db=db,
                provider=provider,
                payment=payment,
                reference=reference,
                amount=amount,
                phone_number=phone_number,
                operator_code=operator_code,
                country_code=country_code,
                customer_info=customer_info,
                description=description,
            )
        except (OperatorMismatchError, PaymentVelocityError):
            raise  # pre-flight rejections: identical outcome on any provider
        except TouchPayDirectError as exc:
            # An operator reference in the error means the operator opened a
            # transaction before refusing. Every provider fronts the same
            # operator, so the next one is bounced for "operation similaire"
            # (seen 2026-08-24) — a wasted call that also replaces the real
            # cause with a misleading duplicate error.
            customer_caused = is_customer_error(exc)
            operator_reference = extract_operator_reference(str(exc))
            # A timeout is not a refusal. We never read the answer, so the
            # operator may have accepted and be about to debit the customer;
            # sending the same payin to the next provider would either double
            # it or — what actually happened to PAY-4DB3A75B530848C8 on
            # 2026-09-09 — come back "operation similaire", mark the payment
            # FAILED, and bury a real 12 709 XAF collection.
            outcome_unknown = getattr(exc, "outcome_unknown", False)
            if customer_caused or is_last or operator_reference or outcome_unknown:
                if outcome_unknown and not is_last:
                    logger.warning(
                        "Provider %s gave no answer for %s (%s) — not failing "
                        "over: the payin may already be live at the operator",
                        provider.code, reference, exc,
                    )
                # Log only when this check is what stopped the failover:
                # customer rejections already abort on their own, and saying
                # otherwise would credit the guard with work it did not do.
                if operator_reference and not customer_caused and not is_last:
                    logger.info(
                        "Provider %s failed for %s but the operator already "
                        "registered the transaction (%s) — not failing over",
                        provider.code, reference, operator_reference,
                    )
                if failover_trail:
                    exc.raw_response = dict(exc.raw_response or {})
                    exc.raw_response["failover_trail"] = failover_trail
                raise
            failover_trail.append({"provider": provider.code, "error": str(exc)})
            logger.warning(
                "Provider %s failed for %s (%s) — failing over to %s",
                provider.code, reference, exc, candidates[position + 1][0].code,
            )
            continue

        # The provider that accepted may already have called back to refuse.
        refused = _initiating.get(reference, {}).get(provider.code)
        if refused:
            raise TouchPayDirectError(refused)

        response = dict(response)
        if failover_trail:
            response["failover_trail"] = failover_trail
        response["provider"] = provider.code
        return provider.code, response

    raise TouchPayDirectError("No provider candidate succeeded")  # unreachable
