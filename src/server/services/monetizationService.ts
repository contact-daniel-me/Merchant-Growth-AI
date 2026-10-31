import { AppDatabase } from '../db/database.ts';

export const SUBSCRIPTION_PLANS = [
  {
    tier: 'FREE',
    name: 'Saathi Basic',
    monthlyFee: 0,
    features: [
      'Basic Soundbox Voice Announcements',
      'Daily Collections Total & Transaction History',
      'Standard Settlement Cycle Visibility',
      'Basic Khata Ledger (up to 10 customers)',
    ],
  },
  {
    tier: 'PREMIUM',
    name: 'Saathi Pro Merchant',
    monthlyFee: 125,
    popular: true,
    features: [
      'Paytm Soundbox 4G Voice + Display Sync',
      'Sarvam Multilingual Voice Agent (All 5 Indian Languages)',
      'Automated Spoken Daily Briefings (Morning & Evening)',
      'Settlement Variance Dispute & Investigation Assistant',
      'Unlimited Khata Credit Tracking & WhatsApp Reminders',
      'Off-Peak Footfall Boost Campaign Drafts',
    ],
  },
  {
    tier: 'BUSINESS_PRO',
    name: 'Saathi Enterprise & Multi-Store',
    monthlyFee: 349,
    features: [
      'All Pro Features Included',
      'Multi-Device & Cashier Role Isolation',
      'Priority Partner Loan Processing (Suryoday / Tata Capital)',
      'Automated Daily Settlement Fast-Forward (T+0 Immediate Credit)',
      'Dedicated Paytm Merchant Relationship Desk',
    ],
  },
];

export class MonetizationService {
  /**
   * 1. Subscriptions Management
   */
  public static getSubscription(merchantId: string) {
    const db = AppDatabase.getDB();
    let sub = db.prepare('SELECT * FROM subscriptions WHERE merchant_id = ?').get(merchantId) as any;

    if (!sub) {
      // Default to Premium
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO subscriptions (id, merchant_id, plan_tier, monthly_fee, billing_cycle, active_since, status, features_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `SUB-${Date.now()}`,
        merchantId,
        'PREMIUM',
        125.00,
        'MONTHLY',
        now.slice(0, 10),
        'ACTIVE',
        JSON.stringify(SUBSCRIPTION_PLANS[1].features)
      );
      sub = db.prepare('SELECT * FROM subscriptions WHERE merchant_id = ?').get(merchantId) as any;
    }

    return {
      currentPlan: {
        id: sub.id,
        planTier: sub.plan_tier,
        monthlyFee: Number(sub.monthly_fee),
        billingCycle: sub.billing_cycle,
        activeSince: sub.active_since,
        status: sub.status,
        features: JSON.parse(sub.features_json || '[]'),
      },
      availablePlans: SUBSCRIPTION_PLANS,
    };
  }

  public static upgradeSubscription(merchantId: string, targetTier: 'FREE' | 'PREMIUM' | 'BUSINESS_PRO') {
    const db = AppDatabase.getDB();
    const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === targetTier) || SUBSCRIPTION_PLANS[1];
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE subscriptions 
      SET plan_tier = ?, monthly_fee = ?, features_json = ?, status = 'ACTIVE'
      WHERE merchant_id = ?
    `).run(plan.tier, plan.monthlyFee, JSON.stringify(plan.features), merchantId);

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (id, merchant_id, actor, role, event_type, details, timestamp, ip_address, immutable_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `AUD-${Date.now()}`,
      merchantId,
      'Merchant Operator',
      'OWNER',
      'SUBSCRIPTION_UPDATED',
      `Subscription changed to ${plan.name} (₹${plan.monthlyFee}/month)`,
      now,
      '127.0.0.1',
      plan.tier
    );

    return this.getSubscription(merchantId);
  }

  /**
   * 2. Consent-Based Merchant Loan Discovery (Partner Integration)
   */
  public static getLoanProducts(merchantId: string) {
    const db = AppDatabase.getDB();
    const partners = db.prepare(`SELECT * FROM lending_partners WHERE status = 'ACTIVE'`).all() as any[];
    const products = db.prepare(`SELECT * FROM loan_products`).all() as any[];
    const existingApps = db.prepare(`
      SELECT * FROM loan_applications WHERE merchant_id = ? ORDER BY created_at DESC
    `).all(merchantId) as any[];

    // Calculate merchant pre-qualification indicators from real sales
    const past30Days = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as cnt 
      FROM transactions 
      WHERE merchant_id = ? AND timestamp >= datetime('now', '-30 days')
    `).get(merchantId) as any;

    const totalVolume = Number(past30Days.total);
    const eligibleAmountEstimate = Math.min(500000, Math.round(totalVolume * 1.5));

    return {
      disclaimer:
        'IMPORTANT REGULATORY NOTICE: Saathi by GrowIOTA facilitates digital loan discovery in partnership with RBI-regulated banks and NBFCs. Final credit assessment, underwriting, interest rates, and loan disbursal are solely at the discretion of the lending partner.',
      partnerCount: partners.length,
      partners: partners.map((p) => ({
        id: p.id,
        name: p.partner_name,
        rbiRegistration: p.rbi_registration_number,
        logoUrl: p.logo_url,
      })),
      products: products.map((prod) => ({
        id: prod.id,
        partnerId: prod.partner_id,
        name: prod.product_name,
        minAmount: Number(prod.min_amount),
        maxAmount: Number(prod.max_amount),
        interestRateRange: prod.interest_rate_range,
        tenureOptions: prod.tenure_options,
        repaymentFrequency: prod.repayment_frequency,
        eligibilityCriteria: prod.eligibility_criteria,
        preQualifiedEstimate: eligibleAmountEstimate,
      })),
      applications: existingApps.map((a) => ({
        id: a.id,
        productId: a.product_id,
        requestedAmount: Number(a.requested_amount),
        tenureMonths: a.tenure_months,
        status: a.status,
        partnerReferenceId: a.partner_reference_id,
        createdAt: a.created_at,
      })),
    };
  }

  public static applyForLoan(merchantId: string, payload: {
    productId: string;
    requestedAmount: number;
    tenureMonths: number;
    consentGiven: boolean;
  }) {
    if (!payload.consentGiven) {
      throw new Error('Merchant consent is legally required to share business data with RBI-regulated lending partners.');
    }

    const db = AppDatabase.getDB();
    const id = `LN-APP-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const partnerRef = `REF-SSFB-${Date.now().toString().slice(-8)}`;

    db.prepare(`
      INSERT INTO loan_applications (id, merchant_id, product_id, requested_amount, tenure_months, status, consent_given, partner_reference_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'SUBMITTED', 1, ?, ?, ?)
    `).run(id, merchantId, payload.productId, payload.requestedAmount, payload.tenureMonths, partnerRef, now, now);

    // Record consent
    db.prepare(`
      INSERT INTO consent_records (id, merchant_id, consent_type, status, granted_at, ip_address)
      VALUES (?, ?, 'DATA_SHARING_LENDING', 'GRANTED', ?, '127.0.0.1')
    `).run(`CON-${Date.now()}`, merchantId, now);

    return {
      applicationId: id,
      partnerReferenceId: partnerRef,
      status: 'SUBMITTED',
      message: 'Application initiated successfully with partner bank. Tele-verification call will follow within 4 business hours.',
    };
  }

  /**
   * 3. Merchant Marketing & Advertising Campaigns
   */
  public static getCampaigns(merchantId: string) {
    const db = AppDatabase.getDB();
    const campaigns = db.prepare(`
      SELECT * FROM marketing_campaigns 
      WHERE merchant_id = ? 
      ORDER BY created_at DESC
    `).all(merchantId) as any[];

    return campaigns.map((c) => ({
      id: c.id,
      campaignName: c.campaign_name,
      channel: c.channel,
      targetAudience: c.target_audience,
      discountOffer: c.discount_offer,
      minOrderValue: Number(c.min_order_value),
      status: c.status,
      estimatedReach: c.estimated_reach,
      budget: Number(c.budget),
      flyerText: c.flyer_text,
      approvedBy: c.approved_by,
      approvedAt: c.approved_at,
      createdAt: c.created_at,
    }));
  }

  public static createCampaignDraft(merchantId: string, payload: {
    campaignName: string;
    channel: string;
    targetAudience: string;
    discountOffer: string;
    minOrderValue: number;
    flyerText: string;
    estimatedReach: number;
    budget: number;
  }) {
    const db = AppDatabase.getDB();
    const id = `CAMP-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO marketing_campaigns (
        id, merchant_id, campaign_name, channel, target_audience, 
        discount_offer, min_order_value, status, estimated_reach, 
        budget, flyer_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?)
    `).run(
      id,
      merchantId,
      payload.campaignName,
      payload.channel,
      payload.targetAudience,
      payload.discountOffer,
      payload.minOrderValue,
      payload.estimatedReach,
      payload.budget,
      payload.flyerText,
      now
    );

    return this.getCampaigns(merchantId);
  }

  public static approveCampaign(merchantId: string, campaignId: string, approverName: string) {
    const db = AppDatabase.getDB();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE marketing_campaigns 
      SET status = 'ACTIVE', approved_by = ?, approved_at = ?
      WHERE id = ? AND merchant_id = ?
    `).run(approverName, now, campaignId, merchantId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, merchant_id, actor, role, event_type, details, timestamp, ip_address, immutable_hash)
      VALUES (?, ?, ?, 'OWNER', 'CAMPAIGN_APPROVED', ?, ?, '127.0.0.1', ?)
    `).run(
      `AUD-${Date.now()}`,
      merchantId,
      approverName,
      `Marketing campaign ${campaignId} approved for dispatch via WhatsApp`,
      now,
      campaignId
    );

    return this.getCampaigns(merchantId);
  }
}
