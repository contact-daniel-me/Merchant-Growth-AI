import test from 'node:test';
import assert from 'node:assert';
import { KhataService } from '../src/server/services/khataService.ts';
import { AppDatabase } from '../src/server/db/database.ts';

test('KhataService: Computes customer dues and classifies overdue status', () => {
  AppDatabase.getDB();
  const overview = KhataService.getKhataOverview('mer_sharma_kirana');

  assert.ok(overview.totalCustomersWithDues >= 4, 'Should list seeded customers');
  assert.ok(overview.totalOutstandingDues > 0, 'Total outstanding should be positive');
  assert.ok(overview.overdueCustomersCount > 0, 'Should detect overdue customers');

  const overdue = overview.customers.find((c) => c.status === 'OVERDUE' || c.status === 'HIGH_RISK');
  assert.ok(overdue, 'Should have overdue customer');
  assert.ok(overdue.daysOverdue >= 0, 'Days overdue should be computed');
});

test('KhataService: Prepares draft reminder action without automatic dispatch', () => {
  AppDatabase.getDB();
  const draft = KhataService.prepareReminderAction('mer_sharma_kirana', 'KHATA-001');

  assert.ok(draft.actionId, 'Should create an action record');
  assert.strictEqual(draft.status, 'PENDING_APPROVAL', 'Must be pending approval, not automatically sent');
  assert.ok(draft.draftMessage.includes('Namaste'), 'Draft message should contain polite reminder text');
});

test('KhataService: Records customer repayments correctly', () => {
  AppDatabase.getDB();
  const before = KhataService.getKhataOverview('mer_sharma_kirana');
  const target = before.customers[0];

  const after = KhataService.recordRepayment('mer_sharma_kirana', target.id, 100, 'UPI', 'Test partial repayment');
  const updated = after.customers.find((c) => c.id === target.id);

  assert.strictEqual(updated?.outstandingBalance, target.outstandingBalance - 100);
});
