# Privacy Policy - LTC Group

**Effective Date:** March 8, 2026
**Last Updated:** March 8, 2026

## 1. Introduction

LTC Group ("we", "our", "us") operates the LTC Group mobile application and associated services (the "Service"). This Privacy Policy explains how we collect, use, store, and protect your personal data in compliance with the General Data Protection Regulation (GDPR - Regulation (EU) 2016/679) and applicable data protection laws.

By using our Service, you agree to the collection and use of information in accordance with this policy.

## 2. Data Controller

**LTC Group**
Contact: privacy@ltcgroup.site

For questions about this policy or to exercise your data rights, contact us at the address above.

## 3. Data We Collect

### 3.1 Account Registration Data
- Email address
- Phone number
- First and last name
- Country of residence
- Password (stored as an irreversible hash)

### 3.2 KYC (Know Your Customer) Verification Data
- Date of birth
- Gender
- Residential address (street, city, postal code)
- Identity document type and number (encrypted at rest)
- Identity document expiry date
- Identity document images (front, back)
- Selfie/liveness verification image
- KYC verification scores and method

### 3.3 Financial Data
- Wallet balance
- Virtual card details (card number encrypted at rest)
- Transaction history (amounts, dates, types, status)
- Payment method details (mobile money phone numbers)

### 3.4 Technical Data
- Device tokens for push notifications
- IP addresses (recorded in audit logs)
- Timestamps of actions

## 4. Legal Basis for Processing (GDPR Art. 6)

| Data Category | Legal Basis | Purpose |
|---|---|---|
| Account data | Contract performance (Art. 6(1)(b)) | Service delivery |
| KYC data | Legal obligation (Art. 6(1)(c)) | Anti-money laundering compliance |
| Financial data | Contract performance (Art. 6(1)(b)) | Payment processing |
| Audit logs | Legitimate interest (Art. 6(1)(f)) | Security and fraud prevention |
| Push notification tokens | Consent (Art. 6(1)(a)) | Service notifications |

## 5. How We Use Your Data

We use your personal data to:

- Create and manage your user account
- Process virtual card purchases and transactions
- Verify your identity (KYC) as required by financial regulations
- Process wallet top-ups, transfers, and withdrawals
- Send transaction notifications and service alerts
- Detect and prevent fraud, unauthorized access, and security incidents
- Comply with legal and regulatory obligations
- Improve our services

## 6. Data Sharing and Third Parties

We share personal data with the following categories of recipients:

### 6.1 Payment and Card Providers
- **AccountPE (Swychr):** Virtual card issuance and KYC verification. Data shared: name, email, date of birth, address, identity document details, selfie.
- **Payin / E-nkap:** Payment processing for wallet top-ups. Data shared: name, email, phone number, payment amount.
- **Payout providers:** Withdrawal processing. Data shared: name, phone number, withdrawal amount.

### 6.2 Infrastructure Providers
- Cloud hosting and database services
- Email delivery services (SMTP)
- Firebase Cloud Messaging (push notifications)

We do not sell your personal data to third parties.

## 7. Data Security

We implement appropriate technical and organizational measures to protect your personal data:

- **Encryption at rest:** Sensitive fields (card numbers, identity document numbers) are encrypted using Fernet symmetric encryption
- **Encryption in transit:** All API communications use TLS/HTTPS
- **Password security:** Passwords are hashed using bcrypt with salt
- **Access control:** Role-based access with JWT authentication
- **Audit logging:** All sensitive operations are logged with timestamps and IP addresses
- **Rate limiting:** API endpoints are rate-limited to prevent abuse
- **Database security:** Parameterized queries to prevent SQL injection

## 8. Data Retention

We retain your personal data for the following periods:

| Data Type | Retention Period | Justification |
|---|---|---|
| Account data | Duration of account + 30 days | Service delivery |
| KYC documents | 6 months after approval | Regulatory compliance |
| Transaction records | 5 years | Financial regulation requirements |
| Audit logs | 1 year | Security and compliance |
| Push notification tokens | Until logout or deletion | Service delivery |
| Closed/deleted accounts | 30 days after deletion request | Fraud prevention grace period |

For detailed retention policies, see our Data Retention Policy document.

## 9. Your Rights (GDPR Articles 15-22)

As a data subject, you have the following rights:

### 9.1 Right of Access (Art. 15)
You can request a copy of all personal data we hold about you. Use the "Export My Data" feature in the app or contact us.

### 9.2 Right to Rectification (Art. 16)
You can update your profile information through the app at any time.

### 9.3 Right to Erasure (Art. 17)
You can request deletion of your account and personal data. Note that some data may be retained as required by financial regulations (e.g., transaction records for 5 years).

### 9.4 Right to Restriction of Processing (Art. 18)
You can request restriction of processing in certain circumstances.

### 9.5 Right to Data Portability (Art. 20)
You can export your data in a structured, machine-readable JSON format via `GET /api/v1/users/me/export`.

### 9.6 Right to Object (Art. 21)
You can object to processing based on legitimate interests.

### 9.7 Rights Related to Automated Decision-Making (Art. 22)
KYC verification may involve automated processing. You have the right to request human review of any automated decision.

## 10. Consent

By registering for our Service, you provide explicit consent for data processing as described in this policy. Your consent is recorded with a timestamp (`consent_given_at`).

You may withdraw consent at any time by:
- Contacting us at privacy@ltcgroup.site
- Requesting account deletion through the app

Withdrawal of consent does not affect the lawfulness of processing performed before withdrawal.

## 11. International Data Transfers

Your data may be transferred to and processed in countries outside your country of residence. We ensure appropriate safeguards are in place, including:
- Standard Contractual Clauses (SCCs) where applicable
- Adequacy decisions by the European Commission

## 12. Data Breach Notification

In the event of a personal data breach that is likely to result in a risk to your rights and freedoms:
- We will notify the relevant supervisory authority within 72 hours
- We will notify affected users without undue delay if the breach is likely to result in a high risk

## 13. Children's Privacy

Our Service is not directed to individuals under the age of 18. We do not knowingly collect personal data from children. Users must be at least 18 years old to register (enforced during KYC verification).

## 14. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. The "Last Updated" date at the top of this policy indicates when it was last revised.

## 15. Contact and Complaints

For privacy inquiries, data access requests, or complaints:
- **Email:** privacy@ltcgroup.site
- **Data Protection Officer:** dpo@ltcgroup.site

If you are unsatisfied with our response, you have the right to lodge a complaint with your local data protection supervisory authority.
