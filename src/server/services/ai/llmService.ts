import { GoogleGenAI } from '@google/genai';
import { getSarvamConfig, isSarvamConfigured } from '../sarvam/config.ts';

/**
 * One place for every LLM call in the app.
 *
 * Provider order (first one configured wins, the next is tried if a call fails):
 *   1. Gemini   — when GEMINI_API_KEY is set (model: GEMINI_MODEL, default gemini-2.5-flash)
 *   2. Sarvam   — when SARVAM_API_KEY is set (model: SARVAM_LLM_MODEL, default sarvam-105b)
 * Set LLM_PROVIDER=sarvam or LLM_PROVIDER=gemini to force the order.
 *
 * Every call logs provider, latency and outcome (never the key), so it is obvious in the
 * server console whether real AI calls are happening.
 */

export type LlmProvider = 'gemini' | 'sarvam';

export interface LlmResult {
  text: string;
  provider: LlmProvider;
  model: string;
  latencyMs: number;
}

export interface LlmCallOptions {
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
  timeoutMs?: number;
  /** Short label for logs, e.g. "tool-routing". */
  purpose: string;
}

const lastErrors: Partial<Record<LlmProvider, { message: string; at: string }>> = {};

function geminiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  return key;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

export function sarvamChatModel(): string {
  return getSarvamConfig().llmModel;
}

/** Providers that have credentials, in the order they will be tried. */
export function availableProviders(): LlmProvider[] {
  const configured: LlmProvider[] = [];
  if (geminiKey()) configured.push('gemini');
  if (isSarvamConfigured()) configured.push('sarvam');
  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (forced === 'sarvam' || forced === 'gemini') {
    configured.sort((a, b) => (a === forced ? -1 : b === forced ? 1 : 0));
  }
  return configured;
}

export function getLastLlmErrors() {
  return { ...lastErrors };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** Reasoning models sometimes wrap output in <think>…</think> or ```json fences; keep only the answer. */
export function cleanModelText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

async function callGemini(opts: LlmCallOptions): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await withTimeout(
    ai.models.generateContent({
      model: geminiModel(),
      contents: opts.prompt,
      config: {
        systemInstruction: opts.system,
        temperature: opts.temperature ?? 0.2,
        ...(opts.json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
    opts.timeoutMs ?? 6000,
    'Gemini'
  );
  return res.text || '';
}

async function callSarvam(opts: LlmCallOptions): Promise<string> {
  const cfg = getSarvamConfig();
  if (!isSarvamConfigured()) throw new Error('SARVAM_API_KEY not configured');
  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: opts.json ? `${opts.prompt}\n\nRespond with JSON only.` : opts.prompt },
  ];
  const response = await fetch(cfg.chatEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': cfg.apiKey },
    body: JSON.stringify({ model: cfg.llmModel, messages, temperature: opts.temperature ?? 0.2 }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sarvam chat HTTP ${response.status}: ${body.slice(0, 300)}`);
  }
  const data: any = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Run a prompt against the first working provider. Returns null when no provider is
 * configured or every provider failed — callers must then use their deterministic path.
 */
export async function generateText(opts: LlmCallOptions): Promise<LlmResult | null> {
  const providers = availableProviders();
  if (providers.length === 0) {
    console.warn(`[AI] ${opts.purpose}: no LLM key configured (set GEMINI_API_KEY or SARVAM_API_KEY) — using deterministic fallback.`);
    return null;
  }

  for (const provider of providers) {
    const started = Date.now();
    const model = provider === 'gemini' ? geminiModel() : sarvamChatModel();
    try {
      const raw = provider === 'gemini' ? await callGemini(opts) : await callSarvam(opts);
      const text = cleanModelText(raw);
      if (!text) throw new Error('empty response');
      const latencyMs = Date.now() - started;
      console.log(`[AI] ${opts.purpose}: ${provider}/${model} OK in ${latencyMs} ms`);
      delete lastErrors[provider];
      return { text, provider, model, latencyMs };
    } catch (err: any) {
      const message = err?.message || String(err);
      lastErrors[provider] = { message, at: new Date().toISOString() };
      console.warn(`[AI] ${opts.purpose}: ${provider}/${model} FAILED after ${Date.now() - started} ms — ${message}`);
    }
  }
  return null;
}

/** Same as generateText but parses JSON; returns null on any failure. */
export async function generateJson<T = any>(opts: Omit<LlmCallOptions, 'json'>): Promise<{ data: T; meta: LlmResult } | null> {
  const result = await generateText({ ...opts, json: true });
  if (!result) return null;
  try {
    const start = result.text.indexOf('{');
    const end = result.text.lastIndexOf('}');
    const data = JSON.parse(start >= 0 && end > start ? result.text.slice(start, end + 1) : result.text) as T;
    return { data, meta: result };
  } catch {
    console.warn(`[AI] ${opts.purpose}: ${result.provider} returned non-JSON output; ignoring.`);
    return null;
  }
}
