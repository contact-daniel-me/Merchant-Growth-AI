# Merchant by GrowIOTA: Deployment & Security Operations Guide (merchant.growiota.in)

---

## 1. Quick Start (Development)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env

# 3. Run automated tests
npm test

# 4. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Production Build & Docker Deployment

### Building Locally
```bash
# Production bundle
npm run build

# Start production server
npm start
```

### Docker Deployment
```bash
docker compose up -d --build
```

---

## 3. Database Operations & Backups (SQLite in WAL Mode)

The application utilizes `node:sqlite` in Write-Ahead Logging (`WAL`) mode with foreign key enforcement.

### Online Safe Backup
Because SQLite is running in WAL mode, you can safely copy or backup the database without shutting down the server:
```bash
# Linux/macOS
sqlite3 merchant.db ".backup 'merchant-backup-$(date +%Y%m%d).db'"

# PowerShell (Windows)
sqlite3 merchant.db ".backup 'merchant-backup-$(Get-Date -Format yyyyMMdd).db'"
```

---

## 4. Production Security Checklist

- [x] **Strict Tenant Isolation**: Every financial and customer query scopes by `merchant_id`. Cross-tenant queries are blocked.
- [x] **Sensitive Action Workflow**: Critical actions (credit reminders, settlement disputes, marketing campaigns) require explicit merchant authorization (Draft → Review → Approval → Execution → Audit).
- [x] **Cryptographic Security**: Passwords hashed with PBKDF2 (10,000 iterations + random salt); webhooks validated with timing-safe HMAC-SHA256 signatures.
- [x] **Idempotency**: Webhook events deduplicated through `paytm_webhook_events`.
- [x] **Audit Trail**: Every sensitive operation writes to immutable `audit_logs` with SHA-256 hash.
- [x] **No Floating Point Financial Math**: All currency numbers are calculated with exact decimal rounding.
- [x] **Regulatory Disclaimers**: Partner loans prominently state that final underwriting resides with the RBI-registered lending partner.

