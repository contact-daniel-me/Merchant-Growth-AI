import test from 'node:test';
import assert from 'node:assert';
import { PaytmClient } from '../src/server/integrations/paytm/client.ts';
import { PaytmWebhookHandler } from '../src/server/integrations/paytm/webhooks.ts';
import { AppDatabase } from '../src/server/db/database.ts';

test('PaytmClient: Signs and validates signatures using constant-time HMAC-SHA256', () => {
  const payload = JSON.stringify({ orderId: 'ORD-1234', amount: 500 });
  const key = 'test-merchant-secret-key-123';
  const sig = PaytmClient.generateSignature(payload, key);

  assert.ok(sig, 'Should generate valid base64 signature');
  const valid = PaytmClient.verifySignature(payload, sig, key);
  assert.strictEqual(valid, true, 'Valid signature must verify');

  const invalid = PaytmClient.verifySignature(payload, sig, 'different-key');
  assert.strictEqual(invalid, false, 'Signature with different key must fail');
});

test('PaytmWebhookHandler: Enforces idempotency on duplicate events', () => {
  AppDatabase.getDB();
  const eventId = `EVT-IDEMP-${Date.now()}`;
  const payload = {
    eventId,
    eventType: 'PAYMENT_SUCCESS' as const,
    merchantId: 'mer_sharma_kirana',
    timestamp: new Date().toISOString(),
    signature: 'DEV_TEST_SIGNATURE',
    data: {
      orderId: 'ORD-TEST-IDEMP',
      amount: 450,
      paymentMethod: 'SOUNDBOX_UPI',
      customerName: 'Test Payer',
    },
  };

  const firstRun = PaytmWebhookHandler.handleWebhook(payload);
  assert.strictEqual(firstRun.status, 'PROCESSED');

  const secondRun = PaytmWebhookHandler.handleWebhook(payload);
  assert.strictEqual(secondRun.status, 'IGNORED_DUPLICATE', 'Duplicate event must be ignored idempotently');
});
