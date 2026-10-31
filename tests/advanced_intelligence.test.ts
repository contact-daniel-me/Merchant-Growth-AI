import test from 'node:test';
import assert from 'node:assert';
import { AppDatabase } from '../src/server/db/database.ts';
import { PaymentVerificationService } from '../src/server/services/paymentVerificationService.ts';
import { MerchantFeeAdvisor } from '../src/server/services/fees/merchantFeeAdvisor.ts';
import { DeviceHealthService } from '../src/server/services/devices/deviceHealthService.ts';
import { RepaymentScenarioEngine } from '../src/server/services/loans/repaymentScenarioEngine.ts';
import { CustomerSegmentationService } from '../src/server/services/marketing/customerSegmentationService.ts';
import { PaymentLinkService } from '../src/server/services/payments/paymentLinkService.ts';
import { FinancialFactVerifier, AuthoritativeFactsPacket } from '../src/server/services/agent/financialFactVerifier.ts';
import { AiCostService } from '../src/server/services/ai/aiCostService.ts';
import { SarvamAgentService } from '../src/server/services/sarvam/agentService.ts';

test('FinancialFactVerifier: Validates Grounded Numbers and Detects Hallucinations', () => {
  const packet: AuthoritativeFactsPacket = {
    intent: 'get_daily_collections',
    toolInvoked: 'get_daily_collections',
    source: 'merchant_sqlite_authoritative_ledger',
    calculatedAt: new Date().toISOString(),
    facts: { collections: 13585, settled: 11784.48, inTransit: 10453.76 },
    allowedAmounts: [13585, 11784.48, 10453.76, 24],
  };

  // 1. Text with strictly grounded numbers
  const groundedText = 'Today you have received ₹13,585 across 24 payments. ₹10,453.76 is scheduled tonight.';
  const res1 = FinancialFactVerifier.verifyAndEnforce(groundedText, packet, 'en');
  assert.strictEqual(res1.isValid, true, 'Grounded numbers must pass verification');
  assert.strictEqual(res1.unverifiedNumbersFound.length, 0, 'No unverified numbers should remain');

  // 2. Text with an ungrounded hallucinated number (e.g. ₹99,999)
  const hallucinatedText = 'Today you have received ₹99,999 across 24 payments.';
  const res2 = FinancialFactVerifier.verifyAndEnforce(hallucinatedText, packet, 'en');
  assert.strictEqual(res2.isValid, false, 'Invented numbers must be flagged as ungrounded');
  assert.ok(res2.unverifiedNumbersFound.includes(99999), '₹99,999 must be recorded in unverifiedNumbersFound');

  // 3. Multilingual spoken currency formatting
  const spoken = FinancialFactVerifier.convertToSpokenIndicators('₹13,585 received', 'en');
  assert.ok(spoken.toLowerCase().includes('rupees'), 'Spoken currency must include rupees');
});

test('PaymentVerificationService: Authoritative Matching, Fraud Warnings, and Status Differentiation', () => {
  AppDatabase.getDB();
  const merchantId = 'mer_sharma_kirana';

  // 1. Match by amount and payer query for existing transaction in ledger
  const resSuccess = PaymentVerificationService.verifyPayment({
    merchantId,
    amount: 1500,
    payerQuery: 'Rajesh',
  });
  assert.strictEqual(resSuccess.verificationStatus, 'CONFIRMED_SUCCESS', 'Existing transaction of ₹1,500 must be verified as CONFIRMED_SUCCESS');
  assert.ok(resSuccess.matchedTransactions.length > 0);
  assert.strictEqual(resSuccess.fraudAssessment.isSuspicious, false);

  // 2. Unverified payment with potential fake screenshot
  const resNotFound = PaymentVerificationService.verifyPayment({
    merchantId,
    amount: 99999,
    payerQuery: 'Fake Payer',
  });
  assert.strictEqual(resNotFound.verificationStatus, 'NOT_FOUND');
  assert.strictEqual(resNotFound.matchedTransactions.length, 0);
  assert.ok(
    resNotFound.spokenSummary.includes('Do not hand over') ||
    resNotFound.fraudAssessment.advisoryNote.includes('screenshot'),
    'Merchant must be warned not to hand over goods on fake screenshot'
  );
});

test('MerchantFeeAdvisor: 2026 UPI MDR Policy Framework and Threshold Exemptions', () => {
  AppDatabase.getDB();
  const merchantId = 'mer_sharma_kirana';

  const assessment = MerchantFeeAdvisor.evaluateMerchantFees(merchantId);
  assert.strictEqual(assessment.merchantId, merchantId);
  assert.ok(typeof assessment.merchantMonthlyVolume === 'number');
  assert.ok(typeof assessment.isSmallMerchantExempt === 'boolean');
  assert.ok(typeof assessment.actualFeesDeducted === 'number');
  assert.ok(typeof assessment.projectedFeesUnder2026Framework === 'number');
  assert.ok(assessment.frameworkStatus.includes('2026') || assessment.frameworkStatus.includes('ZERO'));
});

test('DeviceHealthService: Low Battery Alert, Offline Detection, and Churn Risk Scoring', () => {
  AppDatabase.getDB();
  const merchantId = 'mer_sharma_kirana';

  const health = DeviceHealthService.getDeviceHealth(merchantId);
  assert.strictEqual(health.merchantId, merchantId);
  assert.ok(health.devices.length > 0, 'Merchant must have registered Soundbox devices');
  assert.ok(typeof health.churnRisk.compositeRiskScore === 'number');
  assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(health.churnRisk.churnRiskLevel));
  assert.ok(health.churnRisk.explainableSignals.length > 0, 'Risk factors must be transparently explained');

  // Test support ticket generation
  const ticket = DeviceHealthService.createSupportTicket(merchantId, health.devices[0].serialNumber, 'Low battery diagnostic test');
  assert.ok(ticket.ticketId.startsWith('TCK-'), 'Support ticket ID must start with TCK-');
});

test('RepaymentScenarioEngine: Multi-Tenure Scenarios Eliminating Flat 1.5x Multiplier', () => {
  AppDatabase.getDB();
  const merchantId = 'mer_sharma_kirana';

  const report = RepaymentScenarioEngine.generateScenarios(merchantId);
  assert.strictEqual(report.merchantId, merchantId);
  assert.ok(report.historicalMetrics.averageDailyCollections > 0, 'Must calculate data-driven historical average collections');
  assert.ok(report.scenarios.length >= 2, 'Must generate multi-tenure scenarios');

  for (const s of report.scenarios) {
    assert.ok(s.tenureMonths >= 3 && s.tenureMonths <= 12);
    assert.ok(s.dailyEmiAmount > 0, 'Daily repayment must be calculated');
    assert.ok(['COMFORTABLE', 'MODERATE', 'TIGHT'].includes(s.cashFlowStressLevel));
  }

  // Regulatory disclosure
  assert.ok(
    report.disclaimerNote.includes('educational scenarios') ||
    report.disclaimerNote.includes('disbursed by RBI'),
    'Must explicitly state simulation disclaimer'
  );
});

test('CustomerSegmentationService & WhatsApp Provider Abstraction', () => {
  AppDatabase.getDB();
  const merchantId = 'mer_sharma_kirana';

  // 1. Compute RFM customer segments
  const segments = CustomerSegmentationService.computeSegments(merchantId);
  assert.ok(segments.length >= 3, 'Must compute algorithmic RFM customer segments');
  assert.ok(segments.some((s) => s.segmentCode === 'REGULAR'));
  assert.ok(segments.some((s) => s.segmentCode === 'LAPSED'));
  assert.ok(segments.some((s) => s.segmentCode === 'HIGH_SPEND'));

  // 2. Dispatch approved campaign with honest sandbox reporting
  const dispatch = CustomerSegmentationService.dispatchCampaign({
    merchantId,
    segmentKey: 'LAPSED',
    messageTemplate: 'Special weekend grocery discount for you!',
    approvedBy: 'Sunil Sharma',
  });
  assert.strictEqual(dispatch.deliveryStatus, 'SIMULATED_DISPATCH');
  assert.ok(dispatch.recipientsCount >= 0);
  assert.ok(dispatch.disclaimer.includes('simulation') || dispatch.disclaimer.includes('Sandbox'));
});

test('PaymentLinkService: Authorized Khata Recovery & Autopay Mandates', () => {
  AppDatabase.getDB();
  const merchantId = 'mer_sharma_kirana';

  // 1. Create Khata recovery payment link
  const link = PaymentLinkService.createPaymentLink({
    merchantId,
    customerId: 'cust_m_1',
    customerName: 'Aarav Patel',
    customerPhone: '+91 98765 43210',
    amount: 450,
    purpose: 'Groceries credit clearance',
  });
  assert.ok(link.shortUrl.startsWith('https://merchant.growiota.in/pay/'), 'Payment link must use official format');
  assert.strictEqual(link.amount, 450);
  assert.strictEqual(link.status, 'CREATED');

  // 2. Create UPI Autopay mandate intent
  const mandate = PaymentLinkService.createAutopayMandate({
    merchantId,
    customerId: 'cust_m_1',
    maxAmount: 1000,
    frequency: 'MONTHLY',
  });
  assert.strictEqual(mandate.frequency, 'MONTHLY');
  assert.strictEqual(mandate.status, 'PENDING_AUTH');

  // 3. Autonomous payment execution strictly disabled behind feature flag
  const autonomousAttempt = PaymentLinkService.evaluateAutonomousAgentPayment(merchantId, 500);
  assert.strictEqual(autonomousAttempt.permitted, false);
  assert.ok(autonomousAttempt.reason.toLowerCase().includes('disabled'), 'Autonomous payment execution must be rejected behind feature flag');
});

test('AiCostService: Operating Cost Accounting and Quota Metering', () => {
  AppDatabase.getDB();
  const merchantId = 'mer_sharma_kirana';

  // 1. Record an AI usage event
  const cost = AiCostService.recordUsage({
    merchantId,
    feature: 'VOICE_ASSISTANT',
    modelName: 'gemini-2.0-flash',
    inputTokens: 120,
    outputTokens: 85,
    latencyMs: 340,
    status: 'SUCCESS',
  });
  assert.ok(cost >= 0);

  // 2. Retrieve merchant cost summary
  const summary = AiCostService.getCostSummary(merchantId);
  assert.ok(summary.totalCostInr >= 0);
  assert.ok(summary.totalEventsCount > 0);
  assert.strictEqual(summary.monthlyQuotaInr, 500);
  assert.ok(summary.quotaUsagePercent <= 100);
});

test('SarvamAgentService: Semantic Tool Selection across Diverse Phrasings', async () => {
  AppDatabase.getDB();
  const merchantId = 'mer_sharma_kirana';

  // Query 1: Sales collections in colloquial phrasing
  const q1 = await SarvamAgentService.processVoiceQuery({
    merchantId,
    query: 'how much did i earn today?',
    language: 'en',
  });
  assert.strictEqual(q1.intentIdentified, 'TODAY_COLLECTIONS');
  assert.ok(q1.responseText.includes('Today you have received ₹') || q1.responseText.includes('13,585'), 'Must contain verified SQLite collection data');

  // Query 2: Settlement query
  const q2 = await SarvamAgentService.processVoiceQuery({
    merchantId,
    query: 'why did i receive less money in bank?',
    language: 'en',
  });
  assert.strictEqual(q2.intentIdentified, 'RECONCILE_SETTLEMENTS');
  assert.ok(q2.responseText.includes('₹'), 'Must contain verified settlement numbers');

  // Query 3: Reminder query
  const q3 = await SarvamAgentService.processVoiceQuery({
    merchantId,
    query: 'Send a payment reminder to Aarav',
    language: 'en',
  });
  assert.strictEqual(q3.intentIdentified, 'KHATA_AND_CUSTOMER_DUES');
  assert.ok(q3.actionCard !== undefined);
});
