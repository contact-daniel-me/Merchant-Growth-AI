export interface SarvamConfig {
  apiKey: string;
  sttModel: string;
  ttsModel: string;
  llmModel: string;
  sttEndpoint: string;
  ttsEndpoint: string;
  chatEndpoint: string;
}

export function getSarvamConfig(): SarvamConfig {
  // Trim and strip accidental quotes so a key pasted as SARVAM_API_KEY=" sk_... " still works.
  const apiKey = (process.env.SARVAM_API_KEY || '').trim().replace(/^['"]|['"]$/g, '').trim();

  return {
    apiKey,
    sttModel: process.env.SARVAM_STT_MODEL || 'saaras:v4',
    ttsModel: process.env.SARVAM_TTS_MODEL || 'bulbul:v4-flash',
    llmModel: process.env.SARVAM_LLM_MODEL || 'sarvam-105b',
    sttEndpoint: 'https://api.sarvam.ai/speech-to-text',
    ttsEndpoint: 'https://api.sarvam.ai/text-to-speech',
    chatEndpoint: 'https://api.sarvam.ai/v1/chat/completions',
  };
}

export function isSarvamConfigured(): boolean {
  const cfg = getSarvamConfig();
  return Boolean(cfg.apiKey && cfg.apiKey !== 'MY_SARVAM_API_KEY');
}

/** Request timeout for Sarvam REST calls, so a slow network never hangs the voice agent. */
export const SARVAM_TIMEOUT_MS = 15000;
