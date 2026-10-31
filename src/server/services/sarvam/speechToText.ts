import { getSarvamConfig, isSarvamConfigured } from './config.ts';
import { SarvamClient } from './client.ts';
import { LanguageService } from './languageService.ts';
import { IndianLanguage } from '../../../types/index.ts';

export class SpeechToTextService {
  /**
   * Transcribes voice audio using Sarvam Saaras v4 STT model
   */
  public static async transcribeAudio(
    audioBufferOrBase64: Buffer | string,
    language: IndianLanguage = 'en',
    mimeType = 'audio/wav'
  ): Promise<{ transcript: string; detectedLanguage: string }> {
    if (!isSarvamConfigured()) {
      return {
        transcript: '',
        detectedLanguage: LanguageService.getSarvamCode(language),
      };
    }

    const config = getSarvamConfig();
    const sarvamLang = LanguageService.getSarvamCode(language);

    let audioBuffer: Buffer;
    if (typeof audioBufferOrBase64 === 'string') {
      const base64Clean = audioBufferOrBase64.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(base64Clean, 'base64');
    } else {
      audioBuffer = audioBufferOrBase64;
    }

    // Build standard FormData for Sarvam Saaras STT
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('file', blob, 'merchant_audio.wav');
    formData.append('model', config.sttModel);
    formData.append('mode', 'transcribe');
    formData.append('language_code', sarvamLang);

    try {
      const result = await SarvamClient.postMultipart(config.sttEndpoint, formData);
      return {
        transcript: result.transcript || '',
        detectedLanguage: result.language_code || sarvamLang,
      };
    } catch (err: any) {
      console.warn('[Sarvam STT] Transcription call failed:', err.message);
      return {
        transcript: '',
        detectedLanguage: sarvamLang,
      };
    }
  }
}
