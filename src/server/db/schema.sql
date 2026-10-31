-- Merchant by GrowIOTA: Database Schema (merchant.growiota.in)
-- Production-ready, ACID compliant, strict foreign keys, indexing for tenant isolation

PRAGMA foreign_keys = ON;

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    business_category TEXT NOT NULL,
    gstin TEXT NOT NULL,
    pan TEXT NOT NULL,
    mid TEXT NOT NULL UNIQUE,
    terminal_id TEXT NOT NULL,
    primary_language TEXT NOT NULL DEFAULT 'en',
    bank_name TEXT NOT NULL,
    bank_account_number TEXT NOT NULL,
    bank_ifsc TEXT NOT NULL,
    bank_account_holder TEXT NOT NULL,
    soundbox_serial TEXT,
    soundbox_model TEXT,
    soundbox_battery INTEGER DEFAULT 95,
    soundbox_status TEXT DEFAULT 'ONLINE',
    soundbox_volume INTEGER DEFAULT 8,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Users Table for Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OWNER',
    created_at TEXT NOT NULL
);

-- 3. Connected Devices (Soundboxes, POS terminals)
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    device_type TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    model TEXT NOT NULL,
    battery_level INTEGER DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'ONLINE',
    volume INTEGER DEFAULT 8,
    language TEXT NOT NULL DEFAULT 'en',
    last_ping_at TEXT NOT NULL
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    fee_mdr NUMERIC NOT NULL DEFAULT 0.00,
    gst_on_mdr NUMERIC NOT NULL DEFAULT 0.00,
    net_settlement_amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    customer_name TEXT,
    customer_vpa TEXT,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL,
    settlement_batch_id TEXT,
    is_flagged_for_discrepancy INTEGER DEFAULT 0,
    discrepancy_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_time ON transactions(merchant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_batch ON transactions(settlement_batch_id);

-- 5. Settlement Batches
CREATE TABLE IF NOT EXISTS settlement_batches (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    settlement_date TEXT NOT NULL,
    gross_amount NUMERIC NOT NULL,
    total_mdr_fee NUMERIC NOT NULL DEFAULT 0.00,
    total_gst NUMERIC NOT NULL DEFAULT 0.00,
    net_disbursed_amount NUMERIC NOT NULL,
    bank_account TEXT NOT NULL,
    utr_number TEXT NOT NULL,
    status TEXT NOT NULL,
    transaction_count INTEGER NOT NULL,
    expected_disbursement_time TEXT NOT NULL,
    actual_disbursement_time TEXT,
    variance_amount NUMERIC DEFAULT 0.00,
    variance_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_merchant ON settlement_batches(merchant_id, settlement_date);

-- 6. Settlement Transactions Mapping
CREATE TABLE IF NOT EXISTS settlement_transactions (
    id TEXT PRIMARY KEY,
    settlement_batch_id TEXT NOT NULL REFERENCES settlement_batches(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    gross_amount NUMERIC NOT NULL,
    fee_deducted NUMERIC NOT NULL,
    net_amount NUMERIC NOT NULL
);

-- 7. Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    refund_amount NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROCESSED',
    settlement_deducted_batch_id TEXT,
    created_at TEXT NOT NULL
);

-- 8. Customer Khata / Credit Ledger
CREATE TABLE IF NOT EXISTS customer_records (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    total_credit_given NUMERIC NOT NULL DEFAULT 0.00,
    total_repaid NUMERIC NOT NULL DEFAULT 0.00,
    outstanding_balance NUMERIC NOT NULL DEFAULT 0.00,
    last_purchase_date TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT',
    notes TEXT,
    last_reminder_sent_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_records_merchant ON customer_records(merchant_id, status);

-- 9. Customer Payments (Khata Repayments)
CREATE TABLE IF NOT EXISTS customer_payments (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customer_records(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'CASH',
    receipt_note TEXT,
    timestamp TEXT NOT NULL
);

-- 10. Loan Repayment Schedules
CREATE TABLE IF NOT EXISTS repayment_schedules (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    loan_id TEXT,
    lender_name TEXT NOT NULL,
    daily_emi_amount NUMERIC NOT NULL,
    tenure_months INTEGER NOT NULL,
    remaining_installments INTEGER NOT NULL,
    total_principal NUMERIC NOT NULL,
    remaining_balance NUMERIC NOT NULL,
    auto_deduct_from_settlement INTEGER DEFAULT 1,
    next_deduction_date TEXT NOT NULL
);

-- 11. Growth Insights & Recommendations
CREATE TABLE IF NOT EXISTS growth_insights (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    evidence TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    projected_lift TEXT NOT NULL,
    assumptions TEXT NOT NULL,
    confidence_score INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    created_at TEXT NOT NULL
);

-- 12. Subscriptions (Paytm Monetization Module 1)
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    plan_tier TEXT NOT NULL,
    monthly_fee NUMERIC NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY',
    active_since TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    features_json TEXT NOT NULL
);

-- 13. Lending Partners & Loan Discovery (Paytm Monetization Module 2)
CREATE TABLE IF NOT EXISTS lending_partners (
    id TEXT PRIMARY KEY,
    partner_name TEXT NOT NULL,
    rbi_registration_number TEXT NOT NULL,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS loan_products (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES lending_partners(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    min_amount NUMERIC NOT NULL,
    max_amount NUMERIC NOT NULL,
    interest_rate_range TEXT NOT NULL,
    tenure_options TEXT NOT NULL,
    repayment_frequency TEXT NOT NULL DEFAULT 'DAILY_SETTLEMENT_DEDUCTION',
    eligibility_criteria TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loan_applications (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES loan_products(id) ON DELETE CASCADE,
    requested_amount NUMERIC NOT NULL,
    tenure_months INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    consent_given INTEGER NOT NULL DEFAULT 1,
    partner_reference_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 14. Marketing Campaigns (Paytm Monetization Module 3)
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    campaign_name TEXT NOT NULL,
    channel TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    discount_offer TEXT NOT NULL,
    min_order_value NUMERIC NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    estimated_reach INTEGER NOT NULL,
    budget NUMERIC NOT NULL DEFAULT 0.00,
    flyer_text TEXT NOT NULL,
    approved_by TEXT,
    approved_at TEXT,
    created_at TEXT NOT NULL
);

-- 15. Voice Conversations & Transcripts (Sarvam AI Session Log)
CREATE TABLE IF NOT EXISTS voice_conversations (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED'
);

CREATE TABLE IF NOT EXISTS voice_transcripts (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES voice_conversations(id) ON DELETE CASCADE,
    speaker TEXT NOT NULL,
    transcript_text TEXT NOT NULL,
    detected_language TEXT NOT NULL,
    intent_identified TEXT,
    tool_invoked TEXT,
    audio_url_or_ref TEXT,
    created_at TEXT NOT NULL
);

-- 16. Merchant Actions (Sensitive Operations Workflow)
CREATE TABLE IF NOT EXISTS merchant_actions (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    requires_approval INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    result_summary TEXT,
    created_at TEXT NOT NULL,
    reviewed_at TEXT,
    approved_at TEXT,
    executed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_actions_merchant_status ON merchant_actions(merchant_id, status);

-- 17. Consent Records
CREATE TABLE IF NOT EXISTS consent_records (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'GRANTED',
    granted_at TEXT NOT NULL,
    revoked_at TEXT,
    ip_address TEXT NOT NULL
);

-- 18. Immutable Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    role TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    immutable_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_merchant_time ON audit_logs(merchant_id, timestamp);

-- 19. Paytm Webhooks (Idempotency Store)
CREATE TABLE IF NOT EXISTS paytm_webhook_events (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    signature TEXT NOT NULL,
    processed_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROCESSED'
);

-- 20. Daily Executive Business Intelligence Briefings
CREATE TABLE IF NOT EXISTS daily_briefings (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    briefing_date TEXT NOT NULL,
    language TEXT NOT NULL,
    today_collections REAL NOT NULL,
    today_transactions INTEGER NOT NULL,
    settlement_status TEXT NOT NULL,
    settled_amount REAL NOT NULL,
    pending_amount REAL NOT NULL,
    refunds_count INTEGER NOT NULL DEFAULT 0,
    refunds_amount REAL NOT NULL DEFAULT 0,
    exceptions_notice TEXT,
    cash_flow_highlight TEXT,
    credit_overdue_summary TEXT,
    key_growth_opportunity TEXT,
    spoken_text TEXT NOT NULL,
    display_text TEXT,
    audio_base64 TEXT,
    duration_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_id, briefing_date, language)
);
CREATE INDEX IF NOT EXISTS idx_briefings_lookup ON daily_briefings(merchant_id, briefing_date, language);

-- 21. Automated Customer Voice Outreach Calls (Sarvam AI Telephony)
CREATE TABLE IF NOT EXISTS customer_voice_calls (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customer_records(id),
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    call_purpose TEXT NOT NULL, -- 'PAYMENT_REMINDER', 'PROMOTIONAL_OUTREACH', 'SETTLEMENT_ALERT'
    language TEXT NOT NULL,
    script_text TEXT NOT NULL,
    audio_base64 TEXT,
    call_status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'INITIATED', 'COMPLETED', 'FAILED', 'DISMISSED'
    triggered_by TEXT NOT NULL DEFAULT 'GEMINI_ANALYTICS',
    action_id TEXT REFERENCES merchant_actions(id),
    duration_seconds INTEGER DEFAULT 0,
    outcome_note TEXT,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_voice_calls_merchant ON customer_voice_calls(merchant_id, call_status);

-- 22. Gemini Business Analytics & Actionable Insights
CREATE TABLE IF NOT EXISTS gemini_business_insights (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- 'GROWTH', 'CREDIT_RISK', 'SETTLEMENT_ALERT', 'PROMOTION'
    headline TEXT NOT NULL,
    detailed_analysis TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.95,
    recommended_action TEXT NOT NULL,
    action_payload_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gemini_insights_merchant ON gemini_business_insights(merchant_id, created_at);
