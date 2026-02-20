import asyncio
import html
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from decimal import Decimal
from typing import Optional

from app.config import settings
from app.models.user import User
from app.models.transaction import Transaction

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP."""

    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.from_email = settings.smtp_from_email

    def _send_sync(self, to: str, subject: str, html_body: str) -> bool:
        """Synchronous email send via SMTP (runs in a thread)."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = to

        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)

        with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
            server.starttls()
            if self.smtp_user and self.smtp_password:
                server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
        return True

    async def send_email(self, to: str, subject: str, html_body: str) -> bool:
        """
        Send an email via SMTP (non-blocking).

        Args:
            to: Recipient email address
            subject: Email subject
            html_body: HTML body content

        Returns:
            True if email was sent successfully, False otherwise
        """
        try:
            await asyncio.to_thread(self._send_sync, to, subject, html_body)
            logger.info(f"Email sent successfully to {to}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {str(e)}")
            return False

    async def send_kyc_approved(self, user: User) -> bool:
        """
        Send KYC approval notification email.

        Args:
            user: User whose KYC was approved

        Returns:
            True if email was sent successfully
        """
        first_name = html.escape(user.first_name)
        last_name = html.escape(user.last_name)
        subject = "KYC Verification Approved - LTC Group"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                .button {{ background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>KYC Verification Approved</h1>
                </div>
                <div class="content">
                    <p>Hello {first_name} {last_name},</p>
                    <p>Congratulations! Your KYC (Know Your Customer) verification has been approved.</p>
                    <p>You can now access all features of your LTC Group virtual card account, including:</p>
                    <ul>
                        <li>Create and manage virtual cards</li>
                        <li>Top up your cards</li>
                        <li>Make transactions worldwide</li>
                    </ul>
                    <p>Thank you for choosing LTC Group.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 LTC Group. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(user.email, subject, html_body)

    async def send_kyc_rejected(self, user: User, reason: str) -> bool:
        """
        Send KYC rejection notification email.

        Args:
            user: User whose KYC was rejected
            reason: Reason for rejection

        Returns:
            True if email was sent successfully
        """
        first_name = html.escape(user.first_name)
        last_name = html.escape(user.last_name)
        safe_reason = html.escape(reason) if reason else "Please contact support for more details."
        subject = "KYC Verification Update - LTC Group"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f44336; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                .reason-box {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>KYC Verification Update</h1>
                </div>
                <div class="content">
                    <p>Hello {first_name} {last_name},</p>
                    <p>We regret to inform you that your KYC (Know Your Customer) verification could not be approved at this time.</p>
                    <div class="reason-box">
                        <strong>Reason:</strong><br>
                        {safe_reason}
                    </div>
                    <p>You can resubmit your KYC documents after addressing the issues mentioned above.</p>
                    <p>If you have any questions, please contact our support team.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 LTC Group. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(user.email, subject, html_body)

    async def send_transaction_confirmation(self, user: User, transaction: Transaction) -> bool:
        """
        Send transaction confirmation email.

        Args:
            user: User who made the transaction
            transaction: Transaction details

        Returns:
            True if email was sent successfully
        """
        first_name = html.escape(user.first_name)
        last_name = html.escape(user.last_name)
        subject = f"Transaction Confirmation - {transaction.type.value} - LTC Group"

        # Format amount with currency
        amount_str = f"{transaction.amount:,.2f} {transaction.currency}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2196F3; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                .transaction-details {{ background-color: white; padding: 15px; margin: 15px 0; border-radius: 4px; }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }}
                .detail-label {{ font-weight: bold; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Transaction Confirmation</h1>
                </div>
                <div class="content">
                    <p>Hello {first_name} {last_name},</p>
                    <p>Your transaction has been processed successfully.</p>
                    <div class="transaction-details">
                        <div class="detail-row">
                            <span class="detail-label">Transaction ID:</span>
                            <span>{transaction.id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Type:</span>
                            <span>{transaction.type.value}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Amount:</span>
                            <span>{amount_str}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status:</span>
                            <span>{transaction.status.value}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date:</span>
                            <span>{transaction.created_at.strftime("%Y-%m-%d %H:%M:%S")}</span>
                        </div>
                    </div>
                    {f'<p><strong>Description:</strong> {html.escape(transaction.description)}</p>' if transaction.description else ''}
                    <p>Thank you for using LTC Group.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 LTC Group. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(user.email, subject, html_body)


# Singleton instance
email_service = EmailService()
