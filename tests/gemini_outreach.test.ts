import test from 'node:test';
import assert from 'node:assert';
import { AppDatabase } from '../src/server/db/database.ts';
import { GeminiAnalyticsService } from '../src/server/services/geminiAnalyticsService.ts';
import { OutboundCallService } from '../src/server/services/sarvam/outboundCallService.ts';
import { DataSanitizer } from '../src/server/services/dataSanitizer.ts';

test('DataSanitizer: Enforces valid Indian phone numbers and masks PII', () => {
  const clean = DataSanitizer.sanitizePhone('9845012890');
  assert.strictEqual(clean, '+91 98450 12890');

  const masked = DataSanitizer.maskPhone('9845012890');
  assert.strictEqual(masked, '+91 98*** **890');

  assert.throws(() => DataSanitizer.sanitizePhone('12345'), /Must be 10 digits/);
});

test('DataSanitizer: Validates positive financial amounts and UPI VPAs', () => {
  const amt = DataSanitizer.sanitizeAmount('1250.75');
  assert.strictEqual(amt, 1250.75);

  assert.throws(() => DataSanitizer.sanitizeAmount('-100'), /Must be a non-negative finite number/);

  const vpa = DataSanitizer.sanitizeVpa('customer@paytm');
  assert.strictEqual(vpa, 'customer@paytm');
});

test('GeminiAnalyticsService: Analyzes actual merchant ledger metrics and outputs structured insights', async () => {
  AppDatabase.getDB();
  const report = await GeminiAnalyticsService.generateMerchantInsights('mer_sharma_kirana', 'en');

  assert.strictEqual(report.merchantId, 'mer_sharma_kirana');
  assert.ok(report.businessHealthScore >= 0 && report.businessHealthScore <= 100);
  assert.ok(report.insights.length >= 2, 'Should generate at least 2 structured insights');
  assert.ok(report.metricsSnapshot.todayGrossCollections > 0);

  // Outreach targets
  assert.ok(Array.isArray(report.outreachTargets));
  if (report.outreachTargets.length > 0) {
    const firstTarget = report.outreachTargets[0];
    assert.ok(firstTarget.customerName);
    assert.ok(firstTarget.recommendedCallScript.includes('rupees') || firstTarget.recommendedCallScript.includes('₹'));
  }
});

test('OutboundCallService: Dispatches automated customer voice call with audit logging', async () => {
  AppDatabase.getDB();
  const call = await OutboundCallService.dispatchCustomerCall({
    merchantId: 'mer_sharma_kirana',
    recipientName: 'Ramesh Kumar',
    recipientPhone: '+91 98450 12890',
    callPurpose: 'PAYMENT_REMINDER',
    language: 'en',
    scriptText: 'Hello Ramesh, this is a payment reminder for ₹800 with Sharma General Store.',
  });

  assert.strictEqual(call.callStatus, 'COMPLETED');
  assert.strictEqual(call.recipientName, 'Ramesh Kumar');

  // Verify call record in database
  const calls = OutboundCallService.getCalls('mer_sharma_kirana');
  const found = calls.find((c) => c.id === call.id);
  assert.ok(found, 'Call must be saved in customer_voice_calls table');
  assert.strictEqual(found.recipientName, 'Ramesh Kumar');
});
