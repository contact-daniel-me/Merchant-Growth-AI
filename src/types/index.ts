/**
 * Paytm Merchant Intelligence - Data Contracts & Types
 */

export type IndianLanguage = 'en' | 'hi' | 'ta' | 'kn' | 'te';

export interface LanguageConfig {
  code: IndianLanguage;
  label: string;
  nativeLabel: string;
  sarvamCode: string;
  sampleGreeting: string;
}

export interface MerchantProfile {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessCategory: 'Groceries & Kirana' | 'Apparel & Textiles' | 'Food & Beverage' | 'Electronics & Retail' | 'Healthcare & Pharmacy';
  gstin: string;
  pan: string;
  mid: string; // Merchant ID
  terminalId: string;
  primaryLanguage: IndianLanguage;
  settlementAccount: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
  };
  deviceInfo: {
    soundboxSerial: string;
    soundboxModel: string;
    batteryLevel: number;
    networkStatus: 'ONLINE' | 'STANDBY' | 'LOW_SIGNAL';
    soundVolume: number;
    languageAnnouncement: IndianLanguage;
  };
  subscription: {
    planName: string;
    monthlyFee: number;
    billingCycle: string;
    activeSince: string;
    status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE';
  };
  role: 'OWNER' | 'STORE_MANAGER' | 'CASHIER';
}

export type PaymentMethod = 'UPI_QR' | 'SOUNDBOX_UPI' | 'RUPAY_CARD' | 'VISA_MASTERCARD' | 'PAYTM_WALLET' | 'NET_BANKING';

export type TransactionStatus = 'SUCCESS' | 'SETTLED' | 'PENDING_SETTLEMENT' | 'REFUNDED' | 'FAILED' | 'DISPUTED';

export interface Transaction {
  id: string;
  merchantId: string;
  orderId: string;
  amount: number;
  feeMdr: number;
  gstOnMdr: number;
  netSettlementAmount: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerVpa?: string;
  timestamp: string;
  status: TransactionStatus;
  settlementBatchId?: string;
  isFlaggedForDiscrepancy?: boolean;
  discrepancyReason?: string;
}

export interface SettlementBatch {
  id: string;
  merchantId: string;
  settlementDate: string;
  grossAmount: number;
  totalMdrFee: number;
  totalGst: number;
  netDisbursedAmount: number;
  bankAccount: string;
  utrNumber: string;
  status: 'SETTLED' | 'IN_TRANSIT' | 'PARTIAL' | 'DELAYED' | 'DISPUTED';
  transactionCount: number;
  expectedDisbursementTime: string;
  actualDisbursementTime?: string;
  varianceAmount?: number;
  varianceNote?: string;
}

export interface CashFlowDay {
  date: string;
  collections: number;
  settlementsReceived: number;
  loanEmiDeduction: number;
  projectedCollections?: number;
  isForecast?: boolean;
  confidenceInterval?: {
    min: number;
    max: number;
  };
}

export interface CustomerCreditRecord {
  id: string;
  merchantId: string;
  customerName: string;
  customerPhone: string;
  outstandingBalance: number;
  totalCreditGiven: number;
  totalRepaid: number;
  lastPurchaseDate: string;
  dueDate: string;
  status: 'CURRENT' | 'OVERDUE' | 'HIGH_RISK';
  notes?: string;
  lastReminderSentDate?: string;
}

export interface GrowthInsight {
  id: string;
  merchantId: string;
  title: string;
  category: 'PEAK_HOURS' | 'BASKET_SIZE' | 'REPEAT_CUSTOMER' | 'FESTIVAL_OPPORTUNITY' | 'PROMOTIONAL_OFFER';
  summary: string;
  evidence: string;
  suggestedAction: string;
  projectedLift: string;
  assumptions: string;
  confidenceScore: number; // 0-100%
  status: 'NEW' | 'ACTIONED' | 'DISMISSED';
}

export type ActionStatus = 'DRAFT' | 'IN_REVIEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'REJECTED';

export type ActionType =
  | 'SETTLEMENT_INVESTIGATION'
  | 'PAYMENT_DISPUTE'
  | 'CUSTOMER_CREDIT_REMINDER'
  | 'PROMOTIONAL_CAMPAIGN'
  | 'BUSINESS_REPORT'
  | 'SOUNDBOX_LANGUAGE_UPDATE';

export interface MerchantAction {
  id: string;
  merchantId: string;
  type: ActionType;
  title: string;
  description: string;
  status: ActionStatus;
  requiresApproval: boolean;
  createdBy: 'VOICE_AGENT' | 'MERCHANT' | 'SYSTEM_ALERT';
  createdAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  executedAt?: string;
  payload: Record<string, any>;
  resultSummary?: string;
}

export interface AuditLogEntry {
  id: string;
  merchantId: string;
  actionId?: string;
  actor: string;
  role: string;
  eventType: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  immutableHash: string;
}

export interface DailyBriefing {
  id: string;
  merchantId: string;
  date: string;
  language: IndianLanguage;
  todayCollections: number;
  todayTransactions: number;
  settlementStatus: string;
  settledAmount: number;
  pendingAmount: number;
  refundsCount: number;
  refundsAmount: number;
  exceptionsNotice: string;
  cashFlowHighlight: string;
  creditOverdueSummary: string;
  keyGrowthOpportunity: string;
  spokenAudioText: string;
  audioDurationSeconds: number;
}

export interface AgentChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  language?: IndianLanguage;
  timestamp: string;
  isVoiceInput?: boolean;
  thoughtTrace?: {
    agentName: string;
    intentIdentified: string;
    toolInvoked?: string;
    deterministicVerification?: string;
  };
  actionCard?: MerchantAction;
}
