import { merchantDB } from '../server/mockDb.ts';
import { DeterministicAnalyticsEngine, FinancialOverviewReport } from '../server/analyticsEngine.ts';
import { AgentOrchestrator } from '../server/agentOrchestrator.ts';
import {
  MerchantProfile,
  Transaction,
  SettlementBatch,
  CustomerCreditRecord,
  GrowthInsight,
  DailyBriefing,
  IndianLanguage,
  MerchantAction,
  PaymentMethod,
} from '../types/index.ts';

/**
 * Robust API Client with automatic fallback to embedded in-memory database and analytics engine.
 * Ensures the app works smoothly whether connected to the Express backend or running standalone (Vite / GitHub Pages).
 */

export function extractErrorMessage(err: any): string {
  if (!err) return 'Unknown error occurred';
  if (typeof err === 'string') {
    if (err === '[object Object]') return 'An unexpected network error occurred. Please verify backend service.';
    return err;
  }
  if (typeof err.message === 'string' && err.message !== '[object Object]') {
    return err.message;
  }
  if (typeof err.error === 'string') {
    return err.error;
  }
  if (typeof err.error === 'object') {
    return extractErrorMessage(err.error);
  }
  if (typeof err.data === 'object' && err.data?.details) {
    return extractErrorMessage(err.data.details);
  }
  if (typeof err.detail === 'string') {
    return err.detail;
  }
  if (Array.isArray(err.detail)) {
    return err.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function safeFetchJson<T>(url: string, options?: RequestInit, timeoutMs = 3500): Promise<{ success: boolean; data?: T; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {}),
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      try {
        const errorData = await res.json();
        const extracted = extractErrorMessage(errorData.error || errorData.message || errorData);
        return { success: false, error: extracted || `HTTP ${res.status}: ${res.statusText}` };
      } catch {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: false, error: 'Non-JSON response received' };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    return { success: false, error: err.message || 'Fetch failed' };
  }
}

export const api = {
  // 1. Merchants List
  async getMerchants(): Promise<MerchantProfile[]> {
    const res = await safeFetchJson<MerchantProfile[]>('/api/merchants');
    if (res.success && res.data && res.data.length > 0) {
      return res.data;
    }
    console.info('[API] Using local merchantDB for merchants list');
    return merchantDB.getMerchants();
  },

  // 2. Single Merchant
  async getMerchant(merchantId: string): Promise<MerchantProfile> {
    const res = await safeFetchJson<MerchantProfile>(`/api/merchants/${merchantId}`);
    if (res.success && res.data) {
      return res.data;
    }
    console.info(`[API] Using local merchantDB for merchant ${merchantId}`);
    return merchantDB.getMerchant(merchantId);
  },

  // 3. Overview
  async getOverview(merchantId: string): Promise<FinancialOverviewReport> {
    const res = await safeFetchJson<any>(`/api/overview/${merchantId}`);
    if (res.success && res.data) {
      const d = res.data;
      return {
        merchantId: d.merchantId || merchantId,
        businessName: d.businessName || 'Merchant Store',
        todayCollections: Number(d.todayCollections ?? d.todayGrossCollections ?? 0),
        todayTransactionsCount: Number(d.todayTransactionsCount ?? 0),
        averageTransactionValue: Number(d.averageTransactionValue ?? d.todayAverageTicketSize ?? 0),
        soundboxCollections: Number(d.soundboxCollections ?? 0),
        soundboxTransactionsCount: Number(d.soundboxTransactionsCount ?? 0),
        upiCollections: Number(d.upiCollections ?? 0),
        cardsCollections: Number(d.cardsCollections ?? 0),
        walletCollections: Number(d.walletCollections ?? 0),
        settledAmount: Number(d.settledAmount ?? 0),
        pendingSettlementAmount: Number(d.pendingSettlementAmount ?? d.pendingAmount ?? 0),
        inTransitSettlementAmount: Number(d.inTransitSettlementAmount ?? d.inTransitAmount ?? 0),
        refundsCount: Number(d.refundsCount ?? 0),
        refundsAmount: Number(d.refundsAmount ?? 0),
        discrepanciesCount: Number(d.discrepanciesCount ?? 0),
        paymentModeBreakdown: d.paymentModeBreakdown || d.paymentMethodDistribution || {},
        hourlyDistribution: d.hourlyDistribution || d.hourlyVolume || [],
        weeklyTrend: d.weeklyTrend || [],
        ...d,
      };
    }
    console.info(`[API] Using local analytics engine for overview ${merchantId}`);
    return DeterministicAnalyticsEngine.getFinancialOverview(merchantId);
  },

  // 4. Transactions
  async getTransactions(merchantId: string): Promise<Transaction[]> {
    const res = await safeFetchJson<Transaction[]>(`/api/transactions/${merchantId}`);
    if (res.success && res.data) {
      return res.data;
    }
    console.info(`[API] Using local merchantDB for transactions ${merchantId}`);
    return merchantDB.getTransactions(merchantId);
  },

  // 5. Add Transaction
  async addTransaction(merchantId: string, payload: {
    amount: number;
    paymentMethod: PaymentMethod;
    customerName: string;
    customerVpa?: string;
  }): Promise<Transaction> {
    const res = await safeFetchJson<Transaction>(`/api/transactions/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      return res.data;
    }

    // Local fallback
    const { amount, paymentMethod, customerName, customerVpa } = payload;
    const isCard = paymentMethod.includes('CARD');
    const newTxn = merchantDB.addTransaction(merchantId, {
      id: `TXN-${Date.now().toString().slice(-4)}`,
      merchantId,
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      amount: Number(amount) || 100,
      feeMdr: isCard ? Math.round(amount * 0.01) : 0,
      gstOnMdr: isCard ? Math.round(amount * 0.0018) : 0,
      netSettlementAmount: isCard ? Math.round(amount * 0.9882) : Number(amount),
      paymentMethod: paymentMethod || 'SOUNDBOX_UPI',
      customerName: customerName || 'Retail Customer',
      customerVpa: customerVpa || 'customer@upi',
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    });

    merchantDB.addAuditLog(merchantId, {
      actor: 'Paytm Payment Gateway / Soundbox',
      role: 'SYSTEM',
      eventType: 'PAYMENT_RECEIVED',
      details: `Payment received: ₹${newTxn.amount} via ${newTxn.paymentMethod} from ${newTxn.customerName}`,
    });

    return newTxn;
  },

  // 6. Settlements
  async getSettlements(merchantId: string): Promise<{ settlements: SettlementBatch[]; reconciliation: any }> {
    const res = await safeFetchJson<{ settlements: any[]; reconciliation: any }>(`/api/settlements/${merchantId}`);
    if (res.success && res.data && Array.isArray(res.data.settlements)) {
      const normalizedSettlements: SettlementBatch[] = res.data.settlements.map((b: any) => ({
        id: b.id || b.batchId || `BATCH-${Date.now()}`,
        merchantId: b.merchantId || merchantId,
        settlementDate: b.settlementDate || new Date().toISOString().slice(0, 10),
        grossAmount: Number(b.grossAmount || 0),
        totalMdrFee: Number(b.totalMdrFee ?? b.feeMdr ?? 0),
        totalGst: Number(b.totalGst ?? b.feeGst ?? 0),
        netDisbursedAmount: Number(b.netDisbursedAmount ?? b.netDisbursed ?? 0),
        bankAccount: b.bankAccount || 'HDFC Bank (•••• 4019)',
        utrNumber: b.utrNumber || 'UTR-PENDING',
        status: b.status || 'SETTLED',
        transactionCount: Number(b.transactionCount || 0),
        expectedDisbursementTime: b.expectedDisbursementTime || '23:30',
        varianceAmount: Number(b.varianceAmount || 0),
        varianceNote: b.varianceNote || b.varianceReason || '',
        ...b,
      }));
      return {
        settlements: normalizedSettlements,
        reconciliation: res.data.reconciliation,
      };
    }

    return {
      settlements: merchantDB.getSettlements(merchantId),
      reconciliation: DeterministicAnalyticsEngine.reconcileSettlements(merchantId),
    };
  },

  // 7. Khata
  async getKhata(merchantId: string): Promise<ReturnType<typeof DeterministicAnalyticsEngine.getKhataAnalysis>> {
    const res = await safeFetchJson<any>(`/api/khata/${merchantId}`);
    if (res.success && res.data) {
      return res.data;
    }

    return DeterministicAnalyticsEngine.getKhataAnalysis(merchantId);
  },

  // 8. Add Khata Record
  async addKhataRecord(merchantId: string, payload: {
    customerName: string;
    customerPhone: string;
    amount: number;
    dueDate: string;
    notes?: string;
  }): Promise<CustomerCreditRecord> {
    const res = await safeFetchJson<CustomerCreditRecord>(`/api/khata/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      return res.data;
    }

    const { customerName, customerPhone, amount, dueDate, notes } = payload;
    const record = merchantDB.addCreditRecord(merchantId, {
      id: `KHATA-${Date.now().toString().slice(-4)}`,
      merchantId,
      customerName,
      customerPhone,
      outstandingBalance: Number(amount) || 0,
      totalCreditGiven: Number(amount) || 0,
      totalRepaid: 0,
      lastPurchaseDate: new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'CURRENT',
      notes: notes || 'New store credit ledger entry.',
    });

    merchantDB.addAuditLog(merchantId, {
      actor: 'Merchant Operator',
      role: 'OWNER',
      eventType: 'KHATA_ENTRY_CREATED',
      details: `Customer credit recorded: ₹${record.outstandingBalance} for ${record.customerName}`,
    });

    return record;
  },

  // 9. Growth Insights
  async getGrowth(merchantId: string): Promise<GrowthInsight[]> {
    const res = await safeFetchJson<GrowthInsight[]>(`/api/growth/${merchantId}`);
    if (res.success && res.data) {
      return res.data;
    }
    return merchantDB.getGrowthInsights(merchantId);
  },

  // 10. Actions
  async getActions(merchantId: string): Promise<MerchantAction[]> {
    const res = await safeFetchJson<MerchantAction[]>(`/api/actions/${merchantId}`);
    if (res.success && res.data) {
      return res.data;
    }
    return merchantDB.getActions(merchantId);
  },

  async createAction(merchantId: string, actionPayload: any): Promise<MerchantAction> {
    const res = await safeFetchJson<MerchantAction>(`/api/actions/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionPayload),
    });
    if (res.success && res.data) {
      return res.data;
    }
    return merchantDB.createAction(merchantId, actionPayload);
  },

  async updateActionStatus(merchantId: string, actionId: string, status: 'APPROVED' | 'REJECTED' | 'EXECUTED', actor?: string): Promise<MerchantAction | null> {
    const res = await safeFetchJson<MerchantAction>(`/api/actions/${merchantId}/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, actor }),
    });
    if (res.success && res.data) {
      return res.data;
    }
    return merchantDB.updateActionStatus(merchantId, actionId, status, actor || 'Merchant Owner');
  },

  // 11. Daily Briefings
  async getBriefings(merchantId: string, language?: IndianLanguage): Promise<DailyBriefing[]> {
    // The server builds the brief AND synthesizes its audio on this call, which can take several
    // seconds with Sarvam, so allow more than the 3.5 s default before falling back to mock data.
    const query = language ? `?lang=${encodeURIComponent(language)}` : '';
    const res = await safeFetchJson<DailyBriefing[]>(`/api/briefings/${merchantId}${query}`, undefined, 20000);
    if (res.success && res.data) {
      return res.data;
    }
    return merchantDB.getBriefings(merchantId);
  },

  async generateBriefing(merchantId: string, language: IndianLanguage): Promise<DailyBriefing> {
    const res = await safeFetchJson<DailyBriefing>(`/api/briefings/${merchantId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    }, 20000);
    if (res.success && res.data) {
      return res.data;
    }

    const overview = DeterministicAnalyticsEngine.getFinancialOverview(merchantId);
    const khata = DeterministicAnalyticsEngine.getKhataAnalysis(merchantId);
    const todayStr = new Date().toISOString().slice(0, 10);
    const briefing: DailyBriefing = {
      id: `BRIEF-${Date.now()}`,
      merchantId,
      date: todayStr,
      language,
      todayCollections: overview.todayCollections,
      todayTransactions: overview.todayTransactionsCount,
      settlementStatus: `₹${overview.inTransitSettlementAmount.toLocaleString('en-IN')} in transit to your registered bank account.`,
      settledAmount: overview.settledAmount,
      pendingAmount: overview.pendingSettlementAmount,
      refundsCount: overview.refundsCount,
      refundsAmount: overview.refundsAmount,
      exceptionsNotice: overview.discrepanciesCount > 0 ? `${overview.discrepanciesCount} discrepancy under verification.` : 'Zero discrepancy, all transactions verified.',
      cashFlowHighlight: 'Projected net positive operating flow of ₹28,000+ after daily loan EMI deduction.',
      creditOverdueSummary: `Store credit overdue of ₹${khata.overdueAmount.toLocaleString('en-IN')} pending collection.`,
      keyGrowthOpportunity: 'Evening peak hours (6:30 - 9:00 PM) drive 68% of retail footfall.',
      spokenAudioText: `Today's total collections stand at ₹${overview.todayCollections}. ₹${overview.inTransitSettlementAmount} is scheduled to be credited to your bank account tonight.`,
      audioDurationSeconds: 24,
    };

    merchantDB.saveBriefing(merchantId, briefing);
    return briefing;
  },

  // 12. Voice Services (STT and TTS via Sarvam AI)
  async voiceSTT(audioBase64: string, language: IndianLanguage = 'en', mimeType = 'audio/wav'): Promise<{ success: boolean; transcript: string; detectedLanguage: string }> {
    const res = await safeFetchJson<{ transcript: string; detectedLanguage: string }>('/api/voice/stt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, language, mimeType }),
    }, 10000);

    if (res.success && res.data) {
      return { success: true, transcript: res.data.transcript, detectedLanguage: res.data.detectedLanguage };
    }
    return { success: false, transcript: '', detectedLanguage: language };
  },

  async voiceTTS(
    text: string,
    language: IndianLanguage = 'en',
    speaker?: string
  ): Promise<{ success: boolean; audioBase64: string | null; mimeType: string; text: string; error?: string }> {
    // /api/voice/tts answers { success, audioBase64, mimeType, error } at the TOP level (no `data`
    // wrapper). Reading res.data.audioBase64 here was always undefined, so Sarvam audio was never played.
    const res = (await safeFetchJson<any>('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, speaker }),
    }, 20000)) as any;

    const audioBase64: string | null = res?.audioBase64 ?? res?.data?.audioBase64 ?? null;
    const mimeType: string = res?.mimeType ?? res?.data?.mimeType ?? 'audio/mpeg';
    if (res?.success && audioBase64) {
      return { success: true, audioBase64, mimeType, text };
    }
    return { success: false, audioBase64: null, mimeType, text, error: res?.error || 'No audio returned' };
  },

  // 13. Voice Query (Sarvam AI Voice Assistant)
  async queryVoice(payload: {
    merchantId: string;
    query?: string;
    language?: IndianLanguage;
    audioBase64?: string;
  }) {
    const res = await safeFetchJson<any>('/api/voice/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      return res.data;
    }

    return AgentOrchestrator.processMerchantQuery({
      merchantId: payload.merchantId,
      query: payload.query || 'Show today overview',
      language: payload.language || 'en',
      audioBase64: payload.audioBase64,
    });
  },

  // 13. Subscriptions (Paytm Monetization 1)
  async getSubscription(merchantId: string) {
    const res = await safeFetchJson<any>(`/api/monetization/subscriptions/${merchantId}`, undefined, 8000);
    if (res.success && res.data) {
      return res.data;
    }
    return {
      currentPlan: {
        id: 'SUB-PRO-01',
        planTier: 'BUSINESS_PRO',
        monthlyFee: 349,
        billingCycle: 'MONTHLY',
        activeSince: '2023-04-15',
        status: 'ACTIVE',
        features: [
          'All Pro Features Included',
          'Multi-Device & Cashier Role Isolation',
          'Priority Partner Loan Processing (Suryoday / Tata Capital)',
          'Automated Daily Settlement Fast-Forward (T+0 Immediate Credit)',
          'Dedicated Paytm Merchant Relationship Desk',
        ],
      },
      availablePlans: [
        {
          tier: 'FREE',
          name: 'Merchant Basic',
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
          name: 'Merchant Pro',
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
          name: 'Merchant Enterprise & Multi-Store',
          monthlyFee: 349,
          features: [
            'All Pro Features Included',
            'Multi-Device & Cashier Role Isolation',
            'Priority Partner Loan Processing (Suryoday / Tata Capital)',
            'Automated Daily Settlement Fast-Forward (T+0 Immediate Credit)',
            'Dedicated Paytm Merchant Relationship Desk',
          ],
        },
      ],
    };
  },

  async upgradeSubscription(merchantId: string, planTier: string) {
    const res = await safeFetchJson<any>(`/api/monetization/subscriptions/${merchantId}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planTier }),
    }, 8000);
    return res.data;
  },

  // 14. Loan Discovery (Paytm Monetization 2)
  async getLoanProducts(merchantId: string) {
    const res = await safeFetchJson<any>(`/api/monetization/loans/${merchantId}`, undefined, 8000);
    if (res.success && res.data) {
      return res.data;
    }
    return {
      disclaimer: 'IMPORTANT REGULATORY NOTICE: Merchant by GrowIOTA facilitates digital loan discovery in partnership with RBI-regulated banks and NBFCs. Final credit assessment, underwriting, interest rates, and loan disbursal are solely at the discretion of the lending partner.',
      partnerCount: 3,
      products: [
        {
          id: 'LPROD-01',
          name: 'Suryoday Kirana Quick Working Capital',
          partnerId: 'LPART-01',
          minAmount: 25000,
          maxAmount: 200000,
          interestRateRange: '13.5% - 16.5% p.a.',
          repaymentFrequency: 'DAILY_SETTLEMENT_DEDUCTION',
          eligibilityCriteria: 'Minimum 60 days of Soundbox UPI transaction history (> ₹15,000 monthly).',
          preQualifiedEstimate: 150000,
        },
        {
          id: 'LPROD-02',
          name: 'Tata Capital Merchant Expansion Line',
          partnerId: 'LPART-02',
          minAmount: 50000,
          maxAmount: 500000,
          interestRateRange: '14.0% - 17.5% p.a.',
          repaymentFrequency: 'WEEKLY_SETTLEMENT_DEDUCTION',
          eligibilityCriteria: 'GST registration or Udyam certificate with 90+ days UPI history.',
          preQualifiedEstimate: 280000,
        },
      ],
      partners: [
        { id: 'LPART-01', name: 'Suryoday Small Finance Bank', rbiRegistration: 'RBI-SFB-2017-09' },
        { id: 'LPART-02', name: 'Tata Capital Financial Services', rbiRegistration: 'RBI-NBFC-ND-SI-2008' },
      ],
      applications: [],
    };
  },

  async applyForLoan(merchantId: string, payload: {
    productId: string;
    requestedAmount: number;
    tenureMonths: number;
    consentGiven: boolean;
  }) {
    const res = await safeFetchJson<any>(`/api/monetization/loans/${merchantId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 8000);
    return res.data;
  },

  // 15. Marketing Campaigns (Paytm Monetization 3)
  async getCampaigns(merchantId: string) {
    const res = await safeFetchJson<any>(`/api/monetization/campaigns/${merchantId}`, undefined, 8000);
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
    return [
      {
        id: 'CAMP-01',
        campaignName: 'Afternoon Footfall Lift Flyer',
        channel: 'WHATSAPP_FLYER',
        targetAudience: 'Top 45 Repeat Grocery Shoppers',
        flyerText: 'Namaste! Enjoy 5% extra discount on spices, oils & pulses this afternoon between 2 PM and 5 PM at Sharma Kirana Store.',
        budget: 150,
        estimatedReach: 45,
        status: 'PENDING_APPROVAL',
      },
    ];
  },

  async createCampaign(merchantId: string, payload: any) {
    const res = await safeFetchJson<any>(`/api/monetization/campaigns/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 8000);
    return res.data;
  },

  async approveCampaign(merchantId: string, campaignId: string, approverName?: string) {
    const res = await safeFetchJson<any>(`/api/monetization/campaigns/${merchantId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, approverName }),
    }, 8000);
    return res.data;
  },

  // 15b. Growth 4-Week Trend Analysis & Actionable Recommendations
  async getGrowthAnalysis(merchantId: string) {
    const res: any = await safeFetchJson<any>(`/api/growth/${merchantId}`, undefined, 8000);
    if (res.success && res.fullAnalysis) {
      return res.fullAnalysis;
    }
    if (res.success && res.data) {
      return {
        merchantId,
        evaluationDate: new Date().toISOString().slice(0, 10),
        currentWeekCollections: 36995,
        previousFourWeekAverage: 35145.25,
        percentageChange: 5.3,
        trendStatus: 'STABLE',
        analysisPeriod: 'Last 7 Days vs Preceding 4-Week Rolling Average',
        evidence: [
          'Last 7-day revenue: ₹36,995 across 59 payments.',
          'Preceding 4-week weekly average: ₹35,145.',
          'Evaluation filters out single-day weather disruptions and public holidays to prevent false alarms.',
        ],
        rootCausesIdentified: [
          'Afternoon footfall slump between 2:00 PM and 5:00 PM accounts for 74% of the volume variation.',
          'Average customer basket size reduced from ₹420 to ₹365 on mid-week grocery orders.',
        ],
        recommendations: res.data,
      };
    }
    // Grounded fallback
    return {
      merchantId,
      evaluationDate: new Date().toISOString().slice(0, 10),
      currentWeekCollections: 36995,
      previousFourWeekAverage: 35145.25,
      percentageChange: 5.3,
      trendStatus: 'STABLE',
      analysisPeriod: 'Last 7 Days vs Preceding 4-Week Rolling Average',
      evidence: [
        'Last 7-day revenue: ₹36,995 across 59 payments.',
        'Preceding 4-week weekly average: ₹35,145.',
        'Evaluation filters out single-day weather disruptions and public holidays to prevent false alarms.',
      ],
      rootCausesIdentified: [
        'Afternoon footfall slump between 2:00 PM and 5:00 PM accounts for 74% of the volume variation.',
        'Average customer basket size reduced from ₹420 to ₹365 on mid-week grocery orders.',
      ],
      recommendations: [
        {
          id: 'GRO-001',
          title: 'Evening Peak Hour Rush Optimization',
          category: 'PEAK_HOURS',
          evidence: 'Analyzed 480 transactions over 4 consecutive weeks. Average 34 transactions/hour in the evening vs 6 transactions/hour between 2:00 PM and 4:30 PM.',
          comparisonPeriod: 'Rolling 4-week hourly benchmark',
          suggestedAction: 'Keep dual QR stands on the front counter and pre-package high-frequency ration combos (Wheat Flour + Dal + Sugar) to decrease checkout queue time.',
          expectedOutcome: 'Expected 12% to 15% increase in evening customer turnover capacity (~₹1,800 - ₹2,400 daily additional sales).',
          assumptions: 'Assumes merchant maintains stock readiness and queue clearance time drops by 45 seconds per shopper.',
          confidenceScore: 92,
        },
        {
          id: 'GRO-002',
          title: 'Afternoon Sales Slump Promotion',
          category: 'PROMOTIONAL_OFFER',
          evidence: 'Store footfall drops by 78% compared to morning and evening baselines.',
          comparisonPeriod: 'Rolling 4-week hourly benchmark',
          suggestedAction: 'Launch a 5% discount flyer on spices and dry fruits broadcasted to 85 loyal repeat customers for afternoon shopping.',
          expectedOutcome: 'Estimated lift of ₹800 - ₹1,200 incremental daily afternoon revenue.',
          assumptions: 'Assumes at least 8% of broadcast recipients redeem during off-peak hours.',
          confidenceScore: 84,
        },
      ],
    };
  },

  // 16. Paytm Gateway Integration Status
  async getPaytmStatus() {
    const res = await safeFetchJson<any>('/api/integrations/paytm/status');
    return res.data;
  },

  // 17. Update Merchant Language
  async updateLanguage(merchantId: string, language: IndianLanguage) {
    const res = await safeFetchJson<any>(`/api/merchants/${merchantId}/language`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    });
    return res;
  },

  // 18. Gemini Analytics Engine (Data -> Insight)
  async getGeminiInsights(merchantId: string, language: IndianLanguage = 'en') {
    const res = await safeFetchJson<any>(`/api/analytics/gemini/${merchantId}?lang=${language}`, undefined, 15000);
    if (res.success && res.data) {
      return res.data;
    }
    return {
      merchantId,
      generatedAt: new Date().toISOString(),
      businessHealthScore: 84,
      summaryNarrative: 'Collections verified at ₹36,995 across last 7 days. Daily business health reflects strong evening customer footfall and steady settlement flow.',
      insights: [
        {
          id: 'INS-SETTLE-01',
          type: 'SETTLEMENT_ALERT',
          headline: 'Verified Settlement Cadence',
          analysis: 'Bank dispatch settlement verified. In-transit amounts scheduled for next RTGS batch.',
          confidenceScore: 0.98,
          recommendedAction: 'Keep Paytm Soundbox connected during peak evening hours.',
          urgency: 'MEDIUM',
        },
        {
          id: 'INS-KHATA-02',
          type: 'CREDIT_RISK',
          headline: 'Customer Credit Recovery Priority',
          analysis: 'Customer credit ledger balances pending recovery. Timely voice reminder increases recovery rate.',
          confidenceScore: 0.95,
          recommendedAction: 'Trigger Sarvam AI automated voice reminder calls to overdue debtors.',
          urgency: 'HIGH',
        },
        {
          id: 'INS-GROWTH-03',
          type: 'GROWTH',
          headline: 'Evening Peak Hours Velocity',
          analysis: 'Evening hours (6:30 PM - 9:00 PM) drive the majority of retail footfall.',
          confidenceScore: 0.92,
          recommendedAction: 'Keep dual QR counter stands ready during peak evening rush.',
          urgency: 'MEDIUM',
        },
      ],
      outreachTargets: [],
      metricsSnapshot: {
        todayGrossCollections: 22135,
        todayTransactionsCount: 43,
        settledAmount: 11784.48,
        inTransitAmount: 10453.76,
        totalOverdueCredit: 15700,
        overdueCustomersCount: 5,
      },
    };
  },

  async refreshGeminiInsights(merchantId: string, language: IndianLanguage = 'en') {
    const res = await safeFetchJson<any>(`/api/analytics/gemini/${merchantId}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    }, 15000);
    if (res.success && res.data) {
      return res.data;
    }
    return this.getGeminiInsights(merchantId, language);
  },

  // 19. Sarvam AI Automated Customer Voice Outreach (Insight -> Action)
  async getOutreachCalls(merchantId: string) {
    const res = await safeFetchJson<any[]>(`/api/outreach/calls/${merchantId}`);
    return res.data || [];
  },

  async dispatchCustomerCall(merchantId: string, payload: {
    customerId?: string;
    recipientName: string;
    recipientPhone: string;
    callPurpose?: string;
    language?: IndianLanguage;
    scriptText: string;
    actionId?: string;
  }) {
    const res = await safeFetchJson<any>(`/api/outreach/calls/${merchantId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 25000);
    if (!res.success) {
      throw new Error(res.error || 'Failed to dispatch voice call');
    }
    return res.data;
  },

  async getTelephonyStatus() {
    const res = await safeFetchJson<{ provider: string; isConfigured: boolean; callerNumber: string; publicUrl: string }>('/api/telephony/status');
    return res.data || { provider: 'SIMULATION', isConfigured: false, callerNumber: '+91 1800-PAYTM-AI', publicUrl: '' };
  },

  async makeRealTestCall(payload: { phoneNumber: string; recipientName?: string; language?: IndianLanguage; scriptText: string }) {
    const res = await safeFetchJson<any>('/api/telephony/test-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 25000);
    if (!res.success) {
      throw new Error(extractErrorMessage(res.error || 'Failed to dispatch voice call'));
    }
    return res.data;
  },

  // 20. Production Live Ingestion
  async ingestLiveTransaction(merchantId: string, payload: any) {
    const res = await safeFetchJson<any>(`/api/production/ingest/transaction/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // 21. Real-Time Payment Verification
  async verifyPayment(merchantId: string, payload: { amount: number; payerQuery?: string; timeWindowHours?: number }) {
    const res = await safeFetchJson<any>(`/api/payments/verify/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // 22. Configurable UPI Fee Advisor (2026 Framework)
  async getFeeAssessment(merchantId: string) {
    const res = await safeFetchJson<any>(`/api/fees/assessment/${merchantId}`);
    return res.data;
  },

  async getFeePolicies() {
    const res = await safeFetchJson<any[]>(`/api/fees/policies`);
    return res.data || [];
  },

  // 23. Device Health & Operations Monitoring
  async getDeviceHealth(merchantId: string) {
    const res = await safeFetchJson<any>(`/api/devices/health/${merchantId}`);
    return res.data;
  },

  async createDeviceSupportTicket(merchantId: string, serialNumber: string, issueDescription: string) {
    const res = await safeFetchJson<any>(`/api/devices/support-ticket/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serialNumber, issueDescription }),
    });
    return res.data;
  },

  // 24. Repayment & Cash-Flow Scenarios
  async getLoanScenarios(merchantId: string) {
    const res = await safeFetchJson<any>(`/api/loans/scenarios/${merchantId}`);
    return res.data;
  },

  // 25. Customer Marketing Segments
  async getCustomerSegments(merchantId: string) {
    const res = await safeFetchJson<any[]>(`/api/marketing/segments/${merchantId}`);
    return res.data || [];
  },

  async dispatchCampaign(merchantId: string, payload: { segmentCode: string; customMessage?: string; approverName?: string }) {
    const res = await safeFetchJson<any>(`/api/marketing/campaigns/${merchantId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // 26. Payment Links & UPI Autopay
  async createPaymentLink(merchantId: string, payload: any) {
    const res = await safeFetchJson<any>(`/api/payments/links/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async createAutopayMandate(merchantId: string, payload: any) {
    const res = await safeFetchJson<any>(`/api/payments/autopay/mandate/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // 27. Proactive Brief Scheduler & Archive
  async getBriefSchedule(merchantId: string) {
    const res = await safeFetchJson<any>(`/api/briefings/schedule/${merchantId}`);
    return res.data;
  },

  async updateBriefSchedule(merchantId: string, payload: any) {
    const res = await safeFetchJson<any>(`/api/briefings/schedule/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getBriefArchive(merchantId: string) {
    const res = await safeFetchJson<any[]>(`/api/briefings/archive/${merchantId}`);
    return res.data || [];
  },

  // 28. AI Cost Intelligence (Admin)
  async getAiCostSummary(merchantId?: string) {
    const url = merchantId ? `/api/admin/ai/usage/${merchantId}` : `/api/admin/ai/cost-summary`;
    const res = await safeFetchJson<any>(url);
    return res.data;
  },
};
