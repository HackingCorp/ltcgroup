"""
Normalized payment failure reasons.

Maps the raw operator/TouchPay rejection messages (French OM messages,
bracketed MTN codes, TouchPay guard messages) to a stable machine-readable
``failure_code`` plus a customer-facing French message. Exposed on the
Payment API responses and in the merchant webhook payload so merchants can
tell their customer exactly why a payment did not go through.

Codes are stable API contract values — documented in the public docs page
(WebLTcPay /docs, section "Error codes"). Add new codes there when adding
them here.
"""
from typing import Optional

# (code, list of lowercase markers found in raw operator messages, customer message FR)
_FAILURE_RULES: list[tuple[str, tuple[str, ...], str]] = [
    (
        "INSUFFICIENT_FUNDS",
        ("insuffisant",),
        "Solde insuffisant sur le compte Mobile Money du client.",
    ),
    (
        "ACCOUNT_BLOCKED",
        ("bloque", "disabled or blocked"),
        "Le compte Mobile Money du client est bloque. Le client doit contacter son operateur.",
    ),
    (
        "ACCOUNT_NOT_FOUND",
        ("introuvable", "not found"),
        "Aucun compte Mobile Money trouve pour ce numero. Verifiez le numero saisi.",
    ),
    (
        "NOT_AUTHORIZED",
        ("unauthorized", "declined"),
        "Le client n'a pas autorise le paiement (demande de confirmation refusee ou non validee).",
    ),
    (
        "DUPLICATE_PAYMENT",
        ("operation similaire", "transaction id already exists"),
        "Une operation identique a ete envoyee il y a moins de 5 minutes. Le client doit patienter avant de reessayer.",
    ),
    (
        "WRONG_OPERATOR",
        ("appartient a", "operator_mismatch"),
        "Le numero de telephone n'appartient pas a l'operateur selectionne.",
    ),
    (
        "INVALID_PHONE",
        ("numero de telephone", "indicatif"),
        "Numero de telephone invalide (9 chiffres sans indicatif pays attendus).",
    ),
    (
        "TOO_MANY_ATTEMPTS",
        ("velocity", "trop de tentatives"),
        "Trop de tentatives de paiement pour ce numero. Le client doit reessayer dans 30 minutes.",
    ),
    (
        "OPERATOR_UNAVAILABLE",
        ("tec-internal", "erreur interne", "unable to process", "timed out", "timeout"),
        "L'operateur Mobile Money est momentanement indisponible. Reessayez dans quelques minutes.",
    ),
    (
        "REJECTED_BY_OPERATOR",
        ("echec chez le partenaire", "invalid transaction", "rejected"),
        "Le paiement a ete rejete par l'operateur (demande non validee, expiree ou refusee).",
    ),
]

_FALLBACK = (
    "PAYMENT_FAILED",
    "Le paiement a echoue. Le client peut reessayer ou utiliser un autre moyen de paiement.",
)


def classify_failure(raw_message: Optional[str]) -> tuple[str, str]:
    """Return (failure_code, customer_message) for a raw operator message."""
    raw = (raw_message or "").lower()
    for code, markers, message in _FAILURE_RULES:
        if any(marker in raw for marker in markers):
            return code, message
    return _FALLBACK


def extract_operator_reference(raw_message: Optional[str]) -> Optional[str]:
    """Pull the operator's own transaction reference out of a raw message.

    Orange Money appends it after a pipe, e.g.
    "Le solde du compte du payeur est insuffisant| MP260824FD3C4BF9D397491AE59C".
    It is the only handle Orange support can act on, so it must survive into
    the API and the merchant webhook instead of dying inside the raw blob.
    MTN sends bracketed codes with no reference — None then.
    """
    if not raw_message or "|" not in raw_message:
        return None

    candidate = raw_message.rsplit("|", 1)[1].strip()
    # Guard against a pipe used as ordinary punctuation: operator references
    # are a single alphanumeric run, no spaces.
    if not candidate or not candidate.isalnum() or len(candidate) < 6:
        return None
    return candidate


def payment_failure_raw_message(payment) -> Optional[str]:
    """Extract the raw operator failure message stored on a payment.

    Checks, in order: the TouchPay callback message (final verdict), the
    initiation rejection stored by the payments endpoint, and the callback
    copy kept inside direct_api_data.
    """
    touchpay_data = payment.touchpay_data or {}
    direct_data = payment.direct_api_data or {}
    return (
        touchpay_data.get("message")
        or direct_data.get("error")
        or (direct_data.get("callback") or {}).get("message")
        or (direct_data.get("detail") if isinstance(direct_data.get("detail"), str) else None)
    )
