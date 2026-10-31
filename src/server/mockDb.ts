import {
  MerchantProfile,
  Transaction,
  SettlementBatch,
  CustomerCreditRecord,
  GrowthInsight,
  MerchantAction,
  AuditLogEntry,
  DailyBriefing,
} from '../types/index.ts';

// 3 Synthetic Merchants for Strict Multi-Tenant Isolation
export const SEED_MERCHANTS: Record<string, MerchantProfile> = {
  'mer_sharma_kirana': {
    id: 'mer_sharma_kirana',
    businessName: 'Sharma General Store & Kirana',
    ownerName: 'Sunil Sharma',
    email: 'sunil.sharma@kirana.in',
    phone: '+91 98450 12890',
    businessCategory: 'Groceries & Kirana',
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    mid: 'PAYTM_MID_982143',
    terminalId: 'POS_TID_882910',
    primaryLanguage: 'hi',
    settlementAccount: {
      bankName: 'State Bank of India',
      accountNumber: '•••• •••• 4092',
      ifsc: 'SBIN0001824',
      accountHolder: 'Sharma General Store',
    },
    deviceInfo: {
      soundboxSerial: 'SBX-4G-99214',
      soundboxModel: 'Paytm Soundbox 4G Pro (Voice + Display)',
      batteryLevel: 94,
      networkStatus: 'ONLINE',
      soundVolume: 8,
      languageAnnouncement: 'hi',
    },
    subscription: {
      planName: 'Paytm All-In-One Soundbox Pro',
      monthlyFee: 125,
      billingCycle: 'Monthly (Auto-deducted)',
      activeSince: '2023-04-15',
      status: 'ACTIVE',
    },
    role: 'OWNER',
  },
  'mer_priya_textiles': {
    id: 'mer_priya_textiles',
    businessName: 'Priya Silks & Ethnic Textiles',
    ownerName: 'Priya Rajendran',
    email: 'priya@priyasilks.com',
    phone: '+91 94440 98123',
    businessCategory: 'Apparel & Textiles',
    gstin: '33AABCT8921P1ZG',
    pan: 'AABCT8921P',
    mid: 'PAYTM_MID_663019',
    terminalId: 'POS_TID_441209',
    primaryLanguage: 'ta',
    settlementAccount: {
      bankName: 'HDFC Bank',
      accountNumber: '•••• •••• 8821',
      ifsc: 'HDFC0000240',
      accountHolder: 'Priya Silks Chennai',
    },
    deviceInfo: {
      soundboxSerial: 'SBX-4G-77103',
      soundboxModel: 'Paytm Soundbox 4G Music Pro',
      batteryLevel: 88,
      networkStatus: 'ONLINE',
      soundVolume: 9,
      languageAnnouncement: 'ta',
    },
    subscription: {
      planName: 'Paytm Merchant Premium Business',
      monthlyFee: 299,
      billingCycle: 'Monthly',
      activeSince: '2022-11-01',
      status: 'ACTIVE',
    },
    role: 'OWNER',
  },
  'mer_cafe_bengaluru': {
    id: 'mer_cafe_bengaluru',
    businessName: 'Cafe Bengaluru Quick Bites',
    ownerName: 'Karthik Gowda',
    email: 'orders@cafebengaluru.in',
    phone: '+91 98801 44521',
    businessCategory: 'Food & Beverage',
    gstin: '29AAACG7721L1ZK',
    pan: 'AAACG7721L',
    mid: 'PAYTM_MID_310892',
    terminalId: 'POS_TID_119280',
    primaryLanguage: 'kn',
    settlementAccount: {
      bankName: 'Canara Bank',
      accountNumber: '•••• •••• 1152',
      ifsc: 'CNRB0001048',
      accountHolder: 'Cafe Bengaluru Enterprise',
    },
    deviceInfo: {
      soundboxSerial: 'SBX-4G-66419',
      soundboxModel: 'Paytm Soundbox Pocket Plus',
      batteryLevel: 76,
      networkStatus: 'ONLINE',
      soundVolume: 7,
      languageAnnouncement: 'kn',
    },
    subscription: {
      planName: 'Paytm Smart POS Starter',
      monthlyFee: 99,
      billingCycle: 'Monthly',
      activeSince: '2024-01-10',
      status: 'ACTIVE',
    },
    role: 'OWNER',
  },
};

// Generate realistic seeded transactions for Sharma Kirana
function generateSharmaTransactions(): Transaction[] {
  const txns: Transaction[] = [
    {
      id: 'TXN-9021',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9021',
      amount: 450,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 450,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Aarav Verma',
      customerVpa: 'aarav@okaxis',
      timestamp: '2026-10-30T21:45:10Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9020',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9020',
      amount: 1250,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 1250,
      paymentMethod: 'UPI_QR',
      customerName: 'Deepak Rao',
      customerVpa: 'deepak.rao@paytm',
      timestamp: '2026-10-30T21:12:00Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9019',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9019',
      amount: 2800,
      feeMdr: 28,
      gstOnMdr: 5.04,
      netSettlementAmount: 2766.96,
      paymentMethod: 'RUPAY_CARD',
      customerName: 'Meera Iyer',
      customerVpa: 'meera.card@hdfc',
      timestamp: '2026-10-30T20:30:15Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9018',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9018',
      amount: 85,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 85,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Sanjay Kumar',
      customerVpa: 'sanjay@icici',
      timestamp: '2026-10-30T19:55:00Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9017',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9017',
      amount: 620,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 620,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Anita Roy',
      customerVpa: 'anitaroy@oksbi',
      timestamp: '2026-10-30T19:10:40Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9016',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9016',
      amount: 340,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 0,
      paymentMethod: 'UPI_QR',
      customerName: 'Kunal Sen',
      customerVpa: 'kunal@ybl',
      timestamp: '2026-10-30T18:22:10Z',
      status: 'REFUNDED',
      discrepancyReason: 'Customer billed twice due to network timeout. Immediate merchant refund initiated.',
    },
    {
      id: 'TXN-9015',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9015',
      amount: 3200,
      feeMdr: 32,
      gstOnMdr: 5.76,
      netSettlementAmount: 3162.24,
      paymentMethod: 'VISA_MASTERCARD',
      customerName: 'Vikram Joshi',
      customerVpa: 'vikram@axis',
      timestamp: '2026-10-30T17:40:00Z',
      status: 'PENDING_SETTLEMENT',
      isFlaggedForDiscrepancy: true,
      discrepancyReason: 'Card settlement pending acquiring bank batch capture (EOD cut-off at 23:00)',
    },
    {
      id: 'TXN-9014',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9014',
      amount: 190,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 190,
      paymentMethod: 'PAYTM_WALLET',
      customerName: 'Pooja Nair',
      customerVpa: 'pooja.n@paytm',
      timestamp: '2026-10-30T16:15:30Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9013',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9013',
      amount: 1540,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 1540,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Ramesh Gupta',
      customerVpa: 'ramesh@oksbi',
      timestamp: '2026-10-30T15:02:11Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9012',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9012',
      amount: 510,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 510,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Farhan Ali',
      customerVpa: 'farhan@okhdfcbank',
      timestamp: '2026-10-30T13:45:00Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9011',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9011',
      amount: 4200,
      feeMdr: 42,
      gstOnMdr: 7.56,
      netSettlementAmount: 4150.44,
      paymentMethod: 'RUPAY_CARD',
      customerName: 'Shalini Mathur',
      customerVpa: 'shalini@icici',
      timestamp: '2026-10-30T11:20:00Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9010',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9010',
      amount: 75,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 75,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Anil Tyagi',
      customerVpa: 'aniltyagi@upi',
      timestamp: '2026-10-30T10:10:00Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9009',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9009',
      amount: 980,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 980,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Gaurav Gill',
      customerVpa: 'ggill@okaxis',
      timestamp: '2026-10-30T09:30:00Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    {
      id: 'TXN-9008',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-9008',
      amount: 250,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 250,
      paymentMethod: 'PAYTM_WALLET',
      customerName: 'Neha Kapoor',
      customerVpa: 'neha.k@paytm',
      timestamp: '2026-10-30T08:50:00Z',
      status: 'SUCCESS',
      settlementBatchId: 'SETTLE-TODAY-01',
    },
    // Yesterday and earlier records
    {
      id: 'TXN-8995',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-8995',
      amount: 4500,
      feeMdr: 45,
      gstOnMdr: 8.1,
      netSettlementAmount: 4446.9,
      paymentMethod: 'RUPAY_CARD',
      customerName: 'Sunita Devi',
      customerVpa: 'sunita@sbi',
      timestamp: '2026-10-29T18:40:00Z',
      status: 'SETTLED',
      settlementBatchId: 'SETTLE-YEST-01',
    },
    {
      id: 'TXN-8994',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-8994',
      amount: 1800,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 1800,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Ramesh Kumar',
      customerVpa: 'ramesh@okaxis',
      timestamp: '2026-10-29T17:15:00Z',
      status: 'SETTLED',
      settlementBatchId: 'SETTLE-YEST-01',
    },
    {
      id: 'TXN-8980',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-8980',
      amount: 500,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 500,
      paymentMethod: 'UPI_QR',
      customerName: 'Tarun Singh',
      customerVpa: 'tarun@paytm',
      timestamp: '2026-10-28T14:10:00Z',
      status: 'SETTLED',
      settlementBatchId: 'SETTLE-28OCT-01',
    },
    {
      id: 'TXN-8975',
      merchantId: 'mer_sharma_kirana',
      orderId: 'ORD-2026-8975',
      amount: 1100,
      feeMdr: 0,
      gstOnMdr: 0,
      netSettlementAmount: 1100,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Alok Sharma',
      customerVpa: 'alok@oksbi',
      timestamp: '2026-10-27T19:05:00Z',
      status: 'DISPUTED',
      settlementBatchId: 'SETTLE-27OCT-DELAYED',
      isFlaggedForDiscrepancy: true,
      discrepancyReason: 'Settlement withheld by partner sponsor bank due to UTR reconciliation timeout. Dispute investigation raised.',
    },
  ];
  return txns;
}

// Seeded settlement batches
export const SEED_SETTLEMENTS: Record<string, SettlementBatch[]> = {
  'mer_sharma_kirana': [
    {
      id: 'SETTLE-TODAY-01',
      merchantId: 'mer_sharma_kirana',
      settlementDate: '2026-10-30',
      grossAmount: 15990,
      totalMdrFee: 102,
      totalGst: 18.36,
      netDisbursedAmount: 15869.64,
      bankAccount: 'SBI •••• 4092',
      utrNumber: 'CMS20261030099412',
      status: 'IN_TRANSIT',
      transactionCount: 13,
      expectedDisbursementTime: '2026-10-30T23:30:00Z',
      varianceAmount: 0,
      varianceNote: 'All Soundbox & UPI collections matched; Card capture batch queued.',
    },
    {
      id: 'SETTLE-YEST-01',
      merchantId: 'mer_sharma_kirana',
      settlementDate: '2026-10-29',
      grossAmount: 24800,
      totalMdrFee: 145,
      totalGst: 26.1,
      netDisbursedAmount: 24628.9,
      bankAccount: 'SBI •••• 4092',
      utrNumber: 'CMS20261029088219',
      status: 'SETTLED',
      transactionCount: 22,
      expectedDisbursementTime: '2026-10-29T23:30:00Z',
      actualDisbursementTime: '2026-10-29T23:28:15Z',
      varianceAmount: 0,
      varianceNote: 'Fully reconciled with zero variance.',
    },
    {
      id: 'SETTLE-28OCT-01',
      merchantId: 'mer_sharma_kirana',
      settlementDate: '2026-10-28',
      grossAmount: 21450,
      totalMdrFee: 110,
      totalGst: 19.8,
      netDisbursedAmount: 21320.2,
      bankAccount: 'SBI •••• 4092',
      utrNumber: 'CMS20261028077192',
      status: 'SETTLED',
      transactionCount: 19,
      expectedDisbursementTime: '2026-10-28T23:30:00Z',
      actualDisbursementTime: '2026-10-28T23:31:02Z',
      varianceAmount: 0,
      varianceNote: 'Matched with core banking ledger.',
    },
    {
      id: 'SETTLE-27OCT-DELAYED',
      merchantId: 'mer_sharma_kirana',
      settlementDate: '2026-10-27',
      grossAmount: 18900,
      totalMdrFee: 85,
      totalGst: 15.3,
      netDisbursedAmount: 17800, // Discrepancy: 1,100 INR missing
      bankAccount: 'SBI •••• 4092',
      utrNumber: 'CMS20261027044199',
      status: 'PARTIAL',
      transactionCount: 16,
      expectedDisbursementTime: '2026-10-27T23:30:00Z',
      actualDisbursementTime: '2026-10-28T02:15:00Z',
      varianceAmount: 999.7,
      varianceNote: 'Partial settlement detected. ₹1,100 gross (TXN-8975) withheld by clearing house. Action initiated.',
    },
  ],
  'mer_priya_textiles': [
    {
      id: 'SETTLE-PT-TODAY',
      merchantId: 'mer_priya_textiles',
      settlementDate: '2026-10-30',
      grossAmount: 48900,
      totalMdrFee: 489,
      totalGst: 88.02,
      netDisbursedAmount: 48322.98,
      bankAccount: 'HDFC •••• 8821',
      utrNumber: 'CMS20261030011928',
      status: 'IN_TRANSIT',
      transactionCount: 9,
      expectedDisbursementTime: '2026-10-30T23:30:00Z',
    },
  ],
  'mer_cafe_bengaluru': [
    {
      id: 'SETTLE-CB-TODAY',
      merchantId: 'mer_cafe_bengaluru',
      settlementDate: '2026-10-30',
      grossAmount: 12400,
      totalMdrFee: 62,
      totalGst: 11.16,
      netDisbursedAmount: 12326.84,
      bankAccount: 'Canara •••• 1152',
      utrNumber: 'CMS20261030033481',
      status: 'IN_TRANSIT',
      transactionCount: 38,
      expectedDisbursementTime: '2026-10-30T23:30:00Z',
    },
  ],
};

// Seeded Customer Khata / Credit records
export const SEED_CREDIT_RECORDS: Record<string, CustomerCreditRecord[]> = {
  'mer_sharma_kirana': [
    {
      id: 'KHATA-01',
      merchantId: 'mer_sharma_kirana',
      customerName: 'Ramesh Kumar (Gali No. 4)',
      customerPhone: '+91 98112 34567',
      outstandingBalance: 3450,
      totalCreditGiven: 12500,
      totalRepaid: 9050,
      lastPurchaseDate: '2026-10-18',
      dueDate: '2026-10-25',
      status: 'OVERDUE',
      notes: 'Monthly grocery ration bill. Promised to clear by 25th after salary credit.',
      lastReminderSentDate: '2026-10-26',
    },
    {
      id: 'KHATA-02',
      merchantId: 'mer_sharma_kirana',
      customerName: 'Sunita Devi (Block B-12)',
      customerPhone: '+91 99201 88722',
      outstandingBalance: 1850,
      totalCreditGiven: 6400,
      totalRepaid: 4550,
      lastPurchaseDate: '2026-10-22',
      dueDate: '2026-10-29',
      status: 'OVERDUE',
      notes: 'Dairy & dry grocery supplies. Regular customer for 4 years.',
    },
    {
      id: 'KHATA-03',
      merchantId: 'mer_sharma_kirana',
      customerName: 'Ananya Patel (Apt 402)',
      customerPhone: '+91 97410 55219',
      outstandingBalance: 920,
      totalCreditGiven: 4200,
      totalRepaid: 3280,
      lastPurchaseDate: '2026-10-28',
      dueDate: '2026-11-05',
      status: 'CURRENT',
      notes: 'Weekly pantry replenishment.',
    },
    {
      id: 'KHATA-04',
      merchantId: 'mer_sharma_kirana',
      customerName: 'Rajesh Verma (Sweet Shop Owner)',
      customerPhone: '+91 98200 11984',
      outstandingBalance: 5800,
      totalCreditGiven: 22000,
      totalRepaid: 16200,
      lastPurchaseDate: '2026-09-28',
      dueDate: '2026-10-10',
      status: 'HIGH_RISK',
      notes: 'Bulk flour and sugar purchases. 20 days overdue. Requires polite in-person or WhatsApp reminder.',
      lastReminderSentDate: '2026-10-20',
    },
  ],
};

// Growth Recommendations
export const SEED_GROWTH_INSIGHTS: Record<string, GrowthInsight[]> = {
  'mer_sharma_kirana': [
    {
      id: 'GROWTH-01',
      merchantId: 'mer_sharma_kirana',
      title: 'Monetize Evening Peak Rush (6:30 PM - 9:00 PM)',
      category: 'PEAK_HOURS',
      summary: '68% of daily collections happen in a 2.5-hour window with 42 avg transactions/hr.',
      evidence: 'Ledger shows 54 transactions between 18:30 and 21:00 with average ticket ₹380, compared to ₹140 during 12:00-16:00.',
      suggestedAction: 'Deploy a express snack & dairy quick-checkout QR counter to reduce customer queue abandonment.',
      projectedLift: '+14% higher throughput, estimated ₹2,400 incremental daily collection',
      assumptions: 'Assumes peak line wait drops by 45 seconds per buyer during evening rush.',
      confidenceScore: 89,
      status: 'NEW',
    },
    {
      id: 'GROWTH-02',
      merchantId: 'mer_sharma_kirana',
      title: 'Weekend Festival Essentials Combo Promotion',
      category: 'FESTIVAL_OPPORTUNITY',
      summary: 'Upcoming Diwali festival weekend historically boosts confectionery and dry fruit demand by 2.4x.',
      evidence: 'Same period last year recorded 112 UPI transactions over ₹1,000 for festive gift packs.',
      suggestedAction: 'Send a Paytm Merchant WhatsApp flyer: 5% cashback on prepaid orders over ₹1,500 using Paytm UPI QR.',
      projectedLift: '+₹18,500 weekend revenue with an estimated ₹925 promotional subsidy',
      assumptions: 'Assumes 35% repeat customer response based on historic festive campaigns.',
      confidenceScore: 92,
      status: 'NEW',
    },
    {
      id: 'GROWTH-03',
      merchantId: 'mer_sharma_kirana',
      title: 'Khata Outstanding Recovery Automation',
      category: 'REPEAT_CUSTOMER',
      summary: '₹12,020 tied up in customer credit, of which ₹11,100 is over 7 days past due.',
      evidence: '4 customers have balances past agreed dates; collection cycle has stretched from 12 to 24 days.',
      suggestedAction: 'Send friendly payment link via SMS/WhatsApp with direct Paytm UPI payment intent.',
      projectedLift: 'Immediate recovery of ₹6,200 within 48 hours without friction',
      assumptions: 'Standard 55% recovery rate upon single polite digital reminder with UPI link.',
      confidenceScore: 94,
      status: 'NEW',
    },
  ],
};

// Initial merchant actions in the lifecycle
export const SEED_ACTIONS: Record<string, MerchantAction[]> = {
  'mer_sharma_kirana': [
    {
      id: 'ACT-101',
      merchantId: 'mer_sharma_kirana',
      type: 'SETTLEMENT_INVESTIGATION',
      title: 'Investigate ₹1,100 Settlement Variance (Batch 27-Oct)',
      description: 'Reconcile UTR CMS20261027044199 with SBI sponsor clearing house for order ORD-2026-8975.',
      status: 'PENDING_APPROVAL',
      requiresApproval: true,
      createdBy: 'VOICE_AGENT',
      createdAt: '2026-10-30T10:15:00Z',
      payload: {
        batchId: 'SETTLE-27OCT-DELAYED',
        discrepancyAmount: 1100,
        utr: 'CMS20261027044199',
        reason: 'Missing settlement credit for Soundbox UPI transaction',
      },
    },
    {
      id: 'ACT-102',
      merchantId: 'mer_sharma_kirana',
      type: 'CUSTOMER_CREDIT_REMINDER',
      title: 'Send Khata Due Reminder to Ramesh Kumar',
      description: 'Draft polite WhatsApp reminder for overdue balance ₹3,450 with direct UPI payment QR link.',
      status: 'DRAFT',
      requiresApproval: true,
      createdBy: 'VOICE_AGENT',
      createdAt: '2026-10-30T14:20:00Z',
      payload: {
        customerId: 'KHATA-01',
        customerName: 'Ramesh Kumar',
        phone: '+91 98112 34567',
        amount: 3450,
        dueDays: 5,
      },
    },
    {
      id: 'ACT-100',
      merchantId: 'mer_sharma_kirana',
      type: 'SOUNDBOX_LANGUAGE_UPDATE',
      title: 'Sync Soundbox Announcement Language to Hindi & English Dual',
      description: 'Reconfigure Paytm Soundbox 4G Pro firmware to announce transactions in Hindi followed by English chime.',
      status: 'EXECUTED',
      requiresApproval: false,
      createdBy: 'MERCHANT',
      createdAt: '2026-10-29T09:00:00Z',
      executedAt: '2026-10-29T09:02:11Z',
      payload: {
        deviceId: 'SBX-4G-99214',
        language: 'hi',
      },
      resultSummary: 'Soundbox audio profile updated successfully over air. Test voice chime verified.',
    },
  ],
};

// Seeded immutable audit log
export const SEED_AUDIT_LOGS: Record<string, AuditLogEntry[]> = {
  'mer_sharma_kirana': [
    {
      id: 'AUD-8801',
      merchantId: 'mer_sharma_kirana',
      actionId: 'ACT-100',
      actor: 'Sunil Sharma',
      role: 'OWNER',
      eventType: 'DEVICE_CONFIG_CHANGED',
      details: 'Soundbox announcement voice switched to Hindi (hi) at volume 8.',
      timestamp: '2026-10-29T09:02:11Z',
      ipAddress: '103.44.12.89',
      immutableHash: 'sha256:7b91d3c8a912e84...01',
    },
    {
      id: 'AUD-8802',
      merchantId: 'mer_sharma_kirana',
      actor: 'System Reconciler',
      role: 'SYSTEM',
      eventType: 'DISCREPANCY_DETECTED',
      details: 'Automated EOD check detected variance of ₹1,100 on batch SETTLE-27OCT-DELAYED.',
      timestamp: '2026-10-28T02:16:00Z',
      ipAddress: '10.0.4.18',
      immutableHash: 'sha256:4a02c510f88219...99',
    },
  ],
};

// Seeded Daily Briefings archive
export const SEED_BRIEFINGS: Record<string, DailyBriefing[]> = {
  'mer_sharma_kirana': [
    {
      id: 'BRIEF-2026-10-30',
      merchantId: 'mer_sharma_kirana',
      date: '2026-10-30',
      language: 'hi',
      todayCollections: 19190,
      todayTransactions: 15,
      settlementStatus: '₹15,869.64 बैंक खाते (SBI) में इन-ट्रांजिट है। रात 11:30 बजे क्रेडिट हो जाएगा।',
      settledAmount: 15869.64,
      pendingAmount: 3200,
      refundsCount: 1,
      refundsAmount: 340,
      exceptionsNotice: '1 रिफंड (₹340) ग्राहक को तुरंत वापस किया गया। कोई नया चार्जबैक नहीं।',
      cashFlowHighlight: 'दैनिक लोन EMI ₹350 कटने के बाद कल का शुद्ध नकद प्रवाह ₹18,000+ अनुमानित है।',
      creditOverdueSummary: 'खाता बही में 2 ग्राहकों का कुल ₹5,300 बकाया देय तिथि पार कर चुका है।',
      keyGrowthOpportunity: 'शाम 6:30 से 9:00 बजे के बीच 68% बिक्री हुई। वीकेंड के लिए किराना कॉम्बो ऑफर शुरू कर सकते हैं।',
      spokenAudioText: 'नमस्ते सुनील जी। शर्मा जनरल स्टोर की आज की कुल बिक्री उन्नीस हजार एक सौ नब्बे रुपये रही, जो पंद्रह ट्रांजैक्शन से आई। पंद्रह हजार आठ सौ सत्तर रुपये आपके स्टेट बैंक खाते में आज रात ग्यारह तीस तक जमा हो जाएंगे। खाता बही में रमेश कुमार और सुनीता देवी का पांच हजार तीन सौ रुपये बकाया है।',
      audioDurationSeconds: 32,
    },
    {
      id: 'BRIEF-2026-10-29',
      merchantId: 'mer_sharma_kirana',
      date: '2026-10-29',
      language: 'hi',
      todayCollections: 24800,
      todayTransactions: 22,
      settlementStatus: 'पूर्ण रूप से आपके SBI खाते में सेटल हो गया। UTR CMS20261029088219.',
      settledAmount: 24628.9,
      pendingAmount: 0,
      refundsCount: 0,
      refundsAmount: 0,
      exceptionsNotice: 'शून्य विसंगति, सभी UPI और कार्ड सेटलमेंट 100% मेल खाए।',
      cashFlowHighlight: 'महीने का सबसे अच्छा गुरुवार। पिछले सप्ताह की तुलना में +18% वृद्धि।',
      creditOverdueSummary: '₹12,020 कुल खाता उधारी दर्ज है।',
      keyGrowthOpportunity: 'शाम के समय दाल और कुकिंग ऑयल के बड़े पैक की मांग अधिक रही।',
      spokenAudioText: 'सुनील जी, कल आपकी कुल बिक्री चौबीस हजार आठ सौ रुपये रही। पूरा सेटलमेंट चौबीस हजार छह सौ अट्ठाईस रुपये आपके बैंक खाते में जमा हो चुका है।',
      audioDurationSeconds: 22,
    },
  ],
};

// In-Memory Database store with tenant isolation
class InMemoryMerchantDB {
  private merchants = new Map<string, MerchantProfile>(Object.entries(SEED_MERCHANTS));
  private transactions = new Map<string, Transaction[]>();
  private settlements = new Map<string, SettlementBatch[]>(Object.entries(SEED_SETTLEMENTS));
  private creditRecords = new Map<string, CustomerCreditRecord[]>(Object.entries(SEED_CREDIT_RECORDS));
  private growthInsights = new Map<string, GrowthInsight[]>(Object.entries(SEED_GROWTH_INSIGHTS));
  private actions = new Map<string, MerchantAction[]>(Object.entries(SEED_ACTIONS));
  private auditLogs = new Map<string, AuditLogEntry[]>(Object.entries(SEED_AUDIT_LOGS));
  private briefings = new Map<string, DailyBriefing[]>(Object.entries(SEED_BRIEFINGS));

  constructor() {
    this.transactions.set('mer_sharma_kirana', generateSharmaTransactions());
    this.transactions.set('mer_priya_textiles', [
      {
        id: 'TXN-PT-01',
        merchantId: 'mer_priya_textiles',
        orderId: 'ORD-PT-1001',
        amount: 8500,
        feeMdr: 85,
        gstOnMdr: 15.3,
        netSettlementAmount: 8399.7,
        paymentMethod: 'RUPAY_CARD',
        customerName: 'Lakshmi Narayanan',
        customerVpa: 'lakshmi@axis',
        timestamp: '2026-10-30T18:10:00Z',
        status: 'SUCCESS',
      },
      {
        id: 'TXN-PT-02',
        merchantId: 'mer_priya_textiles',
        orderId: 'ORD-PT-1002',
        amount: 14500,
        feeMdr: 145,
        gstOnMdr: 26.1,
        netSettlementAmount: 14328.9,
        paymentMethod: 'VISA_MASTERCARD',
        customerName: 'Kavitha S.',
        customerVpa: 'kavitha@hdfc',
        timestamp: '2026-10-30T19:25:00Z',
        status: 'SUCCESS',
      },
    ]);
    this.transactions.set('mer_cafe_bengaluru', [
      {
        id: 'TXN-CB-01',
        merchantId: 'mer_cafe_bengaluru',
        orderId: 'ORD-CB-301',
        amount: 180,
        feeMdr: 0,
        gstOnMdr: 0,
        netSettlementAmount: 180,
        paymentMethod: 'SOUNDBOX_UPI',
        customerName: 'Naveen K',
        customerVpa: 'naveen@oksbi',
        timestamp: '2026-10-30T21:10:00Z',
        status: 'SUCCESS',
      },
    ]);
  }

  // Tenant Isolation Helper
  private ensureTenant(merchantId: string) {
    if (!this.merchants.has(merchantId)) {
      throw new Error(`Tenant Isolation Violation: Merchant ID ${merchantId} not found.`);
    }
  }

  getMerchants(): MerchantProfile[] {
    return Array.from(this.merchants.values());
  }

  getMerchant(merchantId: string): MerchantProfile {
    this.ensureTenant(merchantId);
    return this.merchants.get(merchantId)!;
  }

  getTransactions(merchantId: string): Transaction[] {
    this.ensureTenant(merchantId);
    return this.transactions.get(merchantId) || [];
  }

  addTransaction(merchantId: string, txn: Transaction): Transaction {
    this.ensureTenant(merchantId);
    const list = this.transactions.get(merchantId) || [];
    list.unshift(txn);
    this.transactions.set(merchantId, list);
    return txn;
  }

  getSettlements(merchantId: string): SettlementBatch[] {
    this.ensureTenant(merchantId);
    return this.settlements.get(merchantId) || [];
  }

  getCreditRecords(merchantId: string): CustomerCreditRecord[] {
    this.ensureTenant(merchantId);
    return this.creditRecords.get(merchantId) || [];
  }

  getKhata(merchantId: string): CustomerCreditRecord[] {
    return this.getCreditRecords(merchantId);
  }

  addCreditRecord(merchantId: string, record: CustomerCreditRecord): CustomerCreditRecord {
    this.ensureTenant(merchantId);
    const list = this.creditRecords.get(merchantId) || [];
    list.unshift(record);
    this.creditRecords.set(merchantId, list);
    return record;
  }

  getGrowthInsights(merchantId: string): GrowthInsight[] {
    this.ensureTenant(merchantId);
    return this.growthInsights.get(merchantId) || [];
  }

  getActions(merchantId: string): MerchantAction[] {
    this.ensureTenant(merchantId);
    return this.actions.get(merchantId) || [];
  }

  createAction(merchantId: string, action: Omit<MerchantAction, 'id' | 'createdAt'>): MerchantAction {
    this.ensureTenant(merchantId);
    const newAction: MerchantAction = {
      ...action,
      id: `ACT-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const list = this.actions.get(merchantId) || [];
    list.unshift(newAction);
    this.actions.set(merchantId, list);

    this.addAuditLog(merchantId, {
      actor: action.createdBy === 'VOICE_AGENT' ? 'Voice Agent (Sarvam/Gemini)' : 'Merchant User',
      role: 'AGENT',
      eventType: 'ACTION_DRAFTED',
      details: `New action created: ${newAction.title} [Type: ${newAction.type}, Status: ${newAction.status}]`,
      actionId: newAction.id,
    });

    return newAction;
  }

  updateActionStatus(merchantId: string, actionId: string, status: MerchantAction['status'], actor: string): MerchantAction {
    this.ensureTenant(merchantId);
    const list = this.actions.get(merchantId) || [];
    const item = list.find((a) => a.id === actionId);
    if (!item) {
      throw new Error(`Action ${actionId} not found for merchant ${merchantId}`);
    }

    item.status = status;
    const now = new Date().toISOString();
    if (status === 'APPROVED') {
      item.approvedAt = now;
    } else if (status === 'EXECUTED') {
      item.executedAt = now;
      item.resultSummary = `Action executed successfully at ${new Date().toLocaleTimeString('en-IN')}. Target entity notified.`;
    }

    this.addAuditLog(merchantId, {
      actor,
      role: 'OWNER',
      eventType: `ACTION_${status}`,
      details: `Action ${item.title} (${item.id}) status transitioned to ${status}`,
      actionId: item.id,
    });

    return item;
  }

  getAuditLogs(merchantId: string): AuditLogEntry[] {
    this.ensureTenant(merchantId);
    return this.auditLogs.get(merchantId) || [];
  }

  addAuditLog(merchantId: string, entry: Omit<AuditLogEntry, 'id' | 'merchantId' | 'timestamp' | 'ipAddress' | 'immutableHash'>): AuditLogEntry {
    this.ensureTenant(merchantId);
    const newLog: AuditLogEntry = {
      ...entry,
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      merchantId,
      timestamp: new Date().toISOString(),
      ipAddress: '103.21.144.92',
      immutableHash: `sha256:${Math.random().toString(16).substring(2, 10)}${Date.now().toString(16)}`,
    };
    const list = this.auditLogs.get(merchantId) || [];
    list.unshift(newLog);
    this.auditLogs.set(merchantId, list);
    return newLog;
  }

  getBriefings(merchantId: string): DailyBriefing[] {
    this.ensureTenant(merchantId);
    return this.briefings.get(merchantId) || [];
  }

  saveBriefing(merchantId: string, briefing: DailyBriefing) {
    this.ensureTenant(merchantId);
    const list = this.briefings.get(merchantId) || [];
    list.unshift(briefing);
    this.briefings.set(merchantId, list);
  }
}

export const merchantDB = new InMemoryMerchantDB();
