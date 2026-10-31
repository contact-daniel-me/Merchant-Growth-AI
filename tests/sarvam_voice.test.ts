import test from 'node:test';
import assert from 'node:assert';
import { SarvamAgentService } from '../src/server/services/sarvam/agentService.ts';
import { LanguageService } from '../src/server/services/sarvam/languageService.ts';
import { AppDatabase } from '../src/server/db/database.ts';

test('LanguageService: Supports 5 Indian languages with correct Sarvam codes', () => {
  assert.strictEqual(LanguageService.getSarvamCode('en'), 'en-IN');
  assert.strictEqual(LanguageService.getSarvamCode('hi'), 'hi-IN');
  assert.strictEqual(LanguageService.getSarvamCode('ta'), 'ta-IN');
  assert.strictEqual(LanguageService.getSarvamCode('kn'), 'kn-IN');
  assert.strictEqual(LanguageService.getSarvamCode('te'), 'te-IN');
});

test('SarvamAgentService: Processes English query and records conversation audit log', async () => {
  AppDatabase.getDB();
  const response = await SarvamAgentService.processVoiceQuery({
    merchantId: 'mer_sharma_kirana',
    query: 'How much money did I receive today?',
    language: 'en',
  });

  assert.strictEqual(response.intentIdentified, 'TODAY_COLLECTIONS');
  assert.ok(response.responseText.includes('Today you have received ₹'), 'Response must contain verified collections');
  assert.strictEqual(response.language, 'en');

  // Verify conversation was recorded in database
  const db = AppDatabase.getDB();
  const conv = db.prepare('SELECT * FROM voice_conversations WHERE id = ?').get(response.conversationId) as any;
  assert.ok(conv, 'Conversation must be logged in SQLite');
  assert.strictEqual(conv.language, 'en');
});

test('SarvamAgentService: Processes Hindi settlement confusion query', async () => {
  AppDatabase.getDB();
  const response = await SarvamAgentService.processVoiceQuery({
    merchantId: 'mer_sharma_kirana',
    query: 'मेरा अटका हुआ पैसा कब आएगा?',
    language: 'hi',
  });

  assert.strictEqual(response.intentIdentified, 'RECONCILE_SETTLEMENTS');
  assert.strictEqual(response.agentName, 'Settlement Intelligence Agent');
  assert.ok(response.responseText.includes('₹'), 'Response must explain verified financial status');
});

test('SarvamAgentService: Processes customer dues query and prepares reminder card', async () => {
  AppDatabase.getDB();
  const response = await SarvamAgentService.processVoiceQuery({
    merchantId: 'mer_sharma_kirana',
    query: 'Prepare a reminder for Suresh',
    language: 'en',
  });

  assert.strictEqual(response.intentIdentified, 'KHATA_AND_CUSTOMER_DUES');
  assert.ok(response.verifiedData.totalOutstandingDues > 0);
  assert.ok(response.actionCard, 'Should generate an action card for reminder approval');
});
