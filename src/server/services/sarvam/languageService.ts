import { IndianLanguage } from '../../../types/index.ts';

export interface SarvamLanguageInfo {
  code: IndianLanguage;
  sarvamCode: string;
  name: string;
  nativeName: string;
  defaultSpeaker: string;
}

export const SUPPORTED_LANGUAGES: Record<IndianLanguage, SarvamLanguageInfo> = {
  en: {
    code: 'en',
    sarvamCode: 'en-IN',
    name: 'English (India)',
    nativeName: 'English',
    defaultSpeaker: 'meera',
  },
  hi: {
    code: 'hi',
    sarvamCode: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    defaultSpeaker: 'shubh',
  },
  ta: {
    code: 'ta',
    sarvamCode: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    defaultSpeaker: 'ananya',
  },
  kn: {
    code: 'kn',
    sarvamCode: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    defaultSpeaker: 'kavya',
  },
  te: {
    code: 'te',
    sarvamCode: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    defaultSpeaker: 'pallavi',
  },
};

export class LanguageService {
  public static getSarvamCode(lang: IndianLanguage = 'en'): string {
    return SUPPORTED_LANGUAGES[lang]?.sarvamCode || 'en-IN';
  }

  public static getSpeaker(lang: IndianLanguage = 'en'): string {
    return SUPPORTED_LANGUAGES[lang]?.defaultSpeaker || 'meera';
  }

  public static normalizeLanguage(input?: string): IndianLanguage {
    if (!input) return 'en';
    const lower = input.toLowerCase();
    if (lower.startsWith('ta')) return 'ta';
    if (lower.startsWith('hi')) return 'hi';
    if (lower.startsWith('kn')) return 'kn';
    if (lower.startsWith('te')) return 'te';
    return 'en';
  }
}

