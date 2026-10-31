import { getSarvamConfig, isSarvamConfigured } from './config.ts';
import { SarvamClient } from './client.ts';
import { LanguageService } from './languageService.ts';
import type { IndianLanguage } from '../../../types/index.ts';

// Speaker names Sarvam documents for bulbul:v3. bulbul:v4-flash uses persona IDs instead, so for v4
// we send no speaker unless one is passed explicitly (the API then uses its default voice).
const BULBUL_V3_SPEAKERS = new Set(['shubh', 'aditya', 'ritu', 'priya']);
const MAX_CHARS = 2500;

export class TextToSpeechService {
  /**
   * Synthesizes speech with Sarvam Bulbul.
   * Request format per https://docs.sarvam.ai (text + language_code; `inputs` /
   * `target_language_code` are the old v1 fields and are rejected by current models).
   */
  public static async synthesizeSpeech(
    text: string,
    language: IndianLanguage = 'en',
    customSpeaker?: string
  ): Promise<{ audioBase64: string | null; mimeType?: string; error?: string }> {
    if (!text.trim()) return { audioBase64: null, error: 'No text to speak.' };
    if (!isSarvamConfigured()) return { audioBase64: null, error: 'SARVAM_API_KEY is not configured.' };

    const config = getSarvamConfig();
    const model = config.ttsModel;
    const body: Record<string, any> = {
      text: text.replace(/\*\*/g, '').slice(0, MAX_CHARS),
      language_code: LanguageService.getSarvamCode(language),
      model,
      output_audio_codec: 'mp3',
    };

    const defaultSpeaker = LanguageService.getSpeaker(language);
    if (customSpeaker) {
      body.speaker = customSpeaker;
    } else if (model.startsWith('bulbul:v3') && BULBUL_V3_SPEAKERS.has(defaultSpeaker)) {
      body.speaker = defaultSpeaker;
    }

    try {
      const result = await SarvamClient.post(config.ttsEndpoint, body);
      const audio = Array.isArray(result?.audios) ? result.audios[0] : null;
      if (!audio) return { audioBase64: null, error: 'Sarvam returned no audio.' };
      return { audioBase64: audio, mimeType: 'audio/mpeg' };
    } catch (err: any) {
      return { audioBase64: null, error: err.message };
    }
  }
}
