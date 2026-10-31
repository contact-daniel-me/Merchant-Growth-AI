import test from 'node:test';
import assert from 'node:assert';
import { MonetizationService } from '../src/server/services/monetizationService.ts';
import { ActionService } from '../src/server/services/actionService.ts';
import { AppDatabase } from '../src/server/db/database.ts';

test('MonetizationService: Manages subscriptions and tier upgrades', () => {
  AppDatabase.getDB();
  const sub = MonetizationService.getSubscription('mer_sharma_kirana');
  assert.ok(sub.currentPlan, 'Should return active subscription plan');
  assert.strictEqual(sub.availablePlans.length, 3, 'Should list Free, Premium, Business Pro');

  const upgraded = MonetizationService.upgradeSubscription('mer_sharma_kirana', 'BUSINESS_PRO');
  assert.strictEqual(upgraded.currentPlan.planTier, 'BUSINESS_PRO');
  assert.strictEqual(upgraded.currentPlan.monthlyFee, 349);
});

test('MonetizationService: Enforces consent on loan discovery applications', () => {
  AppDatabase.getDB();
  const loanInfo = MonetizationService.getLoanProducts('mer_sharma_kirana');
  assert.ok(loanInfo.partners.length >= 3, 'Should list RBI registered partners');
  assert.ok(loanInfo.disclaimer.includes('REGULATORY NOTICE'), 'Must display legal underwriting disclaimer');

  // Must reject without consent
  assert.throws(() => {
    MonetizationService.applyForLoan('mer_sharma_kirana', {
      productId: 'LPROD-01',
      requestedAmount: 50000,
      tenureMonths: 6,
      consentGiven: false,
    });
  }, /consent is legally required/i);

  // Must accept with consent
  const app = MonetizationService.applyForLoan('mer_sharma_kirana', {
    productId: 'LPROD-01',
    requestedAmount: 50000,
    tenureMonths: 6,
    consentGiven: true,
  });
  assert.strictEqual(app.status, 'SUBMITTED');
  assert.ok(app.partnerReferenceId);
});

test('ActionService: Implements sensitive operation review and execution workflow', () => {
  AppDatabase.getDB();
  const created = ActionService.createAction('mer_sharma_kirana', {
    type: 'CUSTOMER_CREDIT_REMINDER',
    title: 'Test Reminder',
    description: 'Test Description',
    payload: { customerId: 'KHATA-001', amount: 500 },
  });

  assert.ok(created);
  assert.strictEqual(created.status, 'PENDING_APPROVAL');

  const executed = ActionService.updateActionStatus('mer_sharma_kirana', created.id, 'EXECUTED', 'Sunil Sharma');
  assert.strictEqual(executed?.status, 'EXECUTED');
  assert.ok(executed?.executedAt);
});
