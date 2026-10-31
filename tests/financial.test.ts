import test from 'node:test';
import assert from 'node:assert';
import { FinancialEngine } from '../src/server/services/financialEngine.ts';
import { AppDatabase } from '../src/server/db/database.ts';

test('FinancialEngine: Calculates verified collections overview from SQLite', () => {
  AppDatabase.getDB();
  const overview = FinancialEngine.getFinancialOverview('mer_sharma_kirana');

  assert.ok(overview.todayGrossCollections > 0, 'Today gross collections must be positive');
  assert.ok(overview.todayTransactionsCount > 0, 'Today transaction count must be positive');
  assert.ok(overview.settledAmount > 0, 'Settled amount must be positive');
  assert.ok(overview.inTransitAmount > 0, 'In transit settlement amount must be positive');
  assert.strictEqual(overview.merchantId, 'mer_sharma_kirana');
});

test('FinancialEngine: Reconciles settlement batches and detects variance on escrow hold', () => {
  AppDatabase.getDB();
  const result = FinancialEngine.reconcileSettlements('mer_sharma_kirana');

  assert.ok(result.totalGrossCollections > 0, 'Gross collections should exist');
  assert.ok(result.totalVariance > 0, 'Escrow held variance should be detected');
  assert.ok(result.explanation.pendingReasonSummary.includes('variance'), 'Explanation must disclose reason for variance');
  assert.ok(result.batches.length >= 2, 'Should include both today and yesterday batches');
});

test('FinancialEngine: Generates cash-flow forecast with uncertainty disclosure', () => {
  AppDatabase.getDB();
  const forecast = FinancialEngine.getCashFlowForecast('mer_sharma_kirana', 7);

  assert.strictEqual(forecast.dailyForecast.length, 7, 'Should forecast exactly 7 days');
  assert.ok(forecast.dailyLoanEmiDeduction > 0, 'Must deduct loan EMI');
  assert.ok(forecast.assumptions.length >= 3, 'Must disclose forecast assumptions');
  assert.ok(forecast.uncertaintyDisclaimer.includes('DISCLOSURE'), 'Must explicitly disclose uncertainty');
});

test('FinancialEngine: Analyzes 4-week sales trends without false decline alarm', () => {
  AppDatabase.getDB();
  const analysis = FinancialEngine.getSalesDeclineAnalysis('mer_sharma_kirana');

  assert.ok(analysis.currentWeekCollections > 0, 'Current week collections must be calculated');
  assert.ok(analysis.previousFourWeekAverage > 0, '4-week average benchmark must exist');
  assert.ok(['HEALTHY_GROWTH', 'STABLE', 'MODERATE_DECLINE', 'SHARP_DECLINE'].includes(analysis.trendStatus));
  assert.ok(analysis.recommendations.length > 0, 'Must provide evidence-based recommendations');
});

