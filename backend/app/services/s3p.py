"""
S3P (Smobilpay) Payment Integration
For Mobile Money payments (MTN, Orange Money)

Flow: GET /cashout → POST /quotestd → POST /collectstd → GET /verifytx
"""

import hashlib
import hmac
import time
from typing import Optional, Dict, Any, Literal
from urllib.parse import quote

import httpx

from app.config import settings

# Service IDs
S3P_SERVICES = {
    "ORANGE_MONEY": "30056",
    "MTN_MOMO": "20056",
}

S3PServiceId = Literal["30056", "20056"]


class S3PError(Exception):
    """S3P payment error with user-friendly message"""

    def __init__(self, message: str, code: Optional[int] = None):
        self.message = message
        self.code = code
        super().__init__(message)


def map_s3p_error(resp_code: int, dev_msg: str = "") -> str:
    """Map S3P error codes to user-friendly messages in French"""
    error_map = {
        # Success
        0: "Paiement réussi.",
        # Orange Money transaction errors
        703202: "Vous avez rejeté la transaction. Veuillez réessayer si vous souhaitez continuer.",
        703108: "Solde insuffisant sur votre compte Orange Money.",
        703201: "La transaction n'a pas été confirmée à temps. Veuillez réessayer.",
        703000: "La transaction Orange Money a échoué. Veuillez réessayer.",
        # MTN Mobile Money transaction errors
        704005: "La transaction MTN Mobile Money a échoué. Veuillez réessayer.",
        # API/Auth errors
        4000: "Erreur de connexion au service de paiement. Veuillez réessayer.",
        50002: "Le service de paiement est temporairement en maintenance. Veuillez réessayer plus tard.",
        50001: "Le service de paiement est temporairement indisponible. Veuillez réessayer plus tard.",
        40001: "Erreur technique. Veuillez contacter le support.",
        40010: "Le numéro de téléphone fourni est invalide.",
        40030: "Solde insuffisant sur votre compte Mobile Money.",
        40031: "Le montant dépasse la limite autorisée pour cette transaction.",
        40020: "Transaction en cours de traitement. Veuillez patienter.",
        40021: "Cette transaction a déjà été effectuée.",
        40040: "Le service de paiement sélectionné n'est pas disponible.",
        # Quote/Merchant errors
        40302: "Service de paiement temporairement indisponible. Veuillez réessayer dans quelques minutes.",
        40301: "La demande de paiement a expiré. Veuillez recommencer.",
        40303: "Montant invalide pour ce service de paiement.",
        40304: "Le service de paiement n'est pas disponible pour ce numéro.",
        40305: "Limite de transactions atteinte. Veuillez réessayer plus tard.",
    }

    return error_map.get(resp_code, f"Une erreur de paiement est survenue. (Code: {resp_code})")


def percent_encode(value: str) -> str:
    """URL encode a string according to RFC 3986"""
    return quote(str(value), safe="")


def format_phone_for_s3p(phone: str) -> str:
    """
    Format phone number for S3P (without country code)
    S3P expects: 6XXXXXXXX (9 digits starting with 6)
    """
    # Remove all non-digit characters
    cleaned = "".join(c for c in phone if c.isdigit())

    # Remove country code if present
    if cleaned.startswith("237"):
        cleaned = cleaned[3:]

    # Ensure it starts with 6
    if not cleaned.startswith("6"):
        raise ValueError("Invalid Cameroon phone number. Must start with 6.")

    return cleaned


def detect_service(phone: str) -> S3PServiceId:
    """Detect payment service based on phone number"""
    cleaned = format_phone_for_s3p(phone)

    # More specific detection based on Cameroon prefixes
    if cleaned.startswith("67") or cleaned.startswith("68"):
        return S3P_SERVICES["MTN_MOMO"]
    if cleaned.startswith("69"):
        return S3P_SERVICES["ORANGE_MONEY"]
    if cleaned.startswith("65") or cleaned.startswith("66"):
        # 65 and 66 are typically MTN
        return S3P_SERVICES["MTN_MOMO"]

    # Default to MTN for other 6XX numbers
    return S3P_SERVICES["MTN_MOMO"]


def generate_s3p_headers(method: str, url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    """
    Generate S3P authentication headers with HMAC-SHA1 signature
    Format: s3pAuth, s3pAuth_timestamp="...", s3pAuth_signature="...", s3pAuth_nonce="...",
            s3pAuth_signature_method="HMAC-SHA1", s3pAuth_token="..."
    """
    timestamp = int(time.time() * 1000)
    nonce = int(time.time() * 1000)
    signature_method = "HMAC-SHA1"

    # S3P authentication parameters
    s3p_params = {
        "s3pAuth_nonce": nonce,
        "s3pAuth_timestamp": timestamp,
        "s3pAuth_signature_method": signature_method,
        "s3pAuth_token": settings.s3p_api_key,
    }

    # Merge all parameters
    all_params = {**(params or {}), **s3p_params}

    # Clean and trim values
    cleaned_params = {}
    for key, value in all_params.items():
        if value is not None:
            if isinstance(value, str):
                cleaned_params[key] = value.strip()
            else:
                cleaned_params[key] = str(value)

    # Sort alphabetically
    sorted_params = dict(sorted(cleaned_params.items()))

    # Create parameter string
    parameter_string = "&".join(f"{key}={value}" for key, value in sorted_params.items())

    # Create base string: METHOD&URL_ENCODED(url)&URL_ENCODED(parameterString)
    base_string = f"{method}&{percent_encode(url)}&{percent_encode(parameter_string)}"

    # Generate HMAC-SHA1 signature
    signature = hmac.new(
        settings.s3p_api_secret.encode("utf-8"), base_string.encode("utf-8"), hashlib.sha1
    ).digest()

    import base64

    signature_b64 = base64.b64encode(signature).decode("utf-8")

    # Create Authorization header
    auth_header = (
        f's3pAuth, s3pAuth_timestamp="{timestamp}", s3pAuth_signature="{signature_b64}", '
        f's3pAuth_nonce="{nonce}", s3pAuth_signature_method="{signature_method}", '
        f's3pAuth_token="{settings.s3p_api_key}"'
    )

    return {
        "Authorization": auth_header,
        "Content-Type": "application/json",
    }


class S3PClient:
    def __init__(self):
        self.base_url = settings.s3p_api_url
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)

    async def get_services(self, service_id: S3PServiceId) -> list[Dict[str, Any]]:
        """Step 1: Get available services and payItemId"""
        endpoint = "/cashout"
        url = f"{self.base_url}{endpoint}"
        params = {"serviceid": service_id}
        headers = generate_s3p_headers("GET", url, params)

        response = await self.client.get(endpoint, params=params, headers=headers)

        if not response.is_success:
            error_text = response.text
            try:
                error_data = response.json()
                raise S3PError(
                    map_s3p_error(error_data.get("respCode", 0), error_data.get("devMsg", "")),
                    error_data.get("respCode"),
                )
            except Exception:
                raise S3PError(f"Erreur de paiement: {error_text}")

        return response.json()

    async def create_quote(self, pay_item_id: str, amount: float) -> Dict[str, Any]:
        """Step 2: Create a quote for the payment"""
        endpoint = "/quotestd"
        url = f"{self.base_url}{endpoint}"

        body = {
            "payItemId": pay_item_id,
            "amount": int(amount),
        }

        headers = generate_s3p_headers("POST", url, body)

        response = await self.client.post(endpoint, json=body, headers=headers)

        if not response.is_success:
            error_text = response.text
            try:
                error_data = response.json()
                raise S3PError(
                    map_s3p_error(error_data.get("respCode", 0), error_data.get("devMsg", "")),
                    error_data.get("respCode"),
                )
            except Exception:
                raise S3PError(f"Erreur de paiement: {error_text}")

        return response.json()

    async def collect_payment(
        self, quote_id: str, service_number: str, external_ref: str, customer_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Step 3: Initiate payment collection"""
        endpoint = "/collectstd"
        url = f"{self.base_url}{endpoint}"

        body = {
            "quoteId": quote_id,
            "customerPhonenumber": "237691371922",  # Notification number
            "customerEmailaddress": "lontsi05@gmail.com",
            "customerName": customer_name or "Client LTC Finance",
            "customerAddress": "Cameroun",
            "serviceNumber": service_number,  # Customer's phone to charge (without 237)
            "trid": external_ref,
        }

        headers = generate_s3p_headers("POST", url, body)

        response = await self.client.post(endpoint, json=body, headers=headers)

        if not response.is_success:
            error_text = response.text
            try:
                error_data = response.json()
                raise S3PError(
                    map_s3p_error(error_data.get("respCode", 0), error_data.get("devMsg", "")),
                    error_data.get("respCode"),
                )
            except Exception:
                raise S3PError(f"Erreur de paiement: {error_text}")

        return response.json()

    async def verify_transaction(self, transaction_ref: str) -> Dict[str, Any]:
        """Step 4: Verify transaction status"""
        endpoint = "/verifytx"
        url = f"{self.base_url}{endpoint}"

        # S3P accepts either trid or ptn
        params = {"ptn": transaction_ref} if transaction_ref.startswith("99999") else {"trid": transaction_ref}

        headers = generate_s3p_headers("GET", url, params)

        response = await self.client.get(endpoint, params=params, headers=headers)

        if not response.is_success:
            error_text = response.text
            try:
                error_data = response.json()
                raise S3PError(
                    map_s3p_error(error_data.get("respCode", 0), error_data.get("devMsg", "")),
                    error_data.get("respCode"),
                )
            except Exception:
                raise S3PError(f"Erreur de paiement: {error_text}")

        # S3P returns an array of transactions
        data = response.json()
        transaction = data[0] if isinstance(data, list) else data

        if not transaction:
            raise S3PError("Transaction non trouvée")

        return {
            "ptn": transaction.get("ptn"),
            "status": transaction.get("status"),
            "amount": float(transaction.get("priceLocalCur", 0)),
            "errorMessage": (
                map_s3p_error(transaction.get("errorCode")) if transaction.get("errorCode") else None
            ),
        }

    async def initiate_payment(
        self, amount: float, phone: str, order_ref: str, customer_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Complete S3P payment flow"""
        try:
            # Format phone number (without country code)
            formatted_phone = format_phone_for_s3p(phone)

            # Detect service based on phone prefix
            service_id = detect_service(phone)

            # Generate unique transaction reference
            trid = f"LTC-{order_ref}-{int(time.time() * 1000)}"

            # STEP 1: Get payItemId from services
            services = await self.get_services(service_id)

            pay_item_id = None
            if isinstance(services, list):
                service = next((s for s in services if s.get("serviceid") == service_id), None)
                if not service:
                    raise S3PError(f"Service {service_id} not found")
                pay_item_id = service.get("payItemId")
            elif isinstance(services, dict) and "payItemId" in services:
                pay_item_id = services["payItemId"]
            else:
                raise S3PError("Unexpected response format from S3P services")

            # STEP 2: Create quote
            quote = await self.create_quote(pay_item_id, amount)

            if not quote.get("quoteId"):
                raise S3PError("Failed to create payment quote")

            # STEP 3: Initiate collection (sends push notification to customer)
            collection = await self.collect_payment(quote["quoteId"], formatted_phone, trid, customer_name)

            return {
                "success": True,
                "ptn": collection.get("ptn"),
                "trid": trid,
                "status": collection.get("status"),
                "message": collection.get("message", "Payment request sent. Please check your phone."),
            }
        except S3PError:
            raise
        except Exception as e:
            raise S3PError(f"Payment initiation failed: {str(e)}")


# Singleton instance
s3p_client = S3PClient()
