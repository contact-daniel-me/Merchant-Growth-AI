import { AppDatabase } from '../../db/database.ts';

export interface RepaymentScenarioOption {
  dailyEmiAmount: number;
  tenureMonths: number;
  totalRepaymentAmount: number;
  estimatedRemainingDailyCash: number;
  cashFlowStressLevel: 'COMFORTABLE' | 'MODERATE' | 'TIGHT';
  safeBufferPercentage: number;
  assumptions: string[];
}

export interface CashFlowScenarioReport {
  merchantId: string;
  businessName: string;
  historicalMetrics: {
    averageDailyCollections: number;
    medianDailyCollections: number;
    lowestDayInLast30Days: number;
    peakDayInLast30Days: number;
    collectionsVolatilityPercent: number;
    samplePeriodDays: number;
  };
  scenarios: RepaymentScenarioOption[];
  partnerProducts: Array<{
    productId: string;
    partnerName: string;
    productName: string;
    minAmount: number;
    maxAmount: number;
    interestRateDisplay: string;
    repaymentFrequency: string;
    disclaimer: string;
  }>;
  disclaimerNote: string;
  generatedAt: string;
}

export class RepaymentScenarioEngine {
  /**
   * Generates transparent, multi-scenario loan repayment models based on actual merchant revenue.
   * Eliminates arbitrary 1.5x multipliers. Discloses all assumptions and uncertainty.
   */
  public static generateScenarios(merchantId: string): CashFlowScenarioReport {
    const db = AppDatabase.getDB();
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(merchantId) as any;
    if (!merchant) {
      throw new Error(`Merchant '${merchantId}' not found.`);
    }

    // 1. Gather historical daily collections over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const txns = db.prepare(`
      SELECT date(timestamp) as txn_date, SUM(amount) as day_total
      FROM transactions
      WHERE merchant_id = ? AND timestamp >= ?
      GROUP BY date(timestamp)
      ORDER BY txn_date ASC
    `).all(merchantId, thirtyDaysAgo) as any[];

    const dailyTotals: number[] = txns.map((t) => Number(t.day_total));
    const samplePeriodDays = Math.max(1, dailyTotals.length);

    const sum = dailyTotals.reduce((a, b) => a + b, 0);
    const avgDaily = samplePeriodDays > 0 ? Math.round(sum / samplePeriodDays) : 3500;
    const sorted = [...dailyTotals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || avgDaily;
    const lowest = sorted[0] || Math.round(avgDaily * 0.4);
    const peak = sorted[sorted.length - 1] || Math.round(avgDaily * 1.8);

    // Volatility calculation (Standard deviation / Mean)
    const variance = dailyTotals.reduce((acc, v) => acc + Math.pow(v - avgDaily, 2), 0) / (samplePeriodDays || 1);
    const stdDev = Math.sqrt(variance);
    const volatilityPct = avgDaily > 0 ? Math.round((stdDev / avgDaily) * 100) : 25;

    // 2. Build repayment scenarios: ₹250/day, ₹500/day, ₹1,000/day
    const testEmiAmounts = [250, 500, 1000];
    const scenarios: RepaymentScenarioOption[] = [];

    for (const emi of testEmiAmounts) {
      for (const tenure of [3, 6, 12]) {
        const totalDays = tenure * 30;
        const totalRepay = emi * totalDays;
        const remainingCash = Math.max(0, avgDaily - emi);
        const bufferPct = avgDaily > 0 ? Math.round((remainingCash / avgDaily) * 100) : 0;

        let stress: 'COMFORTABLE' | 'MODERATE' | 'TIGHT' = 'COMFORTABLE';
        if (emi > avgDaily * 0.4 || emi > lowest) {
          stress = 'TIGHT';
        } else if (emi > avgDaily * 0.2) {
          stress = 'MODERATE';
        }

        scenarios.push({
          dailyEmiAmount: emi,
          tenureMonths: tenure,
          totalRepaymentAmount: totalRepay,
          estimatedRemainingDailyCash: remainingCash,
          cashFlowStressLevel: stress,
          safeBufferPercentage: bufferPct,
          assumptions: [
            `Assumes merchant collections remain steady near recent ₹${avgDaily.toLocaleString('en-IN')}/day average.`,
            `Deduction occurs automatically from daily settlement batch before bank dispatch.`,
            `If daily sales fall below ₹${emi}, the shortfall is carried over to the next settlement.`,
          ],
        });
      }
    }

    // 3. Fetch lending partners and approved loan products
    const partnerRows = db.prepare(`
      SELECT p.id as prod_id, p.product_name, p.min_amount, p.max_amount, p.interest_rate_range, p.repayment_frequency,
             lp.partner_name as partner_name
      FROM loan_products p
      JOIN lending_partners lp ON p.partner_id = lp.id
      WHERE lp.status = 'ACTIVE'
    `).all() as any[];

    const partnerProducts = partnerRows.map((p) => ({
      productId: p.prod_id,
      partnerName: p.partner_name,
      productName: p.product_name,
      minAmount: Number(p.min_amount),
      maxAmount: Number(p.max_amount),
      interestRateDisplay: p.interest_rate_range,
      repaymentFrequency: p.repayment_frequency,
      disclaimer: 'Final credit underwriting and interest rate determined solely by the RBI-regulated lending partner.',
    }));

    return {
      merchantId,
      businessName: merchant.business_name,
      historicalMetrics: {
        averageDailyCollections: avgDaily,
        medianDailyCollections: median,
        lowestDayInLast30Days: lowest,
        peakDayInLast30Days: peak,
        collectionsVolatilityPercent: volatilityPct,
        samplePeriodDays,
      },
      scenarios,
      partnerProducts,
      disclaimerNote:
        'These cash-flow comparisons are educational scenarios based on verified historical sales. They do not constitute a guaranteed loan offer or autonomous credit approval. All lending is disbursed by RBI-licensed partner institutions.',
      generatedAt: new Date().toISOString(),
    };
  }
}
