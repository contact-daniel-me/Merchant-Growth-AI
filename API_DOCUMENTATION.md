# Saathi by GrowIOTA: REST API Specification
*Commercial Merchant Business Intelligence API for Paytm Ecosystem*

---

## 1. Authentication & Tenant Context
All requests to merchant endpoints enforce tenant isolation. In production, pass the signed session token:
`Authorization: Bearer <TOKEN>`

### `POST /api/auth/login`
- **Body**: `{ "username": "sunil_sharma", "password": "Password123!" }`
- **Response**: `{ "success": true, "data": { "token": "...", "merchant": { ... } } }`

---

## 2. Merchant Profile & Language Configuration
### `GET /api/merchants`
Returns all registered merchant tenants.

### `GET /api/merchants/:merchantId`
Returns complete store profile, Soundbox serial, terminal ID, bank account, and KYC status.

### `PATCH /api/merchants/:merchantId/language`
- **Body**: `{ "language": "en" | "hi" | "ta" | "kn" | "te" }`
- Saves preferred language to merchant database profile for persistent multilingual experience.

---

## 3. Financial Intelligence & Daily Collections
### `GET /api/overview/:merchantId`
Computes verified daily financial summary directly from SQLite:
- `todayGrossCollections`: Total incoming customer payments
- `todayTransactionsCount`: Verified payment count
- `settledAmount`: Amount credited to bank
- `inTransitAmount`: Amount scheduled for midnight bank disbursement
- `discrepanciesCount` & `discrepanciesAmount`: Held or disputed variance
- `hourlyVolume`: Hourly footfall distribution (8 AM - 10 PM)
- `weeklyTrend`: 7-day verified collection trend

---

## 4. Settlement Reconciliation (Solves Problem A)
### `GET /api/settlements/:merchantId`
Reconciles transaction-level payments against settlement batches:
- Detects escrow holds, chargeback reserves, and bank delays
- Explains discrepancy reasons transparently
- Traces specific orders flagged for variance

---

## 5. Cash Flow Forecasting (Solves Problem C)
### `GET /api/cashflow/:merchantId`
Generates a 7-day cash flow forecast:
- Incorporates rolling 7-day baseline and retail weekend seasonality
- Automatically deducts daily loan EMI payments
- **Mandatory Disclosures**: Explicitly separates actual vs estimated figures and states confidence intervals (±12%).

---

## 6. Customer Khata Book & Dues (Solves Problem D)
### `GET /api/khata/:merchantId`
Returns customer ledger records with overdue calculation (`CURRENT`, `OVERDUE`, `HIGH_RISK`).

### `POST /api/khata/:merchantId`
- **Body**: `{ "customerName": "...", "customerPhone": "...", "amount": 1000, "dueDate": "2026-11-10", "notes": "..." }`
- Records store credit entry.

### `POST /api/khata/:merchantId/repay`
- **Body**: `{ "customerId": "KHATA-001", "amount": 500, "paymentMode": "CASH" }`
- Records partial or full customer repayment.

### `POST /api/khata/:merchantId/remind/:customerId`
- Prepares a draft WhatsApp reminder action for merchant review and authorization.

---

## 7. Declining Sales Intelligence (Solves Problem E)
### `GET /api/growth/:merchantId`
Evaluates current 7-day sales against the preceding 4-week weekly average:
- Status: `HEALTHY_GROWTH`, `STABLE`, `MODERATE_DECLINE`, `SHARP_DECLINE`
- Provides evidence, comparison period, root cause, suggested action, and projected outcome.

---

## 8. Sarvam AI Voice Agent (Solves Problem B & F)
### `POST /api/voice/query`
- **Body**: `{ "merchantId": "mer_sharma_kirana", "query": "How much money did I receive today?", "language": "en", "audioBase64": "..." }`
- **Execution Flow**:
  1. Audio transcribed via Sarvam Saaras v4 STT
  2. Intent identified & mapped to authorized backend tool
  3. Verified numbers retrieved from SQLite
  4. Natural response generated via Sarvam LLM
  5. Audio synthesized via Sarvam Bulbul v4 Flash TTS
  6. Conversation & transcripts logged for audit and consent tracking.

---

## 9. Paytm Monetization Modules
### Subscriptions
- `GET /api/monetization/subscriptions/:merchantId`
- `POST /api/monetization/subscriptions/:merchantId/upgrade` (`{ "planTier": "PREMIUM" | "BUSINESS_PRO" }`)

### Partner Loans
- `GET /api/monetization/loans/:merchantId`: Lists RBI-registered partner loans (Suryoday, Tata Capital, DMI) with legal disclaimer.
- `POST /api/monetization/loans/:merchantId/apply`: Submits application with explicit consent record.

### Marketing Campaigns
- `GET /api/monetization/campaigns/:merchantId`
- `POST /api/monetization/campaigns/:merchantId`: Creates promotional flyer draft.
- `POST /api/monetization/campaigns/:merchantId/approve`: Approves campaign for dispatch.

---

## 10. Paytm Gateway Webhook & Idempotency
### `POST /api/integrations/paytm/webhook`
- Validates signature using constant-time HMAC-SHA256
- Prevents duplicate event processing via `paytm_webhook_events` idempotency store.
