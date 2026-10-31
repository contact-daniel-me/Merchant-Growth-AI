import test from 'node:test';
import assert from 'node:assert';
import { SarvamAgentService } from '../src/server/services/sarvam/agentService.ts';
import { LanguageService } from '../src/server/services/sarvam/languageService.ts';
import { BriefService } from '../src/server/services/briefService.ts';
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

test('BriefService: Formats spoken amounts for Indic number words', () => {
  const enWords = BriefService.formatSpokenAmount(12500, 'en');
  assert.ok(enWords.includes('thousand'), 'English should express in thousands');

  const taWords = BriefService.formatSpokenAmount(12500, 'ta');
  assert.ok(taWords.includes('ரூபாய்'), 'Tamil should include rupee suffix');

  const hiWords = BriefService.formatSpokenAmount(12500, 'hi');
  assert.ok(hiWords.includes('रुपये'), 'Hindi should include rupee suffix');
});

test('BriefService: Generates grounded daily brief in English and Tamil with zero hallucinated figures', async () => {
  AppDatabase.getDB();
  const enBrief = await BriefService.generateDailyBrief('mer_sharma_kirana', 'en');

  assert.ok(enBrief.id.startsWith('BRIEF-mer_sharma_kirana'));
  assert.strictEqual(enBrief.language, 'en');
  assert.ok(enBrief.todayCollections > 0);
  assert.ok(enBrief.spokenAudioText.includes(String(enBrief.todayTransactions)));

  // Generate Tamil brief
  const taBrief = await BriefService.generateDailyBrief('mer_sharma_kirana', 'ta');
  assert.strictEqual(taBrief.language, 'ta');
  assert.ok(taBrief.spokenAudioText.includes('வணக்கம்'));
  assert.strictEqual(taBrief.todayCollections, enBrief.todayCollections, 'Financial numbers must match across languages');

  // Verify caching: subsequent request retrieves cached record
  const cachedBrief = await BriefService.getLatestBriefing('mer_sharma_kirana', 'ta');
  assert.strictEqual(cachedBrief.id, taBrief.id);
});
