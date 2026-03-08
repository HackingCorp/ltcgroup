# Data Retention Policy - LTC Group

**Effective Date:** March 8, 2026
**Last Updated:** March 8, 2026

## 1. Purpose

This document defines the data retention periods for all categories of personal and operational data processed by LTC Group, in compliance with GDPR Article 5(1)(e) (storage limitation) and applicable financial regulations.

## 2. Retention Schedule

### 2.1 User Account Data

| Data Field | Retention Period | Action After Expiry |
|---|---|---|
| Email, name, phone | Duration of active account + 30 days | Anonymize or delete |
| Password hash | Duration of active account | Delete on account closure |
| Country code | Duration of active account + 30 days | Delete |
| Consent timestamp | Duration of active account + 5 years | Required for compliance proof |

### 2.2 KYC Verification Data

| Data Field | Retention Period | Action After Expiry |
|---|---|---|
| Identity document images | 6 months after KYC approval | Delete from storage |
| Identity document number | 6 months after KYC approval | Delete (encrypted at rest) |
| Selfie/liveness images | 6 months after KYC approval | Delete from storage |
| KYC verification scores | 6 months after KYC approval | Delete |
| OCR raw text | 6 months after KYC approval | Delete |
| Personal info (DOB, address) | Duration of active account | Delete on account closure |

**Justification:** KYC documents are retained for 6 months post-approval to handle regulatory audits and dispute resolution. After this period, they are no longer necessary for the original purpose.

### 2.3 Financial Transaction Data

| Data Field | Retention Period | Action After Expiry |
|---|---|---|
| Transaction records | 5 years from transaction date | Archive then delete |
| Wallet balance snapshots | Duration of active account | Delete on account closure |
| Payment provider references | 5 years from transaction date | Delete with transaction |

**Justification:** Financial regulations (Anti-Money Laundering directives) require retention of transaction records for a minimum of 5 years.

### 2.4 Virtual Card Data

| Data Field | Retention Period | Action After Expiry |
|---|---|---|
| Card number (encrypted) | Until card expiry + 1 year | Delete |
| Card balance/limits | Duration of active card | Delete on card removal |
| Provider card ID | Until card expiry + 1 year | Delete |

### 2.5 Audit Logs

| Data Field | Retention Period | Action After Expiry |
|---|---|---|
| Login/logout events | 1 year | Delete |
| Transaction audit logs | 5 years (aligned with financial data) | Delete |
| Profile change logs | 1 year | Delete |
| Security events | 2 years | Delete |
| Data export requests | 3 years | Delete |

### 2.6 Technical Data

| Data Field | Retention Period | Action After Expiry |
|---|---|---|
| Device tokens (FCM) | Until logout or token refresh | Delete |
| IP addresses in logs | 1 year | Anonymize |
| Request logs | 90 days | Delete |

### 2.7 Deleted Accounts

When a user requests account deletion:
1. Account is deactivated immediately (is_active=false)
2. Personal data is anonymized after 30 days (grace period for account recovery)
3. Transaction records are retained for the regulatory period (5 years)
4. KYC documents follow their own retention schedule
5. Audit logs are retained per their respective schedule

## 3. Automated Purge Process

A scheduled purge script (`scripts/purge_old_data.py`) runs daily via cron to enforce retention periods:

```
# Crontab entry (run daily at 3 AM UTC)
0 3 * * * docker exec ltc-backend python -m scripts.purge_old_data
```

The script performs the following actions:
1. Deletes KYC document URLs and verification data for users approved > 6 months ago
2. Deletes audit logs older than 1 year (non-financial)
3. Archives and deletes transaction records older than 5 years
4. Anonymizes data for accounts deleted > 30 days ago

## 4. Data Minimization

In accordance with GDPR Article 5(1)(c), we practice data minimization:
- Only collect data necessary for the stated purpose
- KYC verification scores are cleared on resubmission
- Password reset tokens are deleted after use
- Expired card data is purged regularly

## 5. Review and Updates

This retention policy is reviewed annually or when:
- Regulatory requirements change
- New data categories are introduced
- Business processes change significantly

## 6. Exceptions

Retention periods may be extended in the following cases:
- Active legal proceedings or investigations
- Regulatory audit in progress
- Dispute resolution with a user
- Court order or legal hold

Any extension must be documented and approved by the Data Protection Officer.
