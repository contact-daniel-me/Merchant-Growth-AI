import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'merchant.db');

export class AppDatabase {
  private static instance: DatabaseSync | null = null;

  public static getDB(): DatabaseSync {
    if (!this.instance) {
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.instance = new DatabaseSync(DB_PATH);
      this.instance.exec('PRAGMA foreign_keys = ON;');
      this.instance.exec('PRAGMA journal_mode = WAL;');
      this.instance.exec('PRAGMA busy_timeout = 5000;');
      this.initSchema();
      this.seedInitialData();
    }
    return this.instance;
  }

  private static initSchema() {
    // In development this file runs from src/server/db/. In production it is bundled into
    // dist/server.js, so __dirname is dist/ and schema.sql sits elsewhere (the Dockerfile copies it
    // to src/server/db/). Previously a missing file was silently skipped, leaving an empty database
    // and "no such table: merchants" on every API call.
    const candidates = [
      path.resolve(__dirname, 'schema.sql'),
      path.resolve(process.cwd(), 'src/server/db/schema.sql'),
      path.resolve(process.cwd(), 'dist/schema.sql'),
      path.resolve(__dirname, '../src/server/db/schema.sql'),
    ];
    const schemaPath = candidates.find((p) => fs.existsSync(p));
    if (!schemaPath) {
      throw new Error(`[Database] schema.sql not found. Looked in: ${candidates.join(', ')}`);
    }
    this.instance!.exec(fs.readFileSync(schemaPath, 'utf8'));
  }

  /**
   * Seeds realistic commercial data for development & staging
   * In strict production mode (NODE_ENV=production), synthetic seed is skipped
   */
  public static seedInitialData() {
    const db = this.instance!;

    // In production, preserve strictly live data from real-world merchant integrations
    if (process.env.NODE_ENV === 'production' && !process.env.SEED_DEMO_DATA) {
      console.log('[Database] Production environment detected: Synthetic seed disabled.');
      return;
    }

    // Check if merchants already exist
    const countRow = db.prepare('SELECT COUNT(*) as count FROM merchants').get() as { count: number };
    if (countRow.count > 0) {
      return; // Already seeded
    }

    console.log('[Database] Seeding initial staging Paytm merchant records into SQLite...');

    // Helper for password hash using standard PBKDF2
    function hashPassword(password: string, salt: string): string {
      return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
    }

    // 1. Merchants & Users
    const merchantsData = [
      {
        id: 'mer_sharma_kirana',
        business_name: 'Sharma General Store & Kirana',
        owner_name: 'Sunil Sharma',
        email: 'sunil.sharma@kirana.in',
        phone: '+91 98450 12890',
        business_category: 'Groceries & Kirana',
        gstin: '29ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        mid: 'PAYTM_MID_982143',
        terminal_id: 'POS_TID_882910',
        primary_language: 'en',
        bank_name: 'State Bank of India',
        bank_account_number: '•••• •••• 4092',
        bank_ifsc: 'SBIN0001824',
        bank_account_holder: 'Sharma General Store',
        soundbox_serial: 'SBX-4G-99214',
        soundbox_model: 'Paytm Soundbox 4G Pro (Voice + Display)',
        soundbox_battery: 94,
        soundbox_status: 'ONLINE',
        soundbox_volume: 8,
        username: 'sunil_sharma',
        password: 'Password123!',
      },
      {
        id: 'mer_priya_textiles',
        business_name: 'Priya Sarees & Fashion Store',
        owner_name: 'Priya Sundaram',
        email: 'priya@priyatextiles.com',
        phone: '+91 94441 55678',
        business_category: 'Apparel & Textiles',
        gstin: '33AABCP9876Q1Z3',
        pan: 'AABCP9876Q',
        mid: 'PAYTM_MID_774129',
        terminal_id: 'POS_TID_551980',
        primary_language: 'en',
        bank_name: 'HDFC Bank',
        bank_account_number: '•••• •••• 8104',
        bank_ifsc: 'HDFC0000240',
        bank_account_holder: 'Priya Sarees',
        soundbox_serial: 'SBX-4G-88120',
        soundbox_model: 'Paytm Soundbox 4G Pro (Voice + Display)',
        soundbox_battery: 88,
        soundbox_status: 'ONLINE',
        soundbox_volume: 7,
        username: 'priya_textiles',
        password: 'Password123!',
      },
      {
        id: 'mer_annapurna_tiffin',
        business_name: 'Annapurna South Indian Tiffin Room',
        owner_name: 'K. Venkatesh Rao',
        email: 'venkatesh@annapurnatiffin.com',
        phone: '+91 98860 33412',
        business_category: 'Food & Beverage',
        gstin: '29AAGFA5512B1Z8',
        pan: 'AAGFA5512B',
        mid: 'PAYTM_MID_331902',
        terminal_id: 'POS_TID_119043',
        primary_language: 'en',
        bank_name: 'Canara Bank',
        bank_account_number: '•••• •••• 1290',
        bank_ifsc: 'CNRB0000492',
        bank_account_holder: 'Annapurna Tiffin Room',
        soundbox_serial: 'SBX-4G-33419',
        soundbox_model: 'Paytm Pocket Soundbox',
        soundbox_battery: 98,
        soundbox_status: 'ONLINE',
        soundbox_volume: 9,
        username: 'venkatesh_rao',
        password: 'Password123!',
      },
    ];

    const insertMerchant = db.prepare(`
      INSERT INTO merchants (id, business_name, owner_name, email, phone, business_category, gstin, pan, mid, terminal_id, primary_language, bank_name, bank_account_number, bank_ifsc, bank_account_holder, soundbox_serial, soundbox_model, soundbox_battery, soundbox_status, soundbox_volume, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertUser = db.prepare(`
      INSERT INTO users (id, merchant_id, username, password_hash, salt, full_name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDevice = db.prepare(`
      INSERT INTO devices (id, merchant_id, device_type, serial_number, model, battery_level, status, volume, language, last_ping_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    for (const m of merchantsData) {
      insertMerchant.run(
        m.id,
        m.business_name,
        m.owner_name,
        m.email,
        m.phone,
        m.business_category,
        m.gstin,
        m.pan,
        m.mid,
        m.terminal_id,
        m.primary_language,
        m.bank_name,
        m.bank_account_number,
        m.bank_ifsc,
        m.bank_account_holder,
        m.soundbox_serial,
        m.soundbox_model,
        m.soundbox_battery,
        m.soundbox_status,
        m.soundbox_volume,
        now,
        now
      );

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(m.password, salt);
      insertUser.run(
        `usr_${m.id}`,
        m.id,
        m.username,
        hash,
        salt,
        m.owner_name,
        'OWNER',
        now
      );

      insertDevice.run(
        `dev_${m.soundbox_serial}`,
        m.id,
        'SOUNDBOX',
        m.soundbox_serial,
        m.soundbox_model,
        m.soundbox_battery,
        m.soundbox_status,
        m.soundbox_volume,
        m.primary_language,
        now
      );
    }

    // 2. Realistic 30-Day Historical Transactions for Sunil Sharma
    const insertTxn = db.prepare(`
      INSERT INTO transactions (id, merchant_id, order_id, amount, fee_mdr, gst_on_mdr, net_settlement_amount, payment_method, customer_name, customer_vpa, timestamp, status, settlement_batch_id, is_flagged_for_discrepancy, discrepancy_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const customers = [
      { name: 'Ramesh Patel', vpa: 'ramesh.patel@okhdfcbank' },
      { name: 'Sanjay Verma', vpa: 'sanjay.verma@paytm' },
      { name: 'Anita Roy', vpa: 'anita.roy@okaxis' },
      { name: 'Vikas Gupta', vpa: 'vikas.g@icici' },
      { name: 'Pooja Nair', vpa: 'pooja.nair@sbi' },
      { name: 'Kavita Singh', vpa: 'kavita.s@oksbi' },
      { name: 'Mohammed Irfan', vpa: 'irfan.m@paytm' },
      { name: 'Deepak Joshi', vpa: 'deepak.j@ybl' },
      { name: 'Sunita Mehra', vpa: 'sunita.mehra@okhdfcbank' },
      { name: 'Rajesh Kothari', vpa: 'rajesh.k@okaxis' },
    ];

    // Seed Today's Transactions (2026-10-31)
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const todayHours = ['08:15', '09:20', '10:05', '11:30', '12:45', '14:10', '15:25', '16:40', '17:15', '18:00', '18:45', '19:10', '19:40', '20:15', '20:50', '21:10'];

    const todayAmounts = [180, 450, 85, 1200, 320, 650, 90, 240, 1500, 420, 880, 2100, 350, 720, 190, 610];

    for (let i = 0; i < todayHours.length; i++) {
      const amt = todayAmounts[i];
      const isCard = i % 5 === 0;
      const paymentMethod = isCard ? 'RUPAY_CARD' : 'SOUNDBOX_UPI';
      const mdr = isCard ? Math.round(amt * 0.01) : 0;
      const gst = isCard ? Math.round(amt * 0.0018) : 0;
      const net = amt - mdr - gst;
      const cust = customers[i % customers.length];

      insertTxn.run(
        `TXN-TODAY-${1000 + i}`,
        'mer_sharma_kirana',
        `ORD-${Date.now().toString().slice(-4)}-${i + 1}`,
        amt,
        mdr,
        gst,
        net,
        paymentMethod,
        cust.name,
        cust.vpa,
        `${todayPrefix}T${todayHours[i]}:00.000Z`,
        'PENDING_SETTLEMENT',
        'SETTLE-TODAY-01',
        0,
        null
      );
    }

    // Seed Yesterday's Transactions with a settled batch and one variance
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const yAmounts = [350, 680, 110, 2400, 520, 890, 150, 310, 1850, 740, 1150, 3200, 480, 920, 260, 850];

    for (let i = 0; i < yAmounts.length; i++) {
      const amt = yAmounts[i];
      const isCard = i % 4 === 0;
      const paymentMethod = isCard ? 'VISA_MASTERCARD' : 'SOUNDBOX_UPI';
      const mdr = isCard ? Math.round(amt * 0.012) : 0;
      const gst = isCard ? Math.round(amt * 0.00216) : 0;
      const net = amt - mdr - gst;
      const cust = customers[(i + 3) % customers.length];
      const isDiscrepant = i === 11; // Flagged dispute

      insertTxn.run(
        `TXN-YEST-${1000 + i}`,
        'mer_sharma_kirana',
        `ORD-YEST-${i + 1}`,
        amt,
        mdr,
        gst,
        net,
        paymentMethod,
        cust.name,
        cust.vpa,
        `${yesterday}T1${i < 10 ? '0' + i : i}:30:00.000Z`,
        isDiscrepant ? 'DISPUTED' : 'SETTLED',
        'SETTLE-YEST-01',
        isDiscrepant ? 1 : 0,
        isDiscrepant ? 'Customer bank charged back citing duplicate QR scan.' : null
      );
    }

    // 3. Settlement Batches
    const insertBatch = db.prepare(`
      INSERT INTO settlement_batches (id, merchant_id, settlement_date, gross_amount, total_mdr_fee, total_gst, net_disbursed_amount, bank_account, utr_number, status, transaction_count, expected_disbursement_time, actual_disbursement_time, variance_amount, variance_note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // In-transit batch for today
    insertBatch.run(
      'SETTLE-TODAY-01',
      'mer_sharma_kirana',
      todayPrefix,
      10475.00,
      18.00,
      3.24,
      10453.76,
      'SBIN0001824 - •••• 4092',
      'UTR-PENDING-NEFT',
      'IN_TRANSIT',
      16,
      `${todayPrefix}T23:30:00.000Z`,
      null,
      0.00,
      'Daily automated midnight settlement batch. Processing through RBI NEFT cycle.'
    );

    // Settled batch with partial variance for yesterday
    insertBatch.run(
      'SETTLE-YEST-01',
      'mer_sharma_kirana',
      yesterday,
      15060.00,
      64.00,
      11.52,
      11784.48,
      'SBIN0001824 - •••• 4092',
      'SBIN2026103009218412',
      'PARTIAL',
      16,
      `${yesterday}T23:30:00.000Z`,
      `${yesterday}T23:32:15.000Z`,
      3200.00,
      'Discrepancy: ₹3,200 held in escrow due to customer chargeback dispute on Order ORD-YEST-12.'
    );

    // 4. Customer Khata Records
    const insertKhata = db.prepare(`
      INSERT INTO customer_records (id, merchant_id, customer_name, customer_phone, total_credit_given, total_repaid, outstanding_balance, last_purchase_date, due_date, status, notes, last_reminder_sent_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const khataList = [
      {
        id: 'KHATA-001',
        name: 'Ravi Verma (Tailor Master)',
        phone: '+91 98201 99120',
        given: 4500,
        repaid: 3700,
        balance: 800,
        lastDate: '2026-10-25',
        dueDate: '2026-11-05',
        status: 'CURRENT',
        notes: 'Monthly kirana staples credit. Always repays after billing clients.',
      },
      {
        id: 'KHATA-002',
        name: 'Suresh Kirana Wholesale / Supplier',
        phone: '+91 97110 44290',
        given: 12500,
        repaid: 9000,
        balance: 3500,
        lastDate: '2026-10-18',
        dueDate: '2026-10-25',
        status: 'OVERDUE',
        notes: 'Bulk purchase of refined oil & basmati rice. 6 days overdue past promise date.',
      },
      {
        id: 'KHATA-003',
        name: 'Meena Tai (Aanganwadi Worker)',
        phone: '+91 99302 11840',
        given: 2400,
        repaid: 1950,
        balance: 450,
        lastDate: '2026-10-27',
        dueDate: '2026-11-07',
        status: 'CURRENT',
        notes: 'Daily milk & ration provisions.',
      },
      {
        id: 'KHATA-004',
        name: 'Govind Builders / Site Worker',
        phone: '+91 98450 77123',
        given: 6800,
        repaid: 3000,
        balance: 3800,
        lastDate: '2026-09-30',
        dueDate: '2026-10-15',
        status: 'HIGH_RISK',
        notes: 'Worker shifted site. Overdue by 16 days. Multiple missed reminder calls.',
      },
      {
        id: 'KHATA-01',
        name: 'Ramesh Kumar (Gali No. 4)',
        phone: '+91 98112 34567',
        given: 12500,
        repaid: 9050,
        balance: 3450,
        lastDate: '2026-10-18',
        dueDate: '2026-10-25',
        status: 'OVERDUE',
        notes: 'Monthly grocery ration bill. Promised to clear by 25th after salary credit.',
      },
      {
        id: 'KHATA-02',
        name: 'Sunita Devi (Block B-12)',
        phone: '+91 99201 88722',
        given: 6400,
        repaid: 4550,
        balance: 1850,
        lastDate: '2026-10-22',
        dueDate: '2026-10-29',
        status: 'OVERDUE',
        notes: 'Dairy & dry grocery supplies. Regular customer for 4 years.',
      },
      {
        id: 'KHATA-03',
        name: 'Ananya Patel (Apt 402)',
        phone: '+91 97410 55219',
        given: 4200,
        repaid: 3280,
        balance: 920,
        lastDate: '2026-10-28',
        dueDate: '2026-11-05',
        status: 'CURRENT',
        notes: 'Weekly pantry replenishment.',
      },
      {
        id: 'KHATA-04',
        name: 'Rajesh Verma (Sweet Shop Owner)',
        phone: '+91 98200 11984',
        given: 22000,
        repaid: 16200,
        balance: 5800,
        lastDate: '2026-09-25',
        dueDate: '2026-10-10',
        status: 'OVERDUE',
        notes: 'Bulk flour and sugar purchases. 20 days overdue. Requires polite in-person or WhatsApp reminder.',
      },
    ];

    for (const k of khataList) {
      insertKhata.run(
        k.id,
        'mer_sharma_kirana',
        k.name,
        k.phone,
        k.given,
        k.repaid,
        k.balance,
        k.lastDate,
        k.dueDate,
        k.status,
        k.notes,
        null,
        now,
        now
      );
    }

    // 5. Loan Repayment Schedule (Suryoday Small Finance Bank via Paytm Lending)
    const insertLoan = db.prepare(`
      INSERT INTO repayment_schedules (id, merchant_id, loan_id, lender_name, daily_emi_amount, tenure_months, remaining_installments, total_principal, remaining_balance, auto_deduct_from_settlement, next_deduction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertLoan.run(
      'LOAN-SCH-01',
      'mer_sharma_kirana',
      'LN-PAYTM-SSFB-9921',
      'Suryoday Small Finance Bank (Paytm Business Loan Partner)',
      350.00,
      12,
      142,
      120000.00,
      49700.00,
      1,
      todayPrefix
    );

    // 6. Growth Insights & Recommendations
    const insertGrowth = db.prepare(`
      INSERT INTO growth_insights (id, merchant_id, title, category, summary, evidence, suggested_action, projected_lift, assumptions, confidence_score, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertGrowth.run(
      'GRO-001',
      'mer_sharma_kirana',
      'Evening Peak Hour Rush Optimization',
      'PEAK_HOURS',
      '68% of your store footfall and payment volume occurs between 6:30 PM and 9:15 PM.',
      'Analyzed 480 transactions over 4 consecutive weeks. Average 34 transactions/hour in the evening vs 6 transactions/hour between 2:00 PM and 4:30 PM.',
      'Keep dual QR stands on the front counter and pre-package high-frequency ration combos (Wheat Flour + Dal + Sugar) to decrease checkout queue time.',
      'Expected 12% to 15% increase in evening customer turnover capacity (~₹1,800 - ₹2,400 daily additional sales).',
      'Assumes merchant maintains stock readiness and queue clearance time drops by 45 seconds per shopper.',
      92,
      'NEW',
      now
    );

    insertGrowth.run(
      'GRO-002',
      'mer_sharma_kirana',
      'Afternoon Sales Slump Promotion',
      'PROMOTIONAL_OFFER',
      'Daily 2:00 PM - 5:00 PM sales average only ₹620/day over the past month.',
      'Store footfall drops by 78% compared to morning and evening baselines.',
      'Launch a 5% discount flyer on spices and dry fruits broadcasted to 85 loyal repeat customers for afternoon shopping.',
      'Estimated lift of ₹800 - ₹1,200 incremental daily afternoon revenue.',
      'Assumes at least 8% of broadcast recipients redeem during off-peak hours.',
      84,
      'NEW',
      now
    );

    // 7. Subscriptions (Paytm Monetization Module 1)
    const insertSub = db.prepare(`
      INSERT INTO subscriptions (id, merchant_id, plan_tier, monthly_fee, billing_cycle, active_since, status, features_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSub.run(
      'SUB-001',
      'mer_sharma_kirana',
      'PREMIUM',
      125.00,
      'MONTHLY',
      '2023-04-15',
      'ACTIVE',
      JSON.stringify([
        'Paytm 4G Soundbox Pro Voice Box',
        'Daily WhatsApp Briefing Audio Report',
        'Customer Khata Automated SMS Reminders',
        'Settlement Variance Dispute Assistance',
        'Sarvam Multilingual Voice Agent (All 5 Languages)',
      ])
    );

    // 8. Lending Partners & Loan Products (Paytm Monetization Module 2)
    const insertPartner = db.prepare(`
      INSERT INTO lending_partners (id, partner_name, rbi_registration_number, logo_url, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertPartner.run('LP-01', 'Suryoday Small Finance Bank', 'RBI-SFB-2017-04', 'https://assetscdn1.paytm.com/images/catalog/view/suryoday.png', 'ACTIVE');
    insertPartner.run('LP-02', 'Tata Capital Financial Services', 'RBI-NBFC-ND-SI-1991', 'https://assetscdn1.paytm.com/images/catalog/view/tatacapital.png', 'ACTIVE');
    insertPartner.run('LP-03', 'DMI Finance Private Limited', 'RBI-NBFC-ND-2008', 'https://assetscdn1.paytm.com/images/catalog/view/dmifinance.png', 'ACTIVE');

    const insertProduct = db.prepare(`
      INSERT INTO loan_products (id, partner_id, product_name, min_amount, max_amount, interest_rate_range, tenure_options, repayment_frequency, eligibility_criteria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run(
      'LPROD-01',
      'LP-01',
      'Paytm Merchant Daily Repayment Loan',
      25000.00,
      500000.00,
      '1.10% - 1.45% per month flat',
      '3, 6, 9, 12 months',
      'DAILY_SETTLEMENT_DEDUCTION',
      'Active Paytm Soundbox/QR for > 90 days with average monthly collections > ₹30,000.'
    );

    insertProduct.run(
      'LPROD-02',
      'LP-02',
      'Retail Working Capital Booster',
      100000.00,
      1500000.00,
      '14.5% - 18.0% per annum reducing',
      '12 to 24 months',
      'MONTHLY_NACH_ECS',
      'Valid GSTIN registration, minimum 2 years business vintage, and good credit score.'
    );

    // 9. Merchant Actions
    const insertAction = db.prepare(`
      INSERT INTO merchant_actions (id, merchant_id, action_type, title, description, status, requires_approval, created_by, payload_json, result_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAction.run(
      'ACT-001',
      'mer_sharma_kirana',
      'SETTLEMENT_INVESTIGATION',
      'Investigate ₹3,200 Variance on Batch SETTLE-YEST-01',
      'Dispute held escrow of ₹3,200 on customer order ORD-YEST-12. Submit proof of delivery to Paytm Merchant Support.',
      'PENDING_APPROVAL',
      1,
      'SYSTEM_ALERT',
      JSON.stringify({ batchId: 'SETTLE-YEST-01', orderId: 'ORD-YEST-12', amount: 3200, utr: 'SBIN2026103009218412' }),
      null,
      now
    );

    insertAction.run(
      'ACT-002',
      'mer_sharma_kirana',
      'CUSTOMER_CREDIT_REMINDER',
      'Send WhatsApp Overdue Reminder to Suresh Kirana',
      'Send polite reminder for ₹3,500 overdue balance with direct Paytm UPI payment link.',
      'PENDING_APPROVAL',
      1,
      'VOICE_AGENT',
      JSON.stringify({ customerId: 'KHATA-002', customerName: 'Suresh Kirana', amount: 3500, phone: '+91 97110 44290' }),
      null,
      now
    );

    // 10. Audit Logs
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, merchant_id, actor, role, event_type, details, timestamp, ip_address, immutable_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAudit.run(
      'AUD-001',
      'mer_sharma_kirana',
      'Sunil Sharma',
      'OWNER',
      'MERCHANT_LOGIN',
      'Merchant signed in securely to Merchant Web Portal via 2FA.',
      now,
      '127.0.0.1',
      crypto.createHash('sha256').update(`AUD-001-mer_sharma_kirana-${now}`).digest('hex')
    );

    console.log('[Database] Seeding completed successfully.');
  }
}
