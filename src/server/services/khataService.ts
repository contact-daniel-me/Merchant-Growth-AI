import { AppDatabase } from '../db/database.ts';

export interface KhataOverview {
  merchantId: string;
  totalCustomersWithDues: number;
  totalOutstandingDues: number;
  totalOverdueAmount: number;
  overdueCustomersCount: number;
  highRiskAmount: number;
  customers: Array<{
    id: string;
    customerName: string;
    customerPhone: string;
    totalCreditGiven: number;
    totalRepaid: number;
    outstandingBalance: number;
    lastPurchaseDate: string | null;
    dueDate: string | null;
    daysOverdue: number;
    status: 'CURRENT' | 'OVERDUE' | 'HIGH_RISK';
    notes: string | null;
    lastReminderSentDate: string | null;
  }>;
}

export class KhataService {
  /**
   * Retrieves complete customer credit ledger with calculated overdue days and status
   */
  public static getKhataOverview(merchantId: string): KhataOverview {
    const db = AppDatabase.getDB();
    const rows = db.prepare(`
      SELECT * FROM customer_records 
      WHERE merchant_id = ? 
      ORDER BY 
        CASE status 
          WHEN 'HIGH_RISK' THEN 1 
          WHEN 'OVERDUE' THEN 2 
          ELSE 3 
        END, 
        outstanding_balance DESC
    `).all(merchantId) as any[];

    const today = new Date();
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let highRiskTotal = 0;

    const customers = rows.map((r) => {
      const balance = Number(r.outstanding_balance);
      totalOutstanding += balance;

      let daysOverdue = 0;
      let computedStatus: 'CURRENT' | 'OVERDUE' | 'HIGH_RISK' = r.status;

      if (r.due_date && balance > 0) {
        const dueDate = new Date(r.due_date);
        const diffMs = today.getTime() - dueDate.getTime();
        daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        if (daysOverdue > 14) {
          computedStatus = 'HIGH_RISK';
        } else if (daysOverdue > 0) {
          computedStatus = 'OVERDUE';
        } else {
          computedStatus = 'CURRENT';
        }
      }

      if (computedStatus === 'OVERDUE' || computedStatus === 'HIGH_RISK') {
        totalOverdue += balance;
        overdueCount += 1;
      }
      if (computedStatus === 'HIGH_RISK') {
        highRiskTotal += balance;
      }

      return {
        id: r.id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        totalCreditGiven: Number(r.total_credit_given),
        totalRepaid: Number(r.total_repaid),
        outstandingBalance: balance,
        lastPurchaseDate: r.last_purchase_date,
        dueDate: r.due_date,
        daysOverdue,
        status: computedStatus,
        notes: r.notes,
        lastReminderSentDate: r.last_reminder_sent_date,
      };
    });

    return {
      merchantId,
      totalCustomersWithDues: customers.length,
      totalOutstandingDues: Math.round(totalOutstanding * 100) / 100,
      totalOverdueAmount: Math.round(totalOverdue * 100) / 100,
      overdueCustomersCount: overdueCount,
      highRiskAmount: Math.round(highRiskTotal * 100) / 100,
      customers,
    };
  }

  /**
   * Adds a new customer credit entry (Udhar)
   */
  public static addCreditRecord(merchantId: string, payload: {
    customerName: string;
    customerPhone: string;
    amount: number;
    dueDate?: string;
    notes?: string;
  }) {
    const db = AppDatabase.getDB();
    const id = `KHATA-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const dueDate = payload.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO customer_records (
        id, merchant_id, customer_name, customer_phone, 
        total_credit_given, total_repaid, outstanding_balance, 
        last_purchase_date, due_date, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      merchantId,
      payload.customerName,
      payload.customerPhone,
      payload.amount,
      0.00,
      payload.amount,
      now.slice(0, 10),
      dueDate,
      'CURRENT',
      payload.notes || 'Store credit recorded',
      now,
      now
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, merchant_id, actor, role, event_type, details, timestamp, ip_address, immutable_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `AUD-${Date.now()}`,
      merchantId,
      'Merchant Operator',
      'OWNER',
      'KHATA_ENTRY_CREATED',
      `Customer credit recorded: ₹${payload.amount} for ${payload.customerName}`,
      now,
      '127.0.0.1',
      id
    );

    return this.getKhataOverview(merchantId);
  }

  /**
   * Records a repayment from a customer
   */
  public static recordRepayment(merchantId: string, customerId: string, amount: number, paymentMode = 'CASH', note = '') {
    const db = AppDatabase.getDB();
    const customer = db.prepare(`
      SELECT * FROM customer_records WHERE id = ? AND merchant_id = ?
    `).get(customerId, merchantId) as any;

    if (!customer) throw new Error('Customer credit record not found.');

    const newRepaid = Number(customer.total_repaid) + amount;
    const newBalance = Math.max(0, Number(customer.outstanding_balance) - amount);
    const newStatus = newBalance === 0 ? 'CURRENT' : customer.status;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE customer_records 
      SET total_repaid = ?, outstanding_balance = ?, status = ?, updated_at = ?
      WHERE id = ? AND merchant_id = ?
    `).run(newRepaid, newBalance, newStatus, now, customerId, merchantId);

    db.prepare(`
      INSERT INTO customer_payments (id, merchant_id, customer_id, amount, payment_mode, receipt_note, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `CPAY-${Date.now()}`,
      merchantId,
      customerId,
      amount,
      paymentMode,
      note || `Repayment of ₹${amount} received`,
      now
    );

    return this.getKhataOverview(merchantId);
  }

  /**
   * Prepares a draft reminder for merchant approval
   * Never automatically sends without merchant authorization.
   */
  public static prepareReminderAction(merchantId: string, customerId: string) {
    const db = AppDatabase.getDB();
    const customer = db.prepare(`
      SELECT * FROM customer_records WHERE id = ? AND merchant_id = ?
    `).get(customerId, merchantId) as any;

    if (!customer) throw new Error('Customer not found.');

    const merchant = db.prepare(`SELECT business_name, owner_name FROM merchants WHERE id = ?`).get(merchantId) as any;
    const actionId = `ACT-REM-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();

    const reminderMessage = `Namaste ${customer.customer_name}, gentle reminder from ${merchant.business_name} that store credit of ₹${Number(customer.outstanding_balance).toLocaleString('en-IN')} was due on ${customer.due_date || 'this week'}. You can pay directly via Paytm UPI. Dhanyawad!`;

    db.prepare(`
      INSERT INTO merchant_actions (
        id, merchant_id, action_type, title, description, 
        status, requires_approval, created_by, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      actionId,
      merchantId,
      'CUSTOMER_CREDIT_REMINDER',
      `Payment Reminder: ${customer.customer_name} (₹${customer.outstanding_balance})`,
      reminderMessage,
      'PENDING_APPROVAL',
      1,
      'VOICE_AGENT',
      JSON.stringify({
        customerId,
        customerName: customer.customer_name,
        customerPhone: customer.customer_phone,
        amount: Number(customer.outstanding_balance),
        message: reminderMessage,
        channel: 'WHATSAPP_SMS',
      }),
      now
    );

    return {
      actionId,
      customerName: customer.customer_name,
      amount: Number(customer.outstanding_balance),
      draftMessage: reminderMessage,
      status: 'PENDING_APPROVAL',
    };
  }
}

