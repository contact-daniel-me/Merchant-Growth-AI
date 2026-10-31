import { AppDatabase } from '../../db/database.ts';

export interface FeePolicy {
  policyId: string;
  policyVersion: string;
  paymentInstrument: string;
  transactionType: string;
  minimumAmount: number;
  maximumAmount?: number | null;
  feeRate: number;
  feeCap?: number | null;
  flatFee: number;
  merchantCategory: string;
  sector: string;
  monthlyVolumeThreshold?: number | null;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  policySource: string;
  approvalStatus: 'DRAFT' | 'ACTIVE' | 'UPCOMING_ANNOUNCED' | 'ARCHIVED';
  configuredBy: string;
  verifiedAt: string;
}

export interface ClassifiedTransactionFee {
  transactionId: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  timestamp: string;
  isEligibleForFee: boolean;
  exemptionReason?: string;
  appliedPolicyId?: string;
  policyVersion?: string;
  feeRatePercent: number;
  feeAmount: number;
  isEstimateOnly: boolean;
  statusNote: string;
}

export interface MerchantFeeAssessment {
  merchantId: string;
  assessmentPeriod: string;
  merchantMonthlyVolume: number;
  isSmallMerchantExempt: boolean;
  activePoliciesAppliedCount: number;
  actualFeesDeducted: number; // What has actually been charged by bank/gateway
  projectedFeesUnder2026Framework: number; // Modeled impact under 2026 framework
  differenceAmount: number;
  estimatedAnnualCost: number;
  frameworkStatus: 'CURRENT_ZERO_UPI_MDR' | 'UPCOMING_2026_FRAMEWORK_ANNOUNCED';
  advisoryHeadline: string;
  policySummaryNote: string;
  classifiedTransactions: ClassifiedTransactionFee[];
  activePolicies: FeePolicy[];
  evaluatedAt: string;
}

export class MerchantFeeAdvisor {
  /**
   * Initializes default 2026 NPCI framework policies into SQLite if not already present
   */
  public static initDefaultPolicies() {
    const db = AppDatabase.getDB();
    const count = db.prepare('SELECT COUNT(*) as count FROM merchant_fee_policies').get() as { count: number };
    if (count.count > 0) return;

    const insert = db.prepare(`
      INSERT INTO merchant_fee_policies (
        policy_id, policy_version, payment_instrument, transaction_type, minimum_amount,
        maximum_amount, fee_rate, fee_cap, flat_fee, merchant_category, sector,
        monthly_volume_threshold, effective_from, effective_until, policy_source,
        approval_status, configured_by, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    // 1. Current Active Policy: UPI is 0% MDR for merchants
    insert.run(
      'POL-UPI-CURRENT-2024',
      'v1.0-CURRENT',
      'SOUNDBOX_UPI',
      'P2M',
      0.00,
      null,
      0.0000,
      0.00,
      0.00,
      'ALL',
      'GENERAL_RETAIL',
      null,
      '2024-01-01',
      '2026-11-15',
      'NPCI_GOVT_ZERO_MDR_MANDATE',
      'ACTIVE',
      'RBI_NPCI_DIRECTIVE',
      now
    );

    // 2. Current Debit Card Policy: 0.90%
    insert.run(
      'POL-DEBIT-CARD-2024',
      'v1.0-CARD',
      'DEBIT_CARD',
      'P2M',
      0.00,
      null,
      0.0090,
      null,
      0.00,
      'ALL',
      'GENERAL_RETAIL',
      null,
      '2024-01-01',
      null,
      'RBI_CARD_MDR_CIRCULAR',
      'ACTIVE',
      'PAYTM_ACQUIRING_BANK',
      now
    );

    // 3. Current Credit Card Policy: 1.00%
    insert.run(
      'POL-CREDIT-CARD-2024',
      'v1.0-CARD',
      'CREDIT_CARD',
      'P2M',
      0.00,
      null,
      0.0100,
      null,
      0.00,
      'ALL',
      'GENERAL_RETAIL',
      null,
      '2024-01-01',
      null,
      'RBI_CARD_MDR_CIRCULAR',
      'ACTIVE',
      'PAYTM_ACQUIRING_BANK',
      now
    );

    // 4. Announced 2026 Framework: Post-Diwali P2M > ₹2,000 at 0.40% (capped at ₹300)
    // Deferred post-Diwali commencement date to be formally notified
    insert.run(
      'POL-UPI-PROPOSED-2026',
      'v2.0-DRAFT-2026',
      'SOUNDBOX_UPI',
      'P2M',
      2000.01,
      null,
      0.0040,
      300.00,
      0.00,
      'ALL',
      'GENERAL_RETAIL',
      50000.00, // Small merchant exemption threshold: ₹50,000/mo
      '2026-11-15', // Expected commencement
      null,
      'NPCI_2026_REVISED_INTERCHANGE_FRAMEWORK',
      'UPCOMING_ANNOUNCED',
      'SYSTEM_POLICY_ENGINE',
      now
    );
  }

  /**
   * Evaluates all merchant transactions against active and upcoming fee policies
   */
  public static evaluateMerchantFees(merchantId: string): MerchantFeeAssessment {
    this.initDefaultPolicies();
    const db = AppDatabase.getDB();

    // 1. Fetch policies
    const policies = db.prepare('SELECT * FROM merchant_fee_policies ORDER BY effective_from DESC').all() as any[];
    const mappedPolicies: FeePolicy[] = policies.map((p) => ({
      policyId: p.policy_id,
      policyVersion: p.policy_version,
      paymentInstrument: p.payment_instrument,
      transactionType: p.transaction_type,
      minimumAmount: Number(p.minimum_amount),
      maximumAmount: p.maximum_amount ? Number(p.maximum_amount) : null,
      feeRate: Number(p.fee_rate),
      feeCap: p.fee_cap ? Number(p.fee_cap) : null,
      flatFee: Number(p.flat_fee),
      merchantCategory: p.merchant_category,
      sector: p.sector,
      monthlyVolumeThreshold: p.monthly_volume_threshold ? Number(p.monthly_volume_threshold) : null,
      effectiveFrom: p.effective_from,
      effectiveUntil: p.effective_until,
      policySource: p.policy_source,
      approvalStatus: p.approval_status,
      configuredBy: p.configured_by,
      verifiedAt: p.verified_at,
    }));

    // 2. Fetch merchant transactions (30-day window)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const txns = db.prepare(`
      SELECT * FROM transactions 
      WHERE merchant_id = ? AND timestamp >= ? 
      ORDER BY timestamp DESC
    `).all(merchantId, thirtyDaysAgo) as any[];

    // 3. Compute 30-day gross volume for small merchant threshold check
    const totalVolume = txns.reduce((sum, t) => sum + Number(t.amount), 0);

    // Proposed 2026 policy threshold is ₹50,000/mo
    const proposedPolicy = mappedPolicies.find((p) => p.policyId === 'POL-UPI-PROPOSED-2026');
    const threshold = proposedPolicy?.monthlyVolumeThreshold || 50000;
    const isSmallMerchantExempt = totalVolume <= threshold;

    let actualFeesDeducted = 0;
    let projectedFeesUnder2026Framework = 0;

    const classifiedTransactions: ClassifiedTransactionFee[] = txns.map((t) => {
      const amt = Number(t.amount);
      const method = t.payment_method || 'SOUNDBOX_UPI';
      const actualFee = Number(t.fee_mdr || 0) + Number(t.gst_on_mdr || 0);
      actualFeesDeducted += actualFee;

      const isUpi = method.includes('UPI');

      // Classification under upcoming 2026 framework
      let isEligible = false;
      let exemptionReason = '';
      let feeRatePercent = 0;
      let projectedFee = 0;

      if (!isUpi) {
        // Cards already attract fee under current active policy
        feeRatePercent = method.includes('CREDIT') ? 1.0 : 0.9;
        projectedFee = actualFee;
        isEligible = true;
      } else {
        // UPI transactions
        if (isSmallMerchantExempt) {
          isEligible = false;
          exemptionReason = `Exempt: 30-day volume (₹${Math.round(totalVolume).toLocaleString('en-IN')}) is below ₹${threshold.toLocaleString('en-IN')} small merchant limit.`;
        } else if (amt <= 2000) {
          isEligible = false;
          exemptionReason = 'Exempt: UPI transactions ≤ ₹2,000 remain completely 0% MDR under RBI/NPCI rules.';
        } else {
          // P2M > ₹2000 for non-exempt merchants
          isEligible = true;
          feeRatePercent = 0.40;
          let calc = amt * 0.004;
          if (proposedPolicy?.feeCap && calc > proposedPolicy.feeCap) {
            calc = proposedPolicy.feeCap;
          }
          projectedFee = Math.round(calc * 100) / 100;
        }
      }

      projectedFeesUnder2026Framework += projectedFee;

      return {
        transactionId: t.id,
        orderId: t.order_id,
        amount: amt,
        paymentMethod: method,
        timestamp: t.timestamp,
        isEligibleForFee: isEligible,
        exemptionReason: isEligible ? undefined : exemptionReason,
        appliedPolicyId: isUpi ? 'POL-UPI-PROPOSED-2026' : 'POL-CARD-ACTIVE',
        policyVersion: isUpi ? 'v2.0-DRAFT-2026' : 'v1.0-CARD',
        feeRatePercent,
        feeAmount: projectedFee,
        isEstimateOnly: isUpi, // UPI fee is strictly an estimate because it is not active
        statusNote: isUpi
          ? (isEligible
              ? 'Upcoming policy estimate only — 0% currently deducted.'
              : exemptionReason)
          : 'Active acquiring fee applied.',
      };
    });

    actualFeesDeducted = Math.round(actualFeesDeducted * 100) / 100;
    projectedFeesUnder2026Framework = Math.round(projectedFeesUnder2026Framework * 100) / 100;
    const diff = Math.round((projectedFeesUnder2026Framework - actualFeesDeducted) * 100) / 100;
    const estimatedAnnualCost = Math.round(projectedFeesUnder2026Framework * 12);

    return {
      merchantId,
      assessmentPeriod: '30-Day Rolling Window',
      merchantMonthlyVolume: Math.round(totalVolume),
      isSmallMerchantExempt,
      activePoliciesAppliedCount: mappedPolicies.filter((p) => p.approvalStatus === 'ACTIVE').length,
      actualFeesDeducted,
      projectedFeesUnder2026Framework,
      differenceAmount: diff,
      estimatedAnnualCost,
      frameworkStatus: 'UPCOMING_2026_FRAMEWORK_ANNOUNCED',
      advisoryHeadline: isSmallMerchantExempt
        ? 'Your Shop is 100% Exempt from UPI MDR Charges'
        : 'Upcoming 2026 UPI MDR Policy: Estimated Charges Only',
      policySummaryNote: isSmallMerchantExempt
        ? `Your monthly collections of ₹${Math.round(totalVolume).toLocaleString('en-IN')} are within the small merchant exemption ceiling. You continue to enjoy 0% MDR on all UPI and Soundbox payments.`
        : `Under the announced post-Diwali 2026 framework, UPI payments above ₹2,000 may attract a 0.40% fee (capped at ₹300). This policy is not yet effective. All UPI receipts currently remain 100% free of deduction.`,
      classifiedTransactions,
      activePolicies: mappedPolicies,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
