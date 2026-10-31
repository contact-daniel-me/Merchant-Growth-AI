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
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
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
    const res = await safeFetchJson<FinancialOverviewReport>(`/api/overview/${merchantId}`);
    if (res.success && res.data) {
      return res.data;
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
    const res = await safeFetchJson<{ settlements: SettlementBatch[]; reconciliation: any }>(`/api/settlements/${merchantId}`);
    if (res.success && res.data) {
      return res.data;
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
  async getBriefings(merchantId: string): Promise<DailyBriefing[]> {
    const res = await safeFetchJson<DailyBriefing[]>(`/api/briefings/${merchantId}`);
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
    });
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

  async voiceTTS(text: string, language: IndianLanguage = 'en', speaker?: string): Promise<{ success: boolean; audioBase64: string | null; text: string }> {
    const res = await safeFetchJson<{ audioBase64: string | null; text: string }>('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, speaker }),
    }, 10000);

    if (res.success && res.data) {
      return { success: true, audioBase64: res.data.audioBase64, text };
    }
    return { success: false, audioBase64: null, text };
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
    const res = await safeFetchJson<any>(`/api/monetization/subscriptions/${merchantId}`);
    return res.data;
  },

  async upgradeSubscription(merchantId: string, planTier: string) {
    const res = await safeFetchJson<any>(`/api/monetization/subscriptions/${merchantId}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planTier }),
    });
    return res.data;
  },

  // 14. Loan Discovery (Paytm Monetization 2)
  async getLoanProducts(merchantId: string) {
    const res = await safeFetchJson<any>(`/api/monetization/loans/${merchantId}`);
    return res.data;
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
    });
    return res.data;
  },

  // 15. Marketing Campaigns (Paytm Monetization 3)
  async getCampaigns(merchantId: string) {
    const res = await safeFetchJson<any>(`/api/monetization/campaigns/${merchantId}`);
    return res.data;
  },

  async createCampaign(merchantId: string, payload: any) {
    const res = await safeFetchJson<any>(`/api/monetization/campaigns/${merchantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async approveCampaign(merchantId: string, campaignId: string, approverName?: string) {
    const res = await safeFetchJson<any>(`/api/monetization/campaigns/${merchantId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, approverName }),
    });
    return res.data;
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
};
