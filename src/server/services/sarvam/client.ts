import { getSarvamConfig, isSarvamConfigured, SARVAM_TIMEOUT_MS } from './config.ts';

/** Last error per Sarvam endpoint, exposed by GET /api/voice/diagnostics. */
export const sarvamLastErrors: Record<string, { message: string; at: string }> = {};

function endpointName(url: string): string {
  return url.replace('https://api.sarvam.ai', '') || url;
}

async function send(url: string, init: RequestInit): Promise<any> {
  const name = endpointName(url);
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(SARVAM_TIMEOUT_MS) });
  } catch (err: any) {
    const message = `network error: ${err?.message || err}`;
    sarvamLastErrors[name] = { message, at: new Date().toISOString() };
    console.warn(`[Sarvam] ${name} FAILED after ${Date.now() - started} ms — ${message}`);
    throw new Error(`Sarvam ${name} ${message}`);
  }

  if (!response.ok) {
    const errText = (await response.text()).slice(0, 500);
    sarvamLastErrors[name] = { message: `HTTP ${response.status}: ${errText}`, at: new Date().toISOString() };
    console.warn(`[Sarvam] ${name} FAILED HTTP ${response.status} after ${Date.now() - started} ms — ${errText}`);
    throw new Error(`Sarvam API error (HTTP ${response.status}) on ${name}: ${errText}`);
  }

  delete sarvamLastErrors[name];
  console.log(`[Sarvam] ${name} OK in ${Date.now() - started} ms`);
  return response.json();
}

export class SarvamClient {
  /** Authorized JSON POST to a Sarvam AI endpoint (logs status and latency, never the key). */
  public static async post(url: string, body: Record<string, any>, customHeaders: Record<string, string> = {}): Promise<any> {
    if (!isSarvamConfigured()) throw new Error('Sarvam API key not configured in environment.');
    const config = getSarvamConfig();
    return send(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': config.apiKey, ...customHeaders },
      body: JSON.stringify(body),
    });
  }

  /** Multipart POST for audio file uploads (speech-to-text). */
  public static async postMultipart(url: string, formData: FormData): Promise<any> {
    if (!isSarvamConfigured()) throw new Error('Sarvam API key not configured in environment.');
    const config = getSarvamConfig();
    return send(url, { method: 'POST', headers: { 'api-subscription-key': config.apiKey }, body: formData });
  }
}
