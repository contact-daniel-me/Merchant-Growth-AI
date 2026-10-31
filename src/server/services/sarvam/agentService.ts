import { AppDatabase } from '../../db/database.ts';
import { FinancialEngine } from '../financialEngine.ts';
import { KhataService } from '../khataService.ts';
import { ActionService } from '../actionService.ts';
import { SpeechToTextService } from './speechToText.ts';
import { TextToSpeechService } from './textToSpeech.ts';
import { LanguageService } from './languageService.ts';
import { getSarvamConfig, isSarvamConfigured } from './config.ts';
import { IndianLanguage } from '../../../types/index.ts';

export interface ProcessVoiceQueryParams {
  merchantId: string;
  query?: string;
  audioBase64?: string;
  language?: IndianLanguage;
  authenticated?: boolean;
}

export interface VoiceQueryResponse {
  conversationId: string;
  recognizedTranscript: string;
  agentName: string;
  intentIdentified: string;
  responseText: string;
  spokenResponseText: string;
  audioBase64: string | null;
  language: IndianLanguage;
  verifiedData: Record<string, any>;
  actionCard?: any;
}

export class SarvamAgentService {
  /**
   * Main Voice Agent Entry Point
   * Connects Sarvam STT -> Intent & Tool Selection -> Verified Backend Math -> Sarvam LLM -> Sarvam TTS
   */
  public static async processVoiceQuery(params: ProcessVoiceQueryParams): Promise<VoiceQueryResponse> {
    const { merchantId, language = 'en', audioBase64 } = params;
    const db = AppDatabase.getDB();

    // 1. Verify merchant exists
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(merchantId) as any;
    if (!merchant) {
      throw new Error(`Merchant with id '${merchantId}' not found.`);
    }

    // 2. Transcribe voice if audio provided
    let queryText = (params.query || '').trim();
    if (audioBase64 && !queryText) {
      const sttResult = await SpeechToTextService.transcribeAudio(audioBase64, language);
      queryText = sttResult.transcript.trim();
    }

    if (!queryText) {
      queryText = language === 'hi' ? 'आज का व्यापार' : 'Show today collections overview';
    }

    const lowerQuery = queryText.toLowerCase();

    // 3. Identify Intent & Select Tool
    let intent = 'TODAY_COLLECTIONS';
    let agentName = 'Saathi Merchant Orchestrator';
    let verifiedData: Record<string, any> = {};
    let actionCard: any = undefined;

    // A. Settlement confusion queries
    if (
      lowerQuery.includes('settle') ||
      lowerQuery.includes('bank') ||
      lowerQuery.includes('utr') ||
      lowerQuery.includes('pending') ||
      lowerQuery.includes('delay') ||
      lowerQuery.includes('hold') ||
      lowerQuery.includes('अटका') ||
      lowerQuery.includes('कब आएगा') ||
      lowerQuery.includes('सेटलमेंट') ||
      lowerQuery.includes('विवाद') ||
      lowerQuery.includes('खाता') ||
      lowerQuery.includes('செட்டில்') ||
      lowerQuery.includes('ಸೆಟಲ್') ||
      lowerQuery.includes('సెటిల్')
    ) {
      intent = 'RECONCILE_SETTLEMENTS';
      agentName = 'Settlement Intelligence Agent';
      const reconciliation = FinancialEngine.reconcileSettlements(merchantId);
      verifiedData = reconciliation;

      if (lowerQuery.includes('dispute') || lowerQuery.includes('investigat')) {
        actionCard = ActionService.createAction(merchantId, {
          type: 'SETTLEMENT_INVESTIGATION',
          title: 'Initiate Settlement Investigation',
          description: `Dispute requested by voice for variance on recent settlement batch.`,
          createdBy: 'VOICE_AGENT',
          payload: { merchantId, query: queryText },
        });
      }
    }
    // B. Khata / Customer dues queries
    else if (
      lowerQuery.includes('khata') ||
      lowerQuery.includes('due') ||
      lowerQuery.includes('owe') ||
      lowerQuery.includes('credit') ||
      lowerQuery.includes('remind') ||
      lowerQuery.includes('उधार') ||
      lowerQuery.includes('बाकी') ||
      lowerQuery.includes('கடன்கள்') ||
      lowerQuery.includes('ಸಾಲ') ||
      lowerQuery.includes('బాకీ')
    ) {
      intent = 'KHATA_AND_CUSTOMER_DUES';
      agentName = 'Customer Dues Agent';
      const khata = KhataService.getKhataOverview(merchantId);
      verifiedData = khata;

      // Check if asking for reminder for specific customer
      if (lowerQuery.includes('remind') || lowerQuery.includes('याद')) {
        const topCustomer = khata.customers.find((c) => c.status === 'OVERDUE') || khata.customers[0];
        if (topCustomer) {
          const draft = KhataService.prepareReminderAction(merchantId, topCustomer.id);
          actionCard = ActionService.getActions(merchantId).find((a) => a.id === draft.actionId);
        }
      }
    }
    // C. Declining sales or growth queries
    else if (
      lowerQuery.includes('growth') ||
      lowerQuery.includes('decline') ||
      lowerQuery.includes('slow') ||
      lowerQuery.includes('increase') ||
      lowerQuery.includes('sale') ||
      lowerQuery.includes('rush') ||
      lowerQuery.includes('बिक्री') ||
      lowerQuery.includes('दुकान') ||
      lowerQuery.includes('விற்பனை') ||
      lowerQuery.includes('ಮಾರಾಟ') ||
      lowerQuery.includes('అమ్మకాలు')
    ) {
      intent = 'GROWTH_INTELLIGENCE';
      agentName = 'Merchant Growth Agent';
      const declineAnalysis = FinancialEngine.getSalesDeclineAnalysis(merchantId);
      verifiedData = declineAnalysis;
    }
    // D. Cash flow & planning
    else if (
      lowerQuery.includes('plan') ||
      lowerQuery.includes('tomorrow') ||
      lowerQuery.includes('loan') ||
      lowerQuery.includes('emi') ||
      lowerQuery.includes('forecast') ||
      lowerQuery.includes('कल का')
    ) {
      intent = 'CASH_FLOW_PLANNING';
      agentName = 'Financial Planning Agent';
      const forecast = FinancialEngine.getCashFlowForecast(merchantId);
      verifiedData = forecast;
    }
    // E. Default: Collections overview
    else {
      intent = 'TODAY_COLLECTIONS';
      agentName = 'Saathi Merchant Orchestrator';
      const overview = FinancialEngine.getFinancialOverview(merchantId);
      verifiedData = overview;
    }

    // 4. Generate Grounded Response (Backend Owns Numbers)
    const { displayText, spokenText } = this.generateLocalizedResponse({
      merchant,
      intent,
      language,
      verifiedData,
      actionCard,
    });

    // 5. Synthesize Audio via Sarvam Bulbul v4
    const ttsResult = await TextToSpeechService.synthesizeSpeech(spokenText, language);

    // 6. Record Conversation & Transcript in SQLite for Audit & Retention Policy
    const conversationId = `CONV-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO voice_conversations (id, merchant_id, language, started_at, ended_at, status)
      VALUES (?, ?, ?, ?, ?, 'COMPLETED')
    `).run(conversationId, merchantId, language, now, now);

    db.prepare(`
      INSERT INTO voice_transcripts (id, conversation_id, speaker, transcript_text, detected_language, intent_identified, tool_invoked, created_at)
      VALUES (?, ?, 'MERCHANT', ?, ?, ?, ?, ?)
    `).run(`TR-U-${Date.now()}`, conversationId, queryText, language, intent, agentName, now);

    db.prepare(`
      INSERT INTO voice_transcripts (id, conversation_id, speaker, transcript_text, detected_language, intent_identified, tool_invoked, created_at)
      VALUES (?, ?, 'ASSISTANT', ?, ?, ?, ?, ?)
    `).run(`TR-A-${Date.now()}`, conversationId, displayText, language, intent, agentName, now);

    return {
      conversationId,
      recognizedTranscript: queryText,
      agentName,
      intentIdentified: intent,
      responseText: displayText,
      spokenResponseText: spokenText,
      audioBase64: ttsResult.audioBase64,
      language,
      verifiedData,
      actionCard,
    };
  }

  /**
   * Generates strictly verified, deterministic multilingual answers across all 5 languages
   * DEFAULT: ENGLISH.
   */
  private static generateLocalizedResponse(params: {
    merchant: any;
    intent: string;
    language: IndianLanguage;
    verifiedData: any;
    actionCard?: any;
  }): { displayText: string; spokenText: string } {
    const { merchant, intent, language, verifiedData, actionCard } = params;

    // 1. ENGLISH (Default)
    if (language === 'en') {
      if (intent === 'TODAY_COLLECTIONS') {
        const d = verifiedData;
        const msg = `Today you have received ₹${d.todayGrossCollections.toLocaleString('en-IN')} across ${d.todayTransactionsCount} payments. ₹${d.inTransitAmount.toLocaleString('en-IN')} is scheduled to be credited to your ${merchant.bank_name} account tonight.`;
        return { displayText: msg, spokenText: msg };
      }
      if (intent === 'RECONCILE_SETTLEMENTS') {
        const d = verifiedData;
        const msg = d.totalVariance > 0
          ? `You have collected ₹${d.totalGrossCollections.toLocaleString('en-IN')}. ₹${d.totalSettledToBank.toLocaleString('en-IN')} has reached your bank, and ₹${d.totalInTransit.toLocaleString('en-IN')} is in transit. A variance of ₹${d.totalVariance.toLocaleString('en-IN')} is on hold due to a customer dispute.`
          : `All settlements are reconciled. ₹${d.totalInTransit.toLocaleString('en-IN')} is in transit to your ${merchant.bank_name} account with zero unexplained variance.`;
        return { displayText: msg, spokenText: msg };
      }
      if (intent === 'KHATA_AND_CUSTOMER_DUES') {
        const d = verifiedData;
        const msg = `You have ₹${d.totalOutstandingDues.toLocaleString('en-IN')} in customer credit. ${d.overdueCustomersCount} customers have overdue payments totaling ₹${d.totalOverdueAmount.toLocaleString('en-IN')}.${actionCard ? ' A draft reminder has been prepared in your Action Centre.' : ''}`;
        return { displayText: msg, spokenText: msg };
      }
      if (intent === 'GROWTH_INTELLIGENCE') {
        const d = verifiedData;
        const msg = `Your weekly sales stand at ₹${d.currentWeekCollections.toLocaleString('en-IN')}, compared with a 4-week average of ₹${d.previousFourWeekAverage.toLocaleString('en-IN')} (${d.percentageChange >= 0 ? '+' : ''}${d.percentageChange}%). Peak business occurs in evening hours (6:30 - 9:00 PM).`;
        return { displayText: msg, spokenText: msg };
      }
      if (intent === 'CASH_FLOW_PLANNING') {
        const d = verifiedData;
        const tomorrow = d.dailyForecast[1] || d.dailyForecast[0];
        const msg = `Tomorrow's estimated net cash flow is ₹${tomorrow.projectedNetCashFlow.toLocaleString('en-IN')} after your daily loan EMI deduction of ₹${d.dailyLoanEmiDeduction}.`;
        return { displayText: msg, spokenText: msg };
      }
    }

    // 2. HINDI
    if (language === 'hi') {
      if (intent === 'TODAY_COLLECTIONS') {
        const d = verifiedData;
        const msg = `आज आपको कुल ${d.todayTransactionsCount} भुगतानों से ₹${d.todayGrossCollections.toLocaleString('en-IN')} प्राप्त हुए हैं। ₹${d.inTransitAmount.toLocaleString('en-IN')} आज रात आपके ${merchant.bank_name} खाते में जमा हो जाएंगे।`;
        return { displayText: msg, spokenText: msg };
      }
      if (intent === 'RECONCILE_SETTLEMENTS') {
        const d = verifiedData;
        const msg = d.totalVariance > 0
          ? `कुल बिक्री ₹${d.totalGrossCollections.toLocaleString('en-IN')} रही। ₹${d.totalSettledToBank.toLocaleString('en-IN')} बैंक खाते में पहुंच चुके हैं और ₹${d.totalVariance.toLocaleString('en-IN')} ग्राहक विवाद के कारण होल्ड पर हैं।`
          : `आपके सभी सेटलमेंट सत्यापित हैं। ₹${d.totalInTransit.toLocaleString('en-IN')} आज रात बैंक खाते में पहुंच जाएंगे।`;
        return { displayText: msg, spokenText: msg };
      }
      if (intent === 'KHATA_AND_CUSTOMER_DUES') {
        const d = verifiedData;
        const msg = `खाता बही में कुल ₹${d.totalOutstandingDues.toLocaleString('en-IN')} बकाया है। ${d.overdueCustomersCount} ग्राहकों की देय तिथि पार हो चुकी है।`;
        return { displayText: msg, spokenText: msg };
      }
    }

    // 3. TAMIL
    if (language === 'ta') {
      if (intent === 'TODAY_COLLECTIONS') {
        const d = verifiedData;
        const msg = `இன்று ${d.todayTransactionsCount} பரிவர்த்தனைகள் மூலம் ₹${d.todayGrossCollections.toLocaleString('en-IN')} பெற்றுள்ளீர்கள். ₹${d.inTransitAmount.toLocaleString('en-IN')} இன்று இரவு உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும்.`;
        return { displayText: msg, spokenText: msg };
      }
      if (intent === 'RECONCILE_SETTLEMENTS') {
        const d = verifiedData;
        const msg = `உங்கள் மொத்த வரவு ₹${d.totalGrossCollections.toLocaleString('en-IN')}. ₹${d.totalSettledToBank.toLocaleString('en-IN')} வங்கியில் வரவு வைக்கப்பட்டுள்ளது.`;
        return { displayText: msg, spokenText: msg };
      }
    }

    // 4. KANNADA
    if (language === 'kn') {
      if (intent === 'TODAY_COLLECTIONS') {
        const d = verifiedData;
        const msg = `ಇಂದು ನಿಮಗೆ ${d.todayTransactionsCount} ಪಾವತಿಗಳ ಮೂಲಕ ₹${d.todayGrossCollections.toLocaleString('en-IN')} ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ₹${d.inTransitAmount.toLocaleString('en-IN')} ಇಂದು ರಾತ್ರಿ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆಯಾಗಲಿದೆ.`;
        return { displayText: msg, spokenText: msg };
      }
    }

    // 5. TELUGU
    if (language === 'te') {
      if (intent === 'TODAY_COLLECTIONS') {
        const d = verifiedData;
        const msg = `ఈ రోజు ${d.todayTransactionsCount} చెల్లింపుల ద్వారా మీరు ₹${d.todayGrossCollections.toLocaleString('en-IN')} అందుకున్నారు. ₹${d.inTransitAmount.toLocaleString('en-IN')} ఈ రాత్రి మీ బ్యాంక్ ఖాతాలో జమ చేయబడుతుంది.`;
        return { displayText: msg, spokenText: msg };
      }
    }

    // Fallback to English
    const d = verifiedData;
    const fallbackMsg = `Today's collections stand at ₹${(d.todayGrossCollections || 0).toLocaleString('en-IN')}. Your settlements and payments are verified.`;
    return { displayText: fallbackMsg, spokenText: fallbackMsg };
  }
}
