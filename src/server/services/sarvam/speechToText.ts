import { getSarvamConfig, isSarvamConfigured } from './config.ts';
import { SarvamClient } from './client.ts';
import { LanguageService } from './languageService.ts';
import type { IndianLanguage } from '../../../types/index.ts';

/** Split a browser data URL ("data:audio/webm;codecs=opus;base64,....") into its type and raw base64. */
export function parseAudioPayload(input: string, fallbackMime: string): { base64: string; mimeType: string } {
  const match = input.match(/^data:([^;,]+)[^,]*,/);
  if (match) return { base64: input.slice(match[0].length), mimeType: match[1] };
  return { base64: input, mimeType: fallbackMime };
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) return 'm4a';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'wav';
}

export class SpeechToTextService {
  /**
   * Transcribes voice audio using Sarvam Saaras speech-to-text.
   * Returns an empty transcript (and the reason in `error`) when it cannot transcribe.
   */
  public static async transcribeAudio(
    audioBufferOrBase64: Buffer | string,
    language: IndianLanguage | 'auto' = 'en',
    mimeType = 'audio/webm'
  ): Promise<{ transcript: string; detectedLanguage: string; error?: string }> {
    const sarvamLang = language === 'auto' ? 'unknown' : LanguageService.getSarvamCode(language);
    if (!isSarvamConfigured()) {
      return { transcript: '', detectedLanguage: sarvamLang, error: 'SARVAM_API_KEY is not configured.' };
    }

    const config = getSarvamConfig();
    let audioBuffer: Buffer;
    let resolvedMime = mimeType;
    if (typeof audioBufferOrBase64 === 'string') {
      const parsed = parseAudioPayload(audioBufferOrBase64, mimeType);
      audioBuffer = Buffer.from(parsed.base64, 'base64');
      resolvedMime = parsed.mimeType;
    } else {
      audioBuffer = audioBufferOrBase64;
    }

    if (audioBuffer.length < 100) {
      return { transcript: '', detectedLanguage: sarvamLang, error: 'Audio clip is empty or too short.' };
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: resolvedMime });
    formData.append('file', blob, `merchant_audio.${extensionFor(resolvedMime)}`);
    formData.append('model', config.sttModel);
    formData.append('language_code', sarvamLang);

    try {
      const result = await SarvamClient.postMultipart(config.sttEndpoint, formData);
      return {
        transcript: (result.transcript || '').trim(),
        detectedLanguage: result.language_code || sarvamLang,
      };
    } catch (err: any) {
      return { transcript: '', detectedLanguage: sarvamLang, error: err.message };
    }
  }
}
