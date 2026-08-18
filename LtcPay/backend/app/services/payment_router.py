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

logger = logging.getLogger(__name__)


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
            if is_customer_error(exc) or is_last:
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

        response = dict(response)
        if failover_trail:
            response["failover_trail"] = failover_trail
        response["provider"] = provider.code
        return provider.code, response

    raise TouchPayDirectError("No provider candidate succeeded")  # unreachable
