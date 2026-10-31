import test from 'node:test';
import assert from 'node:assert';
import { SarvamAgentService } from '../src/server/services/sarvam/agentService.ts';
import { TextToSpeechService } from '../src/server/services/sarvam/textToSpeech.ts';
import { parseAudioPayload } from '../src/server/services/sarvam/speechToText.ts';
import { FinancialEngine } from '../src/server/services/financialEngine.ts';
import { AppDatabase } from '../src/server/db/database.ts';

/**
 * These tests stand in for the Sarvam API with a fake fetch, so they check exactly what the app
 * sends and how it uses the replies, without needing network access or a real key.
 */
type Call = { url: string; body: any };

function installFakeSarvam(chatReply: (prompt: string) => string) {
  const calls: Call[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => {
    const u = String(url);
    const body = init?.body instanceof FormData ? Object.fromEntries(init.body.entries()) : JSON.parse(init?.body || '{}');
    calls.push({ url: u, body });
    if (u.endsWith('/v1/chat/completions')) {
      const userMsg = body.messages[body.messages.length - 1].content as string;
      return new Response(JSON.stringify({ choices: [{ message: { content: chatReply(userMsg) } }] }), { status: 200 });
    }
    if (u.endsWith('/text-to-speech')) {
      return new Response(JSON.stringify({ request_id: 't', audios: ['SUQz'] }), { status: 200 });
    }
    if (u.endsWith('/speech-to-text')) {
      return new Response(JSON.stringify({ transcript: 'How much did I sell today?', language_code: 'en-IN' }), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = realFetch;
    },
  };
}

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    saved[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  return fn().finally(() => {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
}

test('parseAudioPayload: strips data URLs that carry codec parameters', () => {
  const parsed = parseAudioPayload('data:audio/webm;codecs=opus;base64,AAAA', 'audio/wav');
  assert.strictEqual(parsed.mimeType, 'audio/webm');
  assert.strictEqual(parsed.base64, 'AAAA');
  assert.deepStrictEqual(parseAudioPayload('BBBB', 'audio/ogg'), { base64: 'BBBB', mimeType: 'audio/ogg' });
});

test('TextToSpeech: sends the current Sarvam request format', async () => {
  await withEnv({ SARVAM_API_KEY: 'test-key', SARVAM_TTS_MODEL: undefined }, async () => {
    const fake = installFakeSarvam(() => '');
    try {
      const out = await TextToSpeechService.synthesizeSpeech('வணக்கம்', 'ta');
      assert.strictEqual(out.audioBase64, 'SUQz');
      const body = fake.calls[0].body;
      assert.strictEqual(body.text, 'வணக்கம்');
      assert.strictEqual(body.language_code, 'ta-IN');
      assert.strictEqual(body.model, 'bulbul:v4-flash');
      assert.strictEqual(body.inputs, undefined, 'old `inputs` field must not be sent');
      assert.strictEqual(body.target_language_code, undefined, 'old `target_language_code` field must not be sent');
      assert.strictEqual(body.speaker, undefined, 'v3 speaker names are not valid for bulbul:v4-flash');
    } finally {
      fake.restore();
    }
  });
});

test('Agent: with a Sarvam key, routing and the reply come from the live LLM', async () => {
  AppDatabase.getDB();
  const overview = FinancialEngine.getFinancialOverview('mer_sharma_kirana');
  const amount = `₹${overview.todayGrossCollections.toLocaleString('en-IN')}`;

  await withEnv({ SARVAM_API_KEY: 'test-key', GEMINI_API_KEY: undefined }, async () => {
    const fake = installFakeSarvam((prompt) =>
      prompt.includes('Select the single best business tool')
        ? '<think>about sales</think>{"selectedTool":"get_daily_collections","toolParams":{}}'
        : `Namaste ji, aaj aapki bikri ${amount} rahi.`
    );
    try {
      const res = await SarvamAgentService.processVoiceQuery({
        merchantId: 'mer_sharma_kirana',
        query: 'aaj kitna kamaya?',
        language: 'hi',
      });
      assert.strictEqual(res.toolInvoked, 'get_daily_collections');
      assert.strictEqual(res.isAiFallback, false, 'tool must be chosen by the LLM');
      assert.strictEqual(res.responseSource, 'llm');
      assert.strictEqual(res.aiProvider, 'sarvam');
      assert.ok(res.responseText.includes(amount));
      assert.strictEqual(res.audioBase64, 'SUQz');
      const chatCalls = fake.calls.filter((c) => c.url.endsWith('/v1/chat/completions'));
      assert.strictEqual(chatCalls.length, 2, 'one call to route, one to phrase the answer');
      assert.strictEqual(chatCalls[0].body.model, 'sarvam-105b');
    } finally {
      fake.restore();
    }
  });
});

test('Agent: an LLM reply with an invented amount is replaced by the verified template', async () => {
  AppDatabase.getDB();
  await withEnv({ SARVAM_API_KEY: 'test-key', GEMINI_API_KEY: undefined }, async () => {
    const fake = installFakeSarvam((prompt) =>
      prompt.includes('Select the single best business tool')
        ? '{"selectedTool":"get_daily_collections","toolParams":{}}'
        : 'You earned ₹987,654 today!'
    );
    try {
      const res = await SarvamAgentService.processVoiceQuery({
        merchantId: 'mer_sharma_kirana',
        query: 'How much did I sell today?',
        language: 'en',
      });
      assert.strictEqual(res.responseSource, 'template');
      assert.ok(!res.responseText.includes('987,654'));
      assert.ok(res.responseText.includes('Today you have received ₹'));
    } finally {
      fake.restore();
    }
  });
});

test('Agent: recorded audio is transcribed (webm data URL) and answered, not replaced by a default question', async () => {
  AppDatabase.getDB();
  await withEnv({ SARVAM_API_KEY: 'test-key', GEMINI_API_KEY: undefined }, async () => {
    const fake = installFakeSarvam((prompt) =>
      prompt.includes('Select the single best business tool') ? '{"selectedTool":"get_daily_collections","toolParams":{}}' : 'OK'
    );
    try {
      const audio = 'data:audio/webm;codecs=opus;base64,' + Buffer.alloc(400, 1).toString('base64');
      const res = await SarvamAgentService.processVoiceQuery({ merchantId: 'mer_sharma_kirana', audioBase64: audio, language: 'en' });
      assert.strictEqual(res.recognizedTranscript, 'How much did I sell today?');
      const stt = fake.calls.find((c) => c.url.endsWith('/speech-to-text'))!;
      assert.strictEqual(stt.body.model, 'saaras:v4');
      assert.strictEqual((stt.body.file as File).type, 'audio/webm');
      assert.strictEqual((stt.body.file as File).size, 400, 'decoded audio, not the data-URL text');
    } finally {
      fake.restore();
    }
  });
});

test('Agent: when speech cannot be understood it says so instead of answering a default question', async () => {
  AppDatabase.getDB();
  await withEnv({ SARVAM_API_KEY: undefined, GEMINI_API_KEY: undefined }, async () => {
    const res = await SarvamAgentService.processVoiceQuery({
      merchantId: 'mer_sharma_kirana',
      audioBase64: 'data:audio/webm;base64,' + Buffer.alloc(400, 1).toString('base64'),
      language: 'en',
    });
    assert.strictEqual(res.intentIdentified, 'SPEECH_NOT_RECOGNIZED');
    assert.match(res.responseText, /couldn't catch that/);
  });
});
