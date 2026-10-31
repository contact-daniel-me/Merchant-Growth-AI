import { AppDatabase } from '../../db/database.ts';
import { DataSanitizer } from '../dataSanitizer.ts';

export interface PaymentLinkResult {
  linkId: string;
  orderId: string;
  merchantId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  purpose: string;
  shortUrl: string;
  qrPayload: string;
  status: 'CREATED' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
}

export interface AutopayMandateResult {
  mandateId: string;
  mandateUrn: string;
  merchantId: string;
  customerId?: string;
  maxAmount: number;
  frequency: 'WEEKLY' | 'MONTHLY' | 'AS_PRESENTED';
  status: 'PENDING_AUTH' | 'ACTIVE' | 'PAUSED' | 'REVOKED';
  authUrl: string;
  validUntil: string;
  disclaimer: string;
}

export class PaymentLinkService {
  /**
   * Generates an authorized payment link for Khata store credit recovery
   */
  public static createPaymentLink(params: {
    merchantId: string;
    customerId?: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    purpose?: string;
    expiryDays?: number;
  }): PaymentLinkResult {
    const { merchantId, customerId, customerName, customerPhone, amount, purpose = 'Store Ledger Khata Settlement', expiryDays = 7 } = params;
    const db = AppDatabase.getDB();

    const sanitizedAmt = DataSanitizer.sanitizeAmount(amount);
    const cleanPhone = DataSanitizer.sanitizePhone(customerPhone);
    const cleanName = DataSanitizer.cleanText(customerName);

    const linkId = `PLINK-${Date.now().toString().slice(-6)}`;
    const orderId = `ORD-KHATA-${Date.now().toString().slice(-8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryDays * 86400000).toISOString();
    const nowIso = now.toISOString();

    const shortUrl = `https://merchant.growiota.in/pay/${orderId}`;
    const qrPayload = `upi://pay?pa=growiota.merchant@paytm&pn=GrowIOTA&am=${sanitizedAmt}&tr=${orderId}&cu=INR&tn=${encodeURIComponent(purpose)}`;

    // Verify customerId exists in customer_records to respect FK constraint
    let validCustomerId: string | null = null;
    if (customerId) {
      const cust = db.prepare('SELECT id FROM customer_records WHERE id = ?').get(customerId);
      if (cust) {
        validCustomerId = customerId;
      }
    }

    db.prepare(`
      INSERT INTO payment_links (id, merchant_id, customer_id, order_id, amount, purpose, short_url, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'CREATED', ?, ?)
    `).run(linkId, merchantId, validCustomerId, orderId, sanitizedAmt, purpose, shortUrl, expiresAt, nowIso);

    return {
      linkId,
      orderId,
      merchantId,
      amount: sanitizedAmt,
      customerName: cleanName,
      customerPhone: cleanPhone,
      purpose,
      shortUrl,
      qrPayload,
      status: 'CREATED',
      expiresAt,
      createdAt: nowIso,
    };
  }

  /**
   * Generates a UPI Autopay mandate intent requiring explicit payer authorization
   */
  public static createAutopayMandate(params: {
    merchantId: string;
    customerId?: string;
    maxAmount: number;
    frequency?: 'WEEKLY' | 'MONTHLY' | 'AS_PRESENTED';
  }): AutopayMandateResult {
    const { merchantId, customerId, maxAmount, frequency = 'AS_PRESENTED' } = params;
    const db = AppDatabase.getDB();

    const sanitizedMax = DataSanitizer.sanitizeAmount(maxAmount);
    const mandateId = `MAN-${Date.now().toString().slice(-6)}`;
    const mandateUrn = `URN:PAYTM:AUTOPAY:${Date.now().toString().slice(-10)}`;
    const nowIso = new Date().toISOString();
    const validUntil = new Date(Date.now() + 365 * 86400000).toISOString();

    // Verify customerId exists in customer_records to respect FK constraint
    let validCustomerId: string | null = null;
    if (customerId) {
      const cust = db.prepare('SELECT id FROM customer_records WHERE id = ?').get(customerId);
      if (cust) {
        validCustomerId = customerId;
      }
    }

    db.prepare(`
      INSERT INTO autopay_mandates (id, merchant_id, customer_id, mandate_urn, max_amount, frequency, status, valid_until, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING_AUTH', ?, ?)
    `).run(mandateId, merchantId, validCustomerId, mandateUrn, sanitizedMax, frequency, validUntil, nowIso);

    return {
      mandateId,
      mandateUrn,
      merchantId,
      customerId,
      maxAmount: sanitizedMax,
      frequency,
      status: 'PENDING_AUTH',
      authUrl: `https://merchant.growiota.in/mandate/auth/${mandateUrn}`,
      validUntil,
      disclaimer:
        'Customer must explicitly authenticate mandate registration in their UPI app with biometric or UPI PIN. Never request or store customer UPI PINs.',
    };
  }

  /**
   * Future Agentic Payment Architecture: Enforces security guardrails and disabled feature flag
   */
  public static evaluateAutonomousAgentPayment(merchantId: string, requestedAmount: number): {
    permitted: boolean;
    reason: string;
  } {
    // Feature flag: strictly disabled by default until regulatory NPCI agent framework notification
    const isFeatureEnabled = process.env.ENABLE_AUTONOMOUS_AGENT_PAYMENTS === 'true';
    if (!isFeatureEnabled) {
      return {
        permitted: false,
        reason:
          'Autonomous agent payments are disabled (ENABLE_AUTONOMOUS_AGENT_PAYMENTS=false). Regulatory NPCI agent framework has not formally commenced.',
      };
    }

    const db = AppDatabase.getDB();
    const perm = db.prepare('SELECT * FROM agent_payment_permissions WHERE merchant_id = ?').get(merchantId) as any;

    if (!perm || !perm.is_active) {
      return {
        permitted: false,
        reason: 'Merchant has not activated agent spending permissions.',
      };
    }

    if (requestedAmount > Number(perm.max_per_transaction)) {
      return {
        permitted: false,
        reason: `Requested ₹${requestedAmount} exceeds configured per-transaction limit of ₹${perm.max_per_transaction}.`,
      };
    }

    return {
      permitted: true,
      reason: 'Permitted under merchant configured spending boundaries.',
    };
  }
}
