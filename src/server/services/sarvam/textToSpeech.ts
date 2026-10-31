import { getSarvamConfig, isSarvamConfigured } from './config.ts';
import { SarvamClient } from './client.ts';
import { LanguageService } from './languageService.ts';
import type { IndianLanguage } from '../../../types/index.ts';

export class TextToSpeechService {
  /**
   * Synthesizes natural human-sounding voice audio using Sarvam Bulbul Neural Voice
   */
  public static async synthesizeSpeech(
    text: string,
    language: IndianLanguage = 'en',
    customSpeaker?: string
  ): Promise<{ audioBase64: string | null; audioUrl?: string }> {
    if (!isSarvamConfigured() || !text.trim()) {
      return { audioBase64: null };
    }

    const config = getSarvamConfig();
    const sarvamLang = LanguageService.getSarvamCode(language);
    const speaker = customSpeaker || LanguageService.getSpeaker(language);

    // Limit text to 1000 characters for snappy voice response
    const sanitizedText = text.slice(0, 1000);

    const body: Record<string, any> = {
      inputs: [sanitizedText],
      target_language_code: sarvamLang,
      speaker,
      model: config.ttsModel || 'bulbul:v3',
      speech_sample_rate: 24000,
      enable_preprocessing: true,
    };

    try {
      const result = await SarvamClient.post(config.ttsEndpoint, body);
      if (result && result.audios && Array.isArray(result.audios) && result.audios.length > 0) {
        return { audioBase64: result.audios[0] };
      }
      return { audioBase64: null };
    } catch (err: any) {
      console.warn('[Sarvam TTS] Synthesis call failed:', err.message);
      return { audioBase64: null };
    }
  }
}
