#!/usr/bin/env python3
"""
LtcPay - TouchPay webhook simulation script.

Sends a simulated TouchPay callback to the local server for testing.

Usage:
    python scripts/test_webhook.py --reference LTCPAY-XXXX --status success
    python scripts/test_webhook.py --reference LTCPAY-XXXX --status failed
"""
import argparse
import httpx
import json
import sys


def send_webhook(
    base_url: str,
    reference: str,
    status: str,
    amount: float = 1000.0,
    phone: str = "237670000000",
):
    """Send a simulated TouchPay callback."""
    payload = {
        "status": status,
        "transaction_id": reference,
        "operator_id": f"OP-{reference[-8:]}",
        "amount": amount,
        "phone": phone,
        "message": f"Simulated {status} callback for testing",
    }

    url = f"{base_url}/api/v1/callbacks/touchpay"

    print(f"Sending webhook to: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print()

    try:
        response = httpx.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except httpx.ConnectError:
        print(f"[ERROR] Cannot connect to {base_url}. Is the server running?")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Simulate TouchPay webhook callback")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8001",
        help="LtcPay server base URL (default: http://localhost:8001)",
    )
    parser.add_argument(
        "--reference",
        required=True,
        help="Transaction reference (e.g., LTCPAY-XXXXXXXXXXXX)",
    )
    parser.add_argument(
        "--status",
        choices=["success", "failed", "cancelled", "processing"],
        default="success",
        help="Callback status to simulate (default: success)",
    )
    parser.add_argument(
        "--amount",
        type=float,
        default=1000.0,
        help="Transaction amount (default: 1000.0)",
    )
    parser.add_argument(
        "--phone",
        default="237670000000",
        help="Payer phone number (default: 237670000000)",
    )

    args = parser.parse_args()
    send_webhook(
        base_url=args.base_url,
        reference=args.reference,
        status=args.status,
        amount=args.amount,
        phone=args.phone,
    )


if __name__ == "__main__":
    main()
