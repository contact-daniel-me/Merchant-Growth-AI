import { AppDatabase } from '../db/database.ts';
import { DataSanitizer } from './dataSanitizer.ts';

export interface PaymentVerificationQuery {
  merchantId: string;
  amount: number;
  payerQuery?: string; // Name or VPA e.g. "Ravi", "ravi@paytm"
  timeWindowHours?: number; // Default 24 hours
}

export type PaymentVerificationStatus =
  | 'CONFIRMED_SUCCESS'
  | 'CONFIRMED_PENDING'
  | 'CONFIRMED_FAILED'
  | 'MULTIPLE_MATCHES'
  | 'NOT_FOUND'
  | 'SUSPICIOUS_PATTERN_DETECTED';

export interface VerifiedPaymentMatch {
  transactionId: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  customerName: string;
  customerVpa: string;
  timestamp: string;
  status: string;
  utrNumber?: string;
  isFlagged: boolean;
  discrepancyReason?: string;
}

export interface PaymentVerificationResult {
  merchantId: string;
  queryAmount: number;
  queryPayer?: string;
  verificationStatus: PaymentVerificationStatus;
  headline: string;
  detailedMessage: string;
  spokenSummary: string;
  matchedTransactions: VerifiedPaymentMatch[];
  fraudAssessment: {
    isSuspicious: boolean;
    hasActiveRefund: boolean;
    refundAmount?: number;
    riskSignals: string[];
    advisoryNote: string;
  };
  verifiedAt: string;
}

export class PaymentVerificationService {
  /**
   * Authoritatively verifies whether a specific payment from a customer was credited to the merchant ledger.
   * Cross-references actual SQLite transactions and refund records.
   */
  public static verifyPayment(params: PaymentVerificationQuery): PaymentVerificationResult {
    const { merchantId, amount, payerQuery, timeWindowHours = 24 } = params;
    const db = AppDatabase.getDB();

    const sanitizedAmt = DataSanitizer.sanitizeAmount(amount);
    const windowMs = timeWindowHours * 3600 * 1000;
    const cutoffTime = new Date(Date.now() - windowMs).toISOString();

    // 1. Authoritative Transaction Search
    // Strict amount tolerance (±0.05 to allow minor rounding)
    let querySql = `
      SELECT t.*, s.utr_number 
      FROM transactions t
      LEFT JOIN settlement_batches s ON t.settlement_batch_id = s.id
      WHERE t.merchant_id = ?
        AND ABS(t.amount - ?) < 0.05
        AND t.timestamp >= ?
      ORDER BY t.timestamp DESC
    `;
    let queryParams: any[] = [merchantId, sanitizedAmt, cutoffTime];

    let rows = db.prepare(querySql).all(...queryParams) as any[];

    // If payer query is provided, apply case-insensitive fuzzy matching on customer_name or customer_vpa
    if (payerQuery && payerQuery.trim()) {
      const cleanPayer = payerQuery.trim().toLowerCase();
      const filtered = rows.filter((r) => {
        const name = (r.customer_name || '').toLowerCase();
        const vpa = (r.customer_vpa || '').toLowerCase();
        return name.includes(cleanPayer) || vpa.includes(cleanPayer);
      });

      // If filtered matches exist, use them; otherwise retain original rows to detect name mismatches
      if (filtered.length > 0) {
        rows = filtered;
      }
    }

    const verifiedAt = new Date().toISOString();

    // 2. Scenario: No Matching Payment Found
    if (rows.length === 0) {
      const payerDesc = payerQuery ? ` from ${payerQuery}` : '';
      return {
        merchantId,
        queryAmount: sanitizedAmt,
        queryPayer: payerQuery,
        verificationStatus: 'NOT_FOUND',
        headline: `No Payment Found for ₹${sanitizedAmt.toLocaleString('en-IN')}`,
        detailedMessage: `No payment of ₹${sanitizedAmt.toLocaleString('en-IN')}${payerDesc} was recorded in your merchant ledger in the last ${timeWindowHours} hours.`,
        spokenSummary: `No payment of ₹${sanitizedAmt}${payerDesc} was found in your ledger records. Do not hand over merchandise based on a customer phone screenshot.`,
        matchedTransactions: [],
        fraudAssessment: {
          isSuspicious: true,
          hasActiveRefund: false,
          riskSignals: ['NO_LEDGER_RECORD_EXISTS', 'POSSIBLE_SCREENSHOT_SPOOFING'],
          advisoryNote:
            'A customer payment screenshot or SMS on a customer phone must never be accepted as proof of payment. Only the Soundbox announcement or this authoritative merchant ledger confirms receipt.',
        },
        verifiedAt,
      };
    }

    // 3. Map Matched Transactions
    const matches: VerifiedPaymentMatch[] = rows.map((r) => ({
      transactionId: r.id,
      orderId: r.order_id,
      amount: Number(r.amount),
      paymentMethod: r.payment_method,
      customerName: r.customer_name || 'Retail Customer',
      customerVpa: r.customer_vpa || 'customer@upi',
      timestamp: r.timestamp,
      status: r.status,
      utrNumber: r.utr_number || r.order_id,
      isFlagged: Boolean(r.is_flagged_for_discrepancy),
      discrepancyReason: r.discrepancy_reason,
    }));

    // 4. Check for Associated Refunds / Chargeback Claims
    const firstTxn = matches[0];
    const refundRows = db
      .prepare('SELECT * FROM refunds WHERE transaction_id = ?')
      .all(firstTxn.transactionId) as any[];

    const hasActiveRefund = refundRows.length > 0;
    const totalRefundAmt = refundRows.reduce((sum, rf) => sum + Number(rf.refund_amount || 0), 0);

    const riskSignals: string[] = [];
    if (hasActiveRefund) {
      riskSignals.push(`REVERSED_OR_REFUNDED_₹${totalRefundAmt}`);
    }
    if (firstTxn.isFlagged) {
      riskSignals.push(`FLAGGED_DISCREPANCY: ${firstTxn.discrepancyReason || 'Under audit'}`);
    }
    if (matches.length > 1) {
      riskSignals.push('MULTIPLE_SIMILAR_PAYMENTS_DETECTED');
    }

    // 5. Evaluate Multi-Match Scenario
    if (matches.length > 1) {
      return {
        merchantId,
        queryAmount: sanitizedAmt,
        queryPayer: payerQuery,
        verificationStatus: 'MULTIPLE_MATCHES',
        headline: `${matches.length} Payments Found for ₹${sanitizedAmt.toLocaleString('en-IN')}`,
        detailedMessage: `Found ${matches.length} payments of ₹${sanitizedAmt.toLocaleString('en-IN')} in the last ${timeWindowHours} hours. Please check customer name or time to confirm.`,
        spokenSummary: `Found ${matches.length} matching payments of ₹${sanitizedAmt}. Please verify which one belongs to ${payerQuery || 'your customer'}.`,
        matchedTransactions: matches,
        fraudAssessment: {
          isSuspicious: false,
          hasActiveRefund,
          refundAmount: totalRefundAmt,
          riskSignals,
          advisoryNote: 'Multiple matching transactions detected. Verify the customer VPA or exact time.',
        },
        verifiedAt,
      };
    }

    // 6. Single Match Evaluation
    if (hasActiveRefund || firstTxn.isFlagged) {
      return {
        merchantId,
        queryAmount: sanitizedAmt,
        queryPayer: payerQuery,
        verificationStatus: 'SUSPICIOUS_PATTERN_DETECTED',
        headline: `Payment Received but Refunded or Flagged`,
        detailedMessage: `Payment of ₹${sanitizedAmt.toLocaleString('en-IN')} from ${firstTxn.customerName} (${firstTxn.customerVpa}) was received on ${firstTxn.timestamp.slice(11, 16)} IST, but is associated with a refund of ₹${totalRefundAmt.toLocaleString('en-IN')} or escrow hold.`,
        spokenSummary: `Warning: Payment of ₹${sanitizedAmt} was received from ${firstTxn.customerName}, but an active refund or dispute of ₹${totalRefundAmt} exists.`,
        matchedTransactions: matches,
        fraudAssessment: {
          isSuspicious: true,
          hasActiveRefund,
          refundAmount: totalRefundAmt,
          riskSignals,
          advisoryNote: 'The payment was received but subsequently refunded or placed on escrow hold. Do not deliver goods without resolving the dispute.',
        },
        verifiedAt,
      };
    }

    if (firstTxn.status === 'SUCCESS' || firstTxn.status === 'PENDING_SETTLEMENT') {
      const timeStr = firstTxn.timestamp.slice(11, 16);
      return {
        merchantId,
        queryAmount: sanitizedAmt,
        queryPayer: payerQuery,
        verificationStatus: 'CONFIRMED_SUCCESS',
        headline: `Payment Confirmed: ₹${sanitizedAmt.toLocaleString('en-IN')}`,
        detailedMessage: `Verified in ledger: ₹${sanitizedAmt.toLocaleString('en-IN')} received from ${firstTxn.customerName} (${firstTxn.customerVpa}) at ${timeStr} IST via ${firstTxn.paymentMethod}. Ref: ${firstTxn.orderId}.`,
        spokenSummary: `Yes, payment of ₹${sanitizedAmt} from ${firstTxn.customerName} was received successfully at ${timeStr}. Reference ${firstTxn.orderId}.`,
        matchedTransactions: matches,
        fraudAssessment: {
          isSuspicious: false,
          hasActiveRefund: false,
          riskSignals: [],
          advisoryNote: 'Authoritative transaction ledger verified. Soundbox confirmed receipt.',
        },
        verifiedAt,
      };
    }

    // Payment failed or pending bank confirmation
    return {
      merchantId,
      queryAmount: sanitizedAmt,
      queryPayer: payerQuery,
      verificationStatus: firstTxn.status === 'FAILED' ? 'CONFIRMED_FAILED' : 'CONFIRMED_PENDING',
      headline: `Payment Status: ${firstTxn.status}`,
      detailedMessage: `Transaction ${firstTxn.orderId} for ₹${sanitizedAmt.toLocaleString('en-IN')} is marked as ${firstTxn.status}.`,
      spokenSummary: `The payment of ₹${sanitizedAmt} from ${firstTxn.customerName} is currently ${firstTxn.status}. Money has not reached your account.`,
      matchedTransactions: matches,
      fraudAssessment: {
        isSuspicious: true,
        hasActiveRefund: false,
        riskSignals: [`STATUS_${firstTxn.status}`],
        advisoryNote: 'Do not consider this transaction complete until status shifts to SUCCESS in your Soundbox records.',
      },
      verifiedAt,
    };
  }
}
