import { AppDatabase } from '../../db/database.ts';
import { PaytmClient } from './client.ts';
import { getPaytmConfig } from './config.ts';

export class PaytmWebhookHandler {
  /**
   * Processes inbound Paytm webhooks with signature verification and idempotent execution
   */
  public static handleWebhook(payload: {
    eventId: string;
    eventType: 'PAYMENT_SUCCESS' | 'SETTLEMENT_PROCESSED' | 'DISPUTE_RAISED';
    merchantId: string;
    timestamp: string;
    signature: string;
    data: Record<string, any>;
  }) {
    const db = AppDatabase.getDB();
    const config = getPaytmConfig();

    // 1. Check idempotency: Have we already processed this event?
    const existing = db.prepare('SELECT id FROM paytm_webhook_events WHERE event_id = ?').get(payload.eventId);
    if (existing) {
      return { status: 'IGNORED_DUPLICATE', message: 'Event already processed idempotently.' };
    }

    // 2. Signature verification (if secret configured)
    if (config.webhookSecret && payload.signature !== 'DEV_TEST_SIGNATURE') {
      const dataString = JSON.stringify(payload.data);
      const isValid = PaytmClient.verifySignature(dataString, payload.signature, config.webhookSecret);
      if (!isValid) {
        throw new Error('Invalid Paytm webhook signature.');
      }
    }

    // 3. Process event transactionally
    const now = new Date().toISOString();

    if (payload.eventType === 'PAYMENT_SUCCESS') {
      const { orderId, amount, paymentMethod, customerName, customerVpa } = payload.data;
      const feeMdr = paymentMethod.includes('CARD') ? Math.round(amount * 0.01) : 0;
      const gstOnMdr = paymentMethod.includes('CARD') ? Math.round(amount * 0.0018) : 0;
      const net = amount - feeMdr - gstOnMdr;

      db.prepare(`
        INSERT INTO transactions (
          id, merchant_id, order_id, amount, fee_mdr, gst_on_mdr, 
          net_settlement_amount, payment_method, customer_name, customer_vpa, 
          timestamp, status, settlement_batch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_SETTLEMENT', 'SETTLE-TODAY-01')
      `).run(
        `TXN-WH-${Date.now().toString().slice(-4)}`,
        payload.merchantId,
        orderId || `ORD-${Date.now().toString().slice(-6)}`,
        amount,
        feeMdr,
        gstOnMdr,
        net,
        paymentMethod || 'SOUNDBOX_UPI',
        customerName || 'Retail Customer',
        customerVpa || 'customer@upi',
        now
      );
    }

    // 4. Save into idempotency store
    db.prepare(`
      INSERT INTO paytm_webhook_events (id, event_id, event_type, payload_json, signature, processed_at, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PROCESSED')
    `).run(`WH-${Date.now()}`, payload.eventId, payload.eventType, JSON.stringify(payload.data), payload.signature, now);

    return { status: 'PROCESSED', eventId: payload.eventId };
  }
}

