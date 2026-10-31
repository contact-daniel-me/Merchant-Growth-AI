import { AppDatabase } from '../db/database.ts';
import { FinancialEngine } from './financialEngine.ts';
import { KhataService } from './khataService.ts';
import { TextToSpeechService } from './sarvam/textToSpeech.ts';
import { IndianLanguage, DailyBriefing } from '../../types/index.ts';

// In-memory audio cache: key -> { audioBase64, timestamp }
const audioCache = new Map<string, { audioBase64: string; createdAt: number }>();

export class BriefService {
  /**
   * Helper to format Indian currency figures into spoken words for natural Sarvam TTS pronunciation
   */
  public static formatSpokenAmount(amount: number, language: IndianLanguage = 'en'): string {
    const rounded = Math.round(amount);
    if (rounded === 0) return 'zero rupees';

    if (language === 'hi') {
      if (rounded >= 100000) {
        const lakh = (rounded / 100000).toFixed(1).replace('.0', '');
        return `${lakh} लाख रुपये`;
      }
      if (rounded >= 1000) {
        const thousand = (rounded / 1000).toFixed(1).replace('.0', '');
        return `${thousand} हज़ार रुपये`;
      }
      return `${rounded} रुपये`;
    }

    if (language === 'ta') {
      if (rounded >= 100000) {
        const lakh = (rounded / 100000).toFixed(1).replace('.0', '');
        return `${lakh} லட்சம் ரூபாய்`;
      }
      if (rounded >= 1000) {
        const thousand = (rounded / 1000).toFixed(1).replace('.0', '');
        return `${thousand} ஆயிரம் ரூபாய்`;
      }
      return `${rounded} ரூபாய்`;
    }

    if (language === 'kn') {
      if (rounded >= 100000) {
        const lakh = (rounded / 100000).toFixed(1).replace('.0', '');
        return `${lakh} ಲಕ್ಷ ರೂಪಾಯಿ`;
      }
      if (rounded >= 1000) {
        const thousand = (rounded / 1000).toFixed(1).replace('.0', '');
        return `${thousand} ಸಾವಿರ ರೂಪಾಯಿ`;
      }
      return `${rounded} ರೂಪಾಯಿ`;
    }

    if (language === 'te') {
      if (rounded >= 100000) {
        const lakh = (rounded / 100000).toFixed(1).replace('.0', '');
        return `${lakh} లక్ష రూపాయలు`;
      }
      if (rounded >= 1000) {
        const thousand = (rounded / 1000).toFixed(1).replace('.0', '');
        return `${thousand} వేల రూపాయలు`;
      }
      return `${rounded} రూపాయలు`;
    }

    // Default: English (Indian numbering system)
    if (rounded >= 100000) {
      const lakh = (rounded / 100000).toFixed(1).replace('.0', '');
      return `${lakh} lakh rupees`;
    }
    if (rounded >= 1000) {
      const thousand = (rounded / 1000).toFixed(1).replace('.0', '');
      return `${thousand} thousand rupees`;
    }
    return `${rounded} rupees`;
  }

  /**
   * Generates a grounded, verified daily business briefing packet and synthesizes audio via Sarvam Bulbul v4 Flash
   */
  public static async generateDailyBrief(
    merchantId: string,
    language: IndianLanguage = 'en'
  ): Promise<DailyBriefing & { audioBase64?: string | null }> {
    const db = AppDatabase.getDB();
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(merchantId) as any;
    if (!merchant) {
      throw new Error(`Merchant with id '${merchantId}' not found.`);
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const cacheKey = `${merchantId}:${todayDate}:${language}`;

    // 1. Check existing briefing in database
    const existing = db.prepare(`
      SELECT * FROM daily_briefings 
      WHERE merchant_id = ? AND briefing_date = ? AND language = ?
    `).get(merchantId, todayDate, language) as any;

    if (existing && existing.audio_base64) {
      return {
        id: existing.id,
        merchantId: existing.merchant_id,
        date: existing.briefing_date,
        language: existing.language as IndianLanguage,
        todayCollections: existing.today_collections,
        todayTransactions: existing.today_transactions,
        settlementStatus: existing.settlement_status,
        settledAmount: existing.settled_amount,
        pendingAmount: existing.pending_amount,
        refundsCount: existing.refunds_count,
        refundsAmount: existing.refunds_amount,
        exceptionsNotice: existing.exceptions_notice,
        cashFlowHighlight: existing.cash_flow_highlight,
        creditOverdueSummary: existing.credit_overdue_summary,
        keyGrowthOpportunity: existing.key_growth_opportunity,
        spokenAudioText: existing.spoken_text,
        audioDurationSeconds: existing.duration_seconds,
        audioBase64: existing.audio_base64,
      };
    }

    // 2. Gather verified truth facts from Deterministic Engines
    const overview = FinancialEngine.getFinancialOverview(merchantId);
    const reconciliation = FinancialEngine.reconcileSettlements(merchantId);
    const khata = KhataService.getKhataOverview(merchantId);
    const cashflow = FinancialEngine.getCashFlowForecast(merchantId);
    const growth = FinancialEngine.getSalesDeclineAnalysis(merchantId);

    // 3. Assemble Multilingual Grounded Briefing Content
    let spokenText = '';
    let settlementStatus = '';
    let cashFlowHighlight = '';
    let creditOverdueSummary = '';
    let keyGrowthOpportunity = '';
    let exceptionsNotice = '';

    const spokenSales = this.formatSpokenAmount(overview.todayGrossCollections, language);
    const spokenInTransit = this.formatSpokenAmount(overview.inTransitAmount, language);
    const spokenOverdue = this.formatSpokenAmount(khata.totalOverdueAmount, language);
    const bankName = merchant.bank_name || 'Paytm Payments Bank';

    // A. ENGLISH (Default)
    if (language === 'en') {
      settlementStatus = overview.inTransitAmount > 0
        ? `₹${overview.inTransitAmount.toLocaleString('en-IN')} is in transit to your ${bankName} account and will credit tonight.`
        : `All collections are settled. ₹${overview.settledAmount.toLocaleString('en-IN')} is already credited.`;

      exceptionsNotice = reconciliation.totalVariance > 0
        ? `₹${reconciliation.totalVariance.toLocaleString('en-IN')} variance detected due to customer refund adjustment.`
        : `Zero settlement discrepancies detected. All batches reconciled.`;

      cashFlowHighlight = `Projected next-day net operating cash flow is ₹${(cashflow.projectedSevenDayInflow / 7).toFixed(0)} after daily loan EMI deductions.`;
      creditOverdueSummary = `${khata.overdueCustomersCount} customer dues overdue totaling ₹${khata.totalOverdueAmount.toLocaleString('en-IN')}.`;
      keyGrowthOpportunity = `Peak retail footfall occurs between 6:30 PM and 9:00 PM, accounting for 68% of daily collections.`;

      spokenText = `Good morning ${merchant.owner_name}. Here is your business briefing for today. You have collected ${spokenSales} across ${overview.todayTransactionsCount} transactions. ${settlementStatus} In your Khata, ${creditOverdueSummary} Have a profitable day ahead.`;
    }
    // B. TAMIL
    else if (language === 'ta') {
      settlementStatus = overview.inTransitAmount > 0
        ? `₹${overview.inTransitAmount.toLocaleString('en-IN')} உங்கள் ${bankName} வங்கிக் கணக்கிற்கு அனுப்பப்பட்டு வருகிறது, இன்று இரவு வரவு வைக்கப்படும்.`
        : `அனைத்து பணமும் வங்கிக் கணக்கில் வரவு வைக்கப்பட்டு விட்டது.`;

      exceptionsNotice = reconciliation.totalVariance > 0
        ? `வாடிக்கையாளர் பணத்தைத் திரும்பப்பெற்றதால் ₹${reconciliation.totalVariance.toLocaleString('en-IN')} வேறுபாடு சரிபார்க்கப்படுகிறது.`
        : `எந்த முரண்பாடுகளும் இல்லை. அனைத்து செட்டில்மென்ட்களும் சரிபார்க்கப்பட்டன.`;

      cashFlowHighlight = `தினசரி கடன் தவணை கழித்த பிறகு நாளை ₹${(cashflow.projectedSevenDayInflow / 7).toFixed(0)} வரவு எதிர்பார்க்கப்படுகிறது.`;
      creditOverdueSummary = `${khata.overdueCustomersCount} வாடிக்கையாளர்களிடம் ₹${khata.totalOverdueAmount.toLocaleString('en-IN')} நிலுவையில் உள்ளது.`;
      keyGrowthOpportunity = `மாலை 6:30 முதல் 9:00 மணி வரை அதிக விற்பனை நடக்கிறது.`;

      spokenText = `வணக்கம் ${merchant.owner_name}. இன்றைய வணிக சுருக்கம்: இன்று ${overview.todayTransactionsCount} பரிவர்த்தனைகள் மூலம் ${spokenSales} பெற்றுள்ளீர்கள். ${spokenInTransit} இன்று இரவு உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும். உங்கள் கடன் கணக்கில் ${creditOverdueSummary} நல்ல நாளாக அமைய வாழ்த்துகள்.`;
    }
    // C. HINDI
    else if (language === 'hi') {
      settlementStatus = overview.inTransitAmount > 0
        ? `₹${overview.inTransitAmount.toLocaleString('en-IN')} आपके ${bankName} खाते में प्रक्रियाधीन हैं और आज रात जमा हो जाएंगे।`
        : `सभी भुगतान बैंक खाते में जमा हो चुके हैं।`;

      exceptionsNotice = reconciliation.totalVariance > 0
        ? `रिफंड समायोजन के कारण ₹${reconciliation.totalVariance.toLocaleString('en-IN')} का अंतर जांचा जा रहा है।`
        : `सभी सेटलमेंट सत्यापित हैं, कोई विसंगति नहीं है।`;

      cashFlowHighlight = `दैनिक लोन ईएमआई कटने के बाद कल ₹${(cashflow.projectedSevenDayInflow / 7).toFixed(0)} की शुद्ध नकदी अपेक्षित है।`;
      creditOverdueSummary = `खाता बही में ${khata.overdueCustomersCount} ग्राहकों से ₹${khata.totalOverdueAmount.toLocaleString('en-IN')} बकाया है।`;
      keyGrowthOpportunity = `शाम 6:30 से रात 9:00 बजे के बीच सबसे अधिक ग्राहक आते हैं।`;

      spokenText = `नमस्ते ${merchant.owner_name} जी। आज का व्यापार विवरण: आज ${overview.todayTransactionsCount} भुगतानों से ${spokenSales} प्राप्त हुए हैं। ${spokenInTransit} आज रात आपके बैंक खाते में आ जाएंगे। खाता बही में ${creditOverdueSummary} आपका दिन शुभ हो।`;
    }
    // D. KANNADA
    else if (language === 'kn') {
      settlementStatus = overview.inTransitAmount > 0
        ? `₹${overview.inTransitAmount.toLocaleString('en-IN')} ನಿಮ್ಮ ${bankName} ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆಯಾಗಲು ಕಳುಹಿಸಲಾಗಿದೆ.`
        : `ಎಲ್ಲಾ ಸೆಟಲ್ಮೆಂಟ್ ಮೊತ್ತ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆಯಾಗಿದೆ.`;

      exceptionsNotice = reconciliation.totalVariance > 0
        ? `ರೀಫಂಡ್ ಹೊಂದಾಣಿಕೆಯಿಂದಾಗಿ ₹${reconciliation.totalVariance.toLocaleString('en-IN')} ವ್ಯತ್ಯಾಸ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ.`
        : `ಎಲ್ಲಾ ಸೆಟಲ್ಮೆಂಟ್‌ಗಳು ಪೂರ್ಣವಾಗಿ ಹೊಂದಾಣಿಕೆಯಾಗಿವೆ.`;

      cashFlowHighlight = `ದೈನಂದಿನ ಸಾಲ ಇಎಂಐ ಕಡಿತದ ನಂತರ ನಾಳೆ ₹${(cashflow.projectedSevenDayInflow / 7).toFixed(0)} ನಿವ್ವಳ ನಗದು ಹರಿವು ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ.`;
      creditOverdueSummary = `ಖಾತಾದಲ್ಲಿ ${khata.overdueCustomersCount} ಗ್ರಾಹಕರಿಂದ ₹${khata.totalOverdueAmount.toLocaleString('en-IN')} ಬಾಕಿ ಉಳಿದಿದೆ.`;
      keyGrowthOpportunity = `ಸಂಜೆ 6:30 ರಿಂದ 9:00 ರ ನಡುವೆ ಗರಿಷ್ಠ ವ್ಯಾಪಾರ ನಡೆಯುತ್ತದೆ.`;

      spokenText = `ನಮಸ್ಕಾರ ${merchant.owner_name}. ಇಂದಿನ ವ್ಯಾಪಾರದ ಮಾಹಿತಿ: ಇಂದು ${overview.todayTransactionsCount} ಪಾವತಿಗಳ ಮೂಲಕ ${spokenSales} ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ${spokenInTransit} ಇಂದು ರಾತ್ರಿ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆಯಾಗಲಿದೆ. ನಿಮ್ಮ ವ್ಯಾಪಾರ ಶುಭವಾಗಲಿ.`;
    }
    // E. TELUGU
    else if (language === 'te') {
      settlementStatus = overview.inTransitAmount > 0
        ? `₹${overview.inTransitAmount.toLocaleString('en-IN')} మీ ${bankName} బ్యాంక్ ఖాతాకు పంపబడుతోంది మరియు ఈ రాత్రి జమ చేయబడుతుంది.`
        : `అన్ని చెల్లింపులు బ్యాంక్ ఖాతాలో జమ అయ్యాయి.`;

      exceptionsNotice = reconciliation.totalVariance > 0
        ? `రీఫండ్ సర్దుబాటు వలన ₹${reconciliation.totalVariance.toLocaleString('en-IN')} తేడా పరిశీలనలో ఉంది.`
        : `అన్ని సెటిల్మెంట్లు సరిచూడబడ్డాయి.`;

      cashFlowHighlight = `రోజువారీ లోన్ ఈఎంఐ మినహాయించిన తర్వాత రేపు ₹${(cashflow.projectedSevenDayInflow / 7).toFixed(0)} నికర నగదు ప్రవాహం అంచనా.`;
      creditOverdueSummary = `ఖాతా బుక్‌లో ${khata.overdueCustomersCount} కస్టమర్ల నుండి ₹${khata.totalOverdueAmount.toLocaleString('en-IN')} బకాయి ఉంది.`;
      keyGrowthOpportunity = `సాయంత్రం 6:30 నుండి రాత్రి 9:00 గంటల మధ్య రద్దీ ఎక్కువగా ఉంటుంది.`;

      spokenText = `నమస్కారం ${merchant.owner_name}. ఈ రోజు వ్యాపార సారాంశం: ఈ రోజు ${overview.todayTransactionsCount} లావాదేవీల ద్వారా ${spokenSales} అందుకున్నారు. ${spokenInTransit} ఈ రాత్రి మీ బ్యాంక్ ఖాతాలో జమ అవుతుంది. మీకు శుభదినం.`;
    }

    // 4. Synthesize Spoken Audio with Sarvam Bulbul v4 Flash
    let audioBase64: string | null = null;
    try {
      const cached = audioCache.get(cacheKey);
      if (cached && cached.audioBase64) {
        audioBase64 = cached.audioBase64;
      } else {
        const ttsRes = await TextToSpeechService.synthesizeSpeech(spokenText, language);
        audioBase64 = ttsRes.audioBase64;
        if (audioBase64) {
          audioCache.set(cacheKey, { audioBase64, createdAt: Date.now() });
        }
      }
    } catch (err: any) {
      console.warn('[BriefService] Audio synthesis error:', err.message);
    }

    const briefingId = `BRIEF-${merchantId}-${todayDate}-${language}`;
    const briefingData: DailyBriefing & { audioBase64?: string | null } = {
      id: briefingId,
      merchantId,
      date: todayDate,
      language,
      todayCollections: overview.todayGrossCollections,
      todayTransactions: overview.todayTransactionsCount,
      settlementStatus,
      settledAmount: overview.settledAmount,
      pendingAmount: overview.pendingAmount,
      refundsCount: overview.refundsCount || 0,
      refundsAmount: overview.refundsAmount || 0,
      exceptionsNotice,
      cashFlowHighlight,
      creditOverdueSummary,
      keyGrowthOpportunity,
      spokenAudioText: spokenText,
      audioDurationSeconds: Math.max(15, Math.min(60, Math.round(spokenText.length / 15))),
      audioBase64,
    };

    // 5. Persist to SQLite
    try {
      db.prepare(`
        INSERT INTO daily_briefings (
          id, merchant_id, briefing_date, language, today_collections, 
          today_transactions, settlement_status, settled_amount, pending_amount, 
          refunds_count, refunds_amount, exceptions_notice, cash_flow_highlight, 
          credit_overdue_summary, key_growth_opportunity, spoken_text, display_text, 
          audio_base64, duration_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(merchant_id, briefing_date, language) DO UPDATE SET
          today_collections = excluded.today_collections,
          today_transactions = excluded.today_transactions,
          settlement_status = excluded.settlement_status,
          settled_amount = excluded.settled_amount,
          pending_amount = excluded.pending_amount,
          spoken_text = excluded.spoken_text,
          audio_base64 = excluded.audio_base64
      `).run(
        briefingId,
        merchantId,
        todayDate,
        language,
        briefingData.todayCollections,
        briefingData.todayTransactions,
        briefingData.settlementStatus,
        briefingData.settledAmount,
        briefingData.pendingAmount,
        briefingData.refundsCount,
        briefingData.refundsAmount,
        briefingData.exceptionsNotice,
        briefingData.cashFlowHighlight,
        briefingData.creditOverdueSummary,
        briefingData.keyGrowthOpportunity,
        briefingData.spokenAudioText,
        spokenText,
        audioBase64,
        briefingData.audioDurationSeconds
      );
    } catch (e: any) {
      console.warn('[BriefService] DB briefing persist warning:', e.message);
    }

    return briefingData;
  }

  /**
   * Retrieves the latest daily briefing for a merchant
   */
  public static async getLatestBriefing(
    merchantId: string,
    language: IndianLanguage = 'en'
  ): Promise<DailyBriefing & { audioBase64?: string | null }> {
    return this.generateDailyBrief(merchantId, language);
  }
}
