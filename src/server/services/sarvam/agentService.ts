import { generateJson, generateText, availableProviders } from '../ai/llmService.ts';
import { AppDatabase } from '../../db/database.ts';
import { FinancialEngine } from '../financialEngine.ts';
import { KhataService } from '../khataService.ts';
import { ActionService } from '../actionService.ts';
import { SpeechToTextService } from './speechToText.ts';
import { TextToSpeechService } from './textToSpeech.ts';
import { LanguageService } from './languageService.ts';
import { PaymentVerificationService } from '../paymentVerificationService.ts';
import { MerchantFeeAdvisor } from '../fees/merchantFeeAdvisor.ts';
import { DeviceHealthService } from '../devices/deviceHealthService.ts';
import { FinancialFactVerifier, AuthoritativeFactsPacket } from '../agent/financialFactVerifier.ts';
import { REGISTERED_AGENT_TOOLS } from '../agent/agentTools.ts';
import { AiCostService } from '../ai/aiCostService.ts';
import { IndianLanguage } from '../../../types/index.ts';

export interface ProcessVoiceQueryParams {
  merchantId: string;
  query?: string;
  audioBase64?: string;
  /** MIME type of the recorded audio, e.g. audio/webm (also read from a data: URL prefix). */
  mimeType?: string;
  language?: IndianLanguage;
  authenticated?: boolean;
}

export interface VoiceQueryResponse {
  conversationId: string;
  recognizedTranscript: string;
  agentName: string;
  intentIdentified: string;
  toolInvoked: string;
  isAiFallback: boolean;
  /** Which LLM answered ('gemini' | 'sarvam'), or 'none' when the deterministic path was used. */
  aiProvider: string;
  /** 'llm' when the reply was written by the model and passed the number check, else 'template'. */
  responseSource: 'llm' | 'template';
  responseText: string;
  spokenResponseText: string;
  audioBase64: string | null;
  language: IndianLanguage;
  verifiedData: Record<string, any>;
  actionCard?: any;
  auditTrace: Record<string, any>;
}

export class SarvamAgentService {
  /**
   * Main Voice Agent Entry Point:
   * Sarvam STT -> LLM Intent & Tool Selection -> Authoritative Business Execution ->
   * Strict Financial Number Verification -> Localized Multilingual Phrasing -> Sarvam TTS
   */
  public static async processVoiceQuery(params: ProcessVoiceQueryParams): Promise<VoiceQueryResponse> {
    const startTime = Date.now();
    const { merchantId, language = 'en', audioBase64 } = params;
    const db = AppDatabase.getDB();

    // 1. Verify merchant tenant exists
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(merchantId) as any;
    if (!merchant) {
      throw new Error(`Merchant with id '${merchantId}' not found.`);
    }

    // 2. Transcribe voice if audio provided
    let queryText = (params.query || '').trim();
    let sttDurationSec = 0;
    let sttError: string | undefined;
    if (audioBase64 && !queryText) {
      const sttResult = await SpeechToTextService.transcribeAudio(audioBase64, language, params.mimeType || 'audio/webm');
      queryText = sttResult.transcript.trim();
      sttError = sttResult.error;
      sttDurationSec = 3.5; // Estimated speech duration
    }

    // Audio was sent but nothing was understood: say so instead of silently answering a default question.
    if (audioBase64 && !queryText) {
      return this.buildCouldNotHearResponse(merchantId, language, sttError);
    }

    if (!queryText) {
      queryText = language === 'hi' ? 'आज का व्यापार' : 'Show today collections overview';
    }

    // 3. LLM-Driven Intent Understanding & Tool Selection
    const { selectedTool, toolParams, isAiFallback } = await this.selectToolWithLLM(queryText, merchantId);

    // 4. Authoritative Business Engine Execution (Backend owns all calculations)
    let agentName = 'Merchant Business Orchestrator';
    let verifiedData: Record<string, any> = {};
    let actionCard: any = undefined;
    const allowedAmounts: number[] = [];

    let rawResponseDraft = '';

    switch (selectedTool) {
      case 'verify_payment': {
        agentName = 'Payment Verification Agent';
        const verifyRes = PaymentVerificationService.verifyPayment({
          merchantId,
          amount: toolParams.amount || 850,
          payerQuery: toolParams.payer_name_or_vpa,
        });
        verifiedData = verifyRes;
        allowedAmounts.push(verifyRes.queryAmount);
        for (const m of verifyRes.matchedTransactions) {
          allowedAmounts.push(m.amount);
        }
        rawResponseDraft = verifyRes.detailedMessage;
        break;
      }

      case 'get_settlement_status':
      case 'investigate_settlement': {
        agentName = 'Settlement Intelligence Agent';
        const reconciliation = FinancialEngine.reconcileSettlements(merchantId);
        verifiedData = reconciliation;
        allowedAmounts.push(
          reconciliation.totalGrossCollections,
          reconciliation.totalSettledToBank,
          reconciliation.totalInTransit,
          reconciliation.totalVariance
        );

        if (selectedTool === 'investigate_settlement' || queryText.toLowerCase().includes('dispute') || queryText.toLowerCase().includes('investigat')) {
          actionCard = ActionService.createAction(merchantId, {
            type: 'SETTLEMENT_INVESTIGATION',
            title: 'Initiate Settlement Investigation',
            description: `Dispute requested by voice for variance on recent settlement batch.`,
            createdBy: 'VOICE_AGENT',
            payload: { merchantId, query: queryText },
          });
        }

        rawResponseDraft = reconciliation.totalVariance > 0
          ? `Settlement variance detected: ₹${reconciliation.totalVariance.toLocaleString('en-IN')} is held on escrow. ₹${reconciliation.totalSettledToBank.toLocaleString('en-IN')} has reached your bank.`
          : `All settlements are reconciled. ₹${reconciliation.totalSettledToBank.toLocaleString('en-IN')} is credited and ₹${reconciliation.totalInTransit.toLocaleString('en-IN')} is in transit to ${merchant.bank_name}.`;
        break;
      }

      case 'get_customer_dues':
      case 'prepare_customer_reminder': {
        agentName = 'Customer Dues Agent';
        const khata = KhataService.getKhataOverview(merchantId);
        verifiedData = khata;
        allowedAmounts.push(khata.totalOutstandingDues, khata.totalOverdueAmount);
        for (const c of khata.customers) {
          allowedAmounts.push(c.outstandingBalance);
        }

        if (selectedTool === 'prepare_customer_reminder' || queryText.toLowerCase().includes('remind') || queryText.toLowerCase().includes('याद')) {
          const topCustomer = khata.customers.find((c) => c.status === 'OVERDUE') || khata.customers[0];
          if (topCustomer) {
            const draft = KhataService.prepareReminderAction(merchantId, topCustomer.id);
            actionCard = ActionService.getActions(merchantId).find((a) => a.id === draft.actionId);
          }
        }

        rawResponseDraft = `You have ₹${khata.totalOutstandingDues.toLocaleString('en-IN')} in customer dues, with ₹${khata.totalOverdueAmount.toLocaleString('en-IN')} overdue across ${khata.overdueCustomersCount} customers.`;
        break;
      }

      case 'get_device_health': {
        agentName = 'Soundbox Telemetry Agent';
        const health = DeviceHealthService.getDeviceHealth(merchantId);
        verifiedData = health;
        const mainDevice = health.devices[0];
        if (mainDevice) allowedAmounts.push(mainDevice.batteryLevel);

        rawResponseDraft = health.alerts.length > 0
          ? `Device alert: ${health.alerts[0].message} ${health.alerts[0].recommendedStep}`
          : `Your Paytm Soundbox is healthy and online with ${mainDevice?.batteryLevel || 100}% battery.`;
        break;
      }

      case 'get_merchant_fee_estimate': {
        agentName = 'UPI Fee Advisor Agent';
        const feeAssessment = MerchantFeeAdvisor.evaluateMerchantFees(merchantId);
        verifiedData = feeAssessment;
        allowedAmounts.push(
          feeAssessment.actualFeesDeducted,
          feeAssessment.projectedFeesUnder2026Framework,
          feeAssessment.merchantMonthlyVolume
        );
        rawResponseDraft = feeAssessment.policySummaryNote;
        break;
      }

      case 'get_sales_trends': {
        agentName = 'Merchant Growth Agent';
        const trends = FinancialEngine.getSalesDeclineAnalysis(merchantId);
        verifiedData = trends;
        allowedAmounts.push(trends.currentWeekCollections, trends.previousFourWeekAverage);
        rawResponseDraft = `This week's sales are ₹${trends.currentWeekCollections.toLocaleString('en-IN')}, a ${trends.percentageChange}% change against the previous 4-week average of ₹${trends.previousFourWeekAverage.toLocaleString('en-IN')}.`;
        break;
      }

      case 'get_cashflow_summary': {
        agentName = 'Financial Planning Agent';
        const forecast = FinancialEngine.getCashFlowForecast(merchantId);
        verifiedData = forecast;
        allowedAmounts.push(forecast.projectedSevenDayInflow, forecast.currentBankBalanceEstimate);
        rawResponseDraft = `Projected 7-day bank cash inflow is ₹${forecast.projectedSevenDayInflow.toLocaleString('en-IN')}.`;
        break;
      }

      case 'get_daily_collections':
      default: {
        agentName = 'Merchant Business Orchestrator';
        const overview = FinancialEngine.getFinancialOverview(merchantId);
        verifiedData = overview;
        allowedAmounts.push(
          overview.todayGrossCollections,
          overview.inTransitAmount,
          overview.settledAmount,
          overview.todayAverageTicketSize
        );
        rawResponseDraft = `Today you have received ₹${overview.todayGrossCollections.toLocaleString('en-IN')} across ${overview.todayTransactionsCount} payments. Bank settlement of ₹${overview.inTransitAmount.toLocaleString('en-IN')} is scheduled for tonight.`;
        break;
      }
    }

    // 5. Financial Fact Verification Layer (Strict Zero Hallucination Enforcer)
    const factsPacket: AuthoritativeFactsPacket = {
      intent: selectedTool,
      toolInvoked: selectedTool,
      source: 'merchant_sqlite_authoritative_ledger',
      calculatedAt: new Date().toISOString(),
      facts: verifiedData,
      allowedAmounts,
    };

    // Produce the reply: the LLM answers the merchant's actual question from the verified facts,
    // then every number it used is checked against the ledger. Any mismatch -> deterministic template.
    const templateText = this.buildLocalizedResponseDraft(merchant, selectedTool, language, verifiedData, actionCard);
    let responseSource: 'llm' | 'template' = 'template';
    let aiProvider = 'none';
    let verificationResult = FinancialFactVerifier.verifyAndEnforce(templateText, factsPacket, language);

    const llmReply = await this.phraseAnswerWithLLM({
      queryText,
      language,
      merchant,
      tool: selectedTool,
      verifiedData,
      draft: rawResponseDraft,
      actionCard,
    });
    if (llmReply) {
      const checked = FinancialFactVerifier.verifyAndEnforce(llmReply.text, factsPacket, language);
      if (checked.isValid) {
        verificationResult = checked;
        responseSource = 'llm';
        aiProvider = llmReply.provider;
      } else {
        console.warn(`[Agent] LLM reply rejected by number check ${JSON.stringify(checked.unverifiedNumbersFound)}; using template.`);
      }
    }

    // 6. Synthesize Audio via Sarvam Bulbul v4 Flash
    const ttsResult = await TextToSpeechService.synthesizeSpeech(verificationResult.spokenResponseText, language);
    const ttsDurationSec = Math.max(2, Math.round(verificationResult.spokenResponseText.length / 15));

    // 7. Track AI Metering & Operating Cost
    const latencyMs = Date.now() - startTime;
    AiCostService.recordUsage({
      merchantId,
      modelName: responseSource === 'llm' ? aiProvider : isAiFallback ? 'deterministic-semantic-matcher' : 'llm-router',
      feature: 'VOICE_ASSISTANT',
      inputTokens: Math.round(queryText.length / 4) + 150,
      outputTokens: Math.round(verificationResult.verifiedResponseText.length / 4),
      sttAudioSeconds: sttDurationSec,
      ttsAudioSeconds: ttsDurationSec,
      latencyMs,
      status: 'SUCCESS',
    });

    // 8. Record Immutable Audit Conversation in SQLite
    const conversationId = `CONV-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO voice_conversations (id, merchant_id, language, started_at, ended_at, status)
      VALUES (?, ?, ?, ?, ?, 'COMPLETED')
    `).run(conversationId, merchantId, language, now, now);

    db.prepare(`
      INSERT INTO voice_transcripts (id, conversation_id, speaker, transcript_text, detected_language, intent_identified, tool_invoked, created_at)
      VALUES (?, ?, 'MERCHANT', ?, ?, ?, ?, ?)
    `).run(`TR-U-${Date.now()}`, conversationId, queryText, language, selectedTool, agentName, now);

    db.prepare(`
      INSERT INTO voice_transcripts (id, conversation_id, speaker, transcript_text, detected_language, intent_identified, tool_invoked, created_at)
      VALUES (?, ?, 'ASSISTANT', ?, ?, ?, ?, ?)
    `).run(`TR-A-${Date.now()}`, conversationId, verificationResult.verifiedResponseText, language, selectedTool, agentName, now);

    // Map selected tool to high-level intent code for backward compatibility
    const intentMap: Record<string, string> = {
      get_daily_collections: 'TODAY_COLLECTIONS',
      get_settlement_status: 'RECONCILE_SETTLEMENTS',
      investigate_settlement: 'RECONCILE_SETTLEMENTS',
      get_customer_dues: 'KHATA_AND_CUSTOMER_DUES',
      prepare_customer_reminder: 'KHATA_AND_CUSTOMER_DUES',
      get_device_health: 'DEVICE_HEALTH',
      get_merchant_fee_estimate: 'FEE_ADVISOR',
      get_sales_trends: 'GROWTH_INTELLIGENCE',
      get_cashflow_summary: 'CASH_FLOW_PLANNING',
      verify_payment: 'PAYMENT_VERIFICATION',
    };
    const intentIdentified = intentMap[selectedTool] || 'TODAY_COLLECTIONS';

    return {
      conversationId,
      recognizedTranscript: queryText,
      agentName,
      intentIdentified,
      toolInvoked: selectedTool,
      isAiFallback,
      aiProvider,
      responseSource,
      responseText: verificationResult.verifiedResponseText,
      spokenResponseText: verificationResult.spokenResponseText,
      audioBase64: ttsResult.audioBase64,
      language,
      verifiedData,
      actionCard,
      auditTrace: verificationResult.auditTrace,
    };
  }

  /**
   * Structured Tool Selection using Gemini 2.5 Flash with Deterministic Semantic Fallback
   */
  private static readonly TOOL_NAMES = [
    'get_daily_collections',
    'verify_payment',
    'get_settlement_status',
    'investigate_settlement',
    'get_customer_dues',
    'prepare_customer_reminder',
    'get_device_health',
    'get_merchant_fee_estimate',
    'get_sales_trends',
    'get_cashflow_summary',
  ];

  /**
   * Tool selection with the configured LLM (Gemini or Sarvam), falling back to the keyword
   * classifier only when no LLM is configured or the call fails.
   */
  private static async selectToolWithLLM(queryText: string, _merchantId: string): Promise<{
    selectedTool: string;
    toolParams: Record<string, any>;
    isAiFallback: boolean;
  }> {
    const prompt = `Select the single best business tool for this shop owner's question.
Tools:
- get_daily_collections: today's sales, earnings, payment count.
- verify_payment: whether a specific payment arrived (e.g. "Did 850 from Ravi arrive?"). Extract amount and payer_name_or_vpa.
- get_settlement_status: bank credits, pending or in-transit money, settlement batches.
- investigate_settlement: disputing missing settlement money, holds, variances.
- get_customer_dues: khata / credit ledger, who owes money, overdue amounts.
- prepare_customer_reminder: sending or preparing a payment reminder to a customer.
- get_device_health: Soundbox battery, offline, terminal status.
- get_merchant_fee_estimate: transaction charges, UPI MDR, card fees.
- get_sales_trends: growth, decline, busy hours, comparison with earlier weeks.
- get_cashflow_summary: tomorrow / next week forecast, loan EMI deductions.

The question may be in English, Hindi, Tamil, Kannada, Telugu or a mix.
Question: "${queryText}"

Return JSON: {"selectedTool": string, "toolParams": {"amount"?: number, "payer_name_or_vpa"?: string, "customer_name"?: string}}`;

    const result = await generateJson<{ selectedTool?: string; toolParams?: Record<string, any> }>({
      purpose: 'tool-routing',
      prompt,
      temperature: 0,
      timeoutMs: 5000,
    });

    if (result?.data?.selectedTool && this.TOOL_NAMES.includes(result.data.selectedTool)) {
      return { selectedTool: result.data.selectedTool, toolParams: result.data.toolParams || {}, isAiFallback: false };
    }
    if (result) console.warn(`[Agent] LLM picked unknown tool '${result.data?.selectedTool}'; using keyword classifier.`);

    return this.classifyQuerySemanticFallback(queryText);
  }

  /** Ask the LLM to answer the merchant's question in their language using only verified facts. */
  private static async phraseAnswerWithLLM(params: {
    queryText: string;
    language: IndianLanguage;
    merchant: any;
    tool: string;
    verifiedData: Record<string, any>;
    draft: string;
    actionCard?: any;
  }): Promise<{ text: string; provider: string } | null> {
    if (availableProviders().length === 0) return null;
    const languageName: Record<IndianLanguage, string> = { en: 'English', hi: 'Hindi', ta: 'Tamil', kn: 'Kannada', te: 'Telugu' };
    let facts = JSON.stringify(params.verifiedData);
    if (facts.length > 6000) facts = facts.slice(0, 6000) + '…';

    const system = `You are the voice business assistant for ${params.merchant.owner_name || 'the owner'} of "${params.merchant.business_name || 'the shop'}", a small shop in India.
Reply in ${languageName[params.language]} in a warm, respectful, everyday spoken style. Common English words like UPI, settlement, EMI are fine.
Rules:
- Use ONLY numbers that appear in the facts or the draft. Never invent, round, estimate or calculate new numbers.
- Answer the question that was asked first, in at most 3 short sentences; this will be spoken aloud.
- If an action card was prepared, say it is waiting for the owner's approval. Never say an action was already done.
- Plain text only. No markdown, no lists.`;

    const prompt = `Question: "${params.queryText}"
Tool used: ${params.tool}
Verified facts (JSON): ${facts}
Verified draft answer: ${params.draft}
Action card prepared: ${params.actionCard ? params.actionCard.title || 'yes' : 'none'}`;

    const result = await generateText({ purpose: 'answer-phrasing', system, prompt, temperature: 0.3, timeoutMs: 7000 });
    return result ? { text: result.text, provider: result.provider } : null;
  }

  private static buildCouldNotHearResponse(merchantId: string, language: IndianLanguage, sttError?: string): VoiceQueryResponse {
    const messages: Record<IndianLanguage, string> = {
      en: "Sorry, I couldn't catch that. Please tap the mic and ask again.",
      hi: 'माफ़ कीजिए, मैं सुन नहीं पाया। कृपया माइक दबाकर फिर से पूछें।',
      ta: 'மன்னிக்கவும், சரியாகக் கேட்கவில்லை. மைக்கை அழுத்தி மீண்டும் கேளுங்கள்.',
      kn: 'ಕ್ಷಮಿಸಿ, ಸರಿಯಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ಮೈಕ್ ಒತ್ತಿ ಮತ್ತೆ ಕೇಳಿ.',
      te: 'క్షమించండి, సరిగ్గా వినిపించలేదు. మైక్ నొక్కి మళ్ళీ అడగండి.',
    };
    const text = messages[language] || messages.en;
    return {
      conversationId: `CONV-${Date.now()}`,
      recognizedTranscript: '',
      agentName: 'Merchant Business Orchestrator',
      intentIdentified: 'SPEECH_NOT_RECOGNIZED',
      toolInvoked: 'none',
      isAiFallback: true,
      aiProvider: 'none',
      responseSource: 'template',
      responseText: text,
      spokenResponseText: text,
      audioBase64: null,
      language,
      verifiedData: { merchantId },
      auditTrace: { rule: 'SPEECH_NOT_RECOGNIZED', sttError: sttError || 'empty transcript' },
    };
  }

  /**
   * Deterministic Semantic Fallback: Understands varied phrasings across English, Hindi, Tamil, Kannada, Telugu
   */
  private static classifyQuerySemanticFallback(query: string): {
    selectedTool: string;
    toolParams: Record<string, any>;
    isAiFallback: boolean;
  } {
    const l = query.toLowerCase();

    // 1. Payment Verification e.g. "Did 850 from Ravi arrive?" or "क्या रवि के 850 रुपये आ गए?"
    const amountMatch = query.match(/\b\d+(\.\d+)?\b/);
    if (
      (l.includes('arrive') || l.includes('received') || l.includes('check') || l.includes('आए') || l.includes('आ गए') || l.includes('வந்ததா') || l.includes('ಬಂತಾ')) &&
      amountMatch
    ) {
      const amt = Number(amountMatch[0]);
      // Extract payer name
      const words = query.split(/\s+/).filter((w) => !w.match(/^\d+$/) && !w.startsWith('₹'));
      const payer = words.length > 2 ? words[words.length - 2] : undefined;
      return {
        selectedTool: 'verify_payment',
        toolParams: { amount: amt, payer_name_or_vpa: payer },
        isAiFallback: true,
      };
    }

    // 2. Settlement
    if (
      l.includes('settle') || l.includes('bank') || l.includes('utr') || l.includes('pending') ||
      l.includes('delay') || l.includes('hold') || l.includes('अटका') || l.includes('कब आएगा') ||
      l.includes('सेटलमेंट') || l.includes('विवाद') || l.includes('செட்டில்') || l.includes('ಸೆಟಲ್')
    ) {
      if (l.includes('dispute') || l.includes('investigat')) {
        return { selectedTool: 'investigate_settlement', toolParams: {}, isAiFallback: true };
      }
      return { selectedTool: 'get_settlement_status', toolParams: {}, isAiFallback: true };
    }

    // 3. Khata & Dues
    if (
      l.includes('khata') || l.includes('due') || l.includes('owe') || l.includes('credit') ||
      l.includes('remind') || l.includes('उधार') || l.includes('बाकी') || l.includes('கடன்கள்') ||
      l.includes('ಸಾಲ') || l.includes('याद')
    ) {
      if (l.includes('remind') || l.includes('याद')) {
        return { selectedTool: 'prepare_customer_reminder', toolParams: {}, isAiFallback: true };
      }
      return { selectedTool: 'get_customer_dues', toolParams: {}, isAiFallback: true };
    }

    // 4. Device health
    if (
      l.includes('device') || l.includes('soundbox') || l.includes('battery') || l.includes('offline') ||
      l.includes('चार्ज') || l.includes('बैटरी') || l.includes('साउंडबॉक्स') || l.includes('பேட்டரி')
    ) {
      return { selectedTool: 'get_device_health', toolParams: {}, isAiFallback: true };
    }

    // 5. Fee advisor
    if (
      l.includes('fee') || l.includes('charge') || l.includes('mdr') || l.includes('rate') ||
      l.includes('कटौती') || l.includes('शुल्क') || l.includes('கட்டணம்') || l.includes('ಶುಲ್ಕ')
    ) {
      return { selectedTool: 'get_merchant_fee_estimate', toolParams: {}, isAiFallback: true };
    }

    // 6. Growth & trends
    if (
      l.includes('growth') || l.includes('decline') || l.includes('trend') || l.includes('rush') ||
      l.includes('बिक्री') || l.includes('दुकान') || l.includes('விற்பனை') || l.includes('ಮಾರಾಟ')
    ) {
      return { selectedTool: 'get_sales_trends', toolParams: {}, isAiFallback: true };
    }

    // 7. Cash flow & planning
    if (l.includes('plan') || l.includes('tomorrow') || l.includes('forecast') || l.includes('कल का')) {
      return { selectedTool: 'get_cashflow_summary', toolParams: {}, isAiFallback: true };
    }

    // Default: daily collections
    return { selectedTool: 'get_daily_collections', toolParams: {}, isAiFallback: true };
  }

  /**
   * Constructs localized response text across English, Hindi, Tamil, Kannada, and Telugu
   */
  private static buildLocalizedResponseDraft(
    merchant: any,
    tool: string,
    language: IndianLanguage,
    data: any,
    actionCard?: any
  ): string {
    const owner = merchant.owner_name;

    // 1. English (Default)
    if (language === 'en') {
      if (tool === 'get_daily_collections') {
        return `Today you have received ₹${data.todayGrossCollections.toLocaleString('en-IN')} across ${data.todayTransactionsCount} payments. ₹${data.inTransitAmount.toLocaleString('en-IN')} is scheduled to be credited to your ${merchant.bank_name} account tonight.`;
      }
      if (tool === 'verify_payment') {
        return data.detailedMessage;
      }
      if (tool === 'get_settlement_status') {
        return data.totalVariance > 0
          ? `Settlement variance detected: ₹${data.totalVariance.toLocaleString('en-IN')} is held on escrow. ₹${data.totalSettledToBank.toLocaleString('en-IN')} has reached your bank.`
          : `All settlements are reconciled. ₹${data.totalSettledToBank.toLocaleString('en-IN')} is credited and ₹${data.totalInTransit.toLocaleString('en-IN')} is in transit to ${merchant.bank_name}.`;
      }
      if (tool === 'get_customer_dues') {
        return `You have ₹${data.totalOutstandingDues.toLocaleString('en-IN')} in customer dues, with ₹${data.totalOverdueAmount.toLocaleString('en-IN')} overdue across ${data.overdueCustomersCount} customers.`;
      }
      if (tool === 'get_device_health') {
        const d = data.devices[0];
        return data.alerts.length > 0
          ? `${data.alerts[0].message} ${data.alerts[0].recommendedStep}`
          : `Your Soundbox is online with ${d?.batteryLevel || 100}% battery. Everything is working normally.`;
      }
      if (tool === 'get_merchant_fee_estimate') {
        return data.policySummaryNote;
      }
      if (tool === 'get_sales_trends') {
        return `Your rolling 4-week sales stand at ₹${data.currentFourWeekAverage.toLocaleString('en-IN')}, a ${data.percentageChange}% change vs prior month.`;
      }
      if (tool === 'get_cashflow_summary') {
        return `Projected 7-day bank cash inflow is ₹${data.projectedSevenDayInflow.toLocaleString('en-IN')}.`;
      }
    }

    // 2. Hindi
    if (language === 'hi') {
      if (tool === 'get_daily_collections') {
        return `नमस्ते ${owner} जी, आज आपकी कुल बिक्री ₹${data.todayGrossCollections.toLocaleString('en-IN')} रही जो ${data.todayTransactionsCount} पेमेंट्स से आई है। ₹${data.inTransitAmount.toLocaleString('en-IN')} आज रात आपके बैंक खाते में जमा हो जाएंगे।`;
      }
      if (tool === 'verify_payment') {
        return data.spokenSummary;
      }
      if (tool === 'get_settlement_status') {
        return data.totalVariance > 0
          ? `सुनील जी, ₹${data.totalVariance.toLocaleString('en-IN')} की राशि बैंक सत्यापन के कारण रुकी हुई है। ₹${data.totalSettledToBank.toLocaleString('en-IN')} आपके खाते में आ चुके हैं।`
          : `आपके सभी सेटलमेंट मेल खा चुके हैं। ₹${data.totalSettledToBank.toLocaleString('en-IN')} आपके बैंक में जमा हो चुके हैं।`;
      }
      if (tool === 'get_customer_dues') {
        return `आपके खाता बही में कुल ₹${data.totalOutstandingDues.toLocaleString('en-IN')} का बकाया है, जिसमें ₹${data.totalOverdueAmount.toLocaleString('en-IN')} की उधारी ${data.overdueCustomersCount} ग्राहकों पर अतिदेय है।`;
      }
      if (tool === 'get_device_health') {
        const d = data.devices[0];
        return `आपका साउंडबॉक्स चालू है और बैटरी ${d?.batteryLevel || 100}% है।`;
      }
      if (tool === 'get_merchant_fee_estimate') {
        return `यूपीआई पर वर्तमान में 0% शुल्क है। ₹2000 से कम के सभी भुगतान हमेशा निःशुल्क रहेंगे।`;
      }
    }

    // 3. Tamil
    if (language === 'ta') {
      if (tool === 'get_daily_collections') {
        return `வணக்கம் ${owner}, இன்று நீங்கள் ${data.todayTransactionsCount} பரிவர்த்தனைகள் மூலம் ₹${data.todayGrossCollections.toLocaleString('en-IN')} பெற்றுள்ளீர்கள். ₹${data.inTransitAmount.toLocaleString('en-IN')} இன்று இரவு உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும்.`;
      }
      if (tool === 'verify_payment') {
        return data.spokenSummary;
      }
      if (tool === 'get_settlement_status') {
        return `வங்கிக் கணக்கில் ₹${data.totalSettledToBank.toLocaleString('en-IN')} வரவு வைக்கப்பட்டுள்ளது. ₹${data.totalInTransit.toLocaleString('en-IN')} செயல்பாட்டில் உள்ளது.`;
      }
      if (tool === 'get_customer_dues') {
        return `மொத்த நிலுவைத் தொகை ₹${data.totalOutstandingDues.toLocaleString('en-IN')}. இதில் ${data.overdueCustomersCount} வாடிக்கையாளர்களிடம் ₹${data.totalOverdueAmount.toLocaleString('en-IN')} நிலுவையில் உள்ளது.`;
      }
    }

    // 4. Kannada
    if (language === 'kn') {
      if (tool === 'get_daily_collections') {
        return `ನಮಸ್ಕಾರ ${owner}, ಇಂದು ${data.todayTransactionsCount} ಪಾವತಿಗಳ ಮೂಲಕ ₹${data.todayGrossCollections.toLocaleString('en-IN')} ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ₹${data.inTransitAmount.toLocaleString('en-IN')} ಇಂದು ರಾತ್ರಿ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆಯಾಗಲಿದೆ.`;
      }
      if (tool === 'get_settlement_status') {
        return `ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ₹${data.totalSettledToBank.toLocaleString('en-IN')} ಜಮೆಯಾಗಿದೆ. ₹${data.totalInTransit.toLocaleString('en-IN')} ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ.`;
      }
      if (tool === 'get_customer_dues') {
        return `ಒಟ್ಟು ಬಾಕಿ ₹${data.totalOutstandingDues.toLocaleString('en-IN')} ಆಗಿದೆ.`;
      }
    }

    // 5. Telugu
    if (language === 'te') {
      if (tool === 'get_daily_collections') {
        return `నమస్కారం ${owner}, ఈ రోజు ${data.todayTransactionsCount} చెల్లింపుల ద్వారా ₹${data.todayGrossCollections.toLocaleString('en-IN')} అందుకున్నారు. ₹${data.inTransitAmount.toLocaleString('en-IN')} ఈ రాత్రి మీ బ్యాంక్ ఖాతాలో జమ అవుతుంది.`;
      }
      if (tool === 'get_settlement_status') {
        return `మీ బ్యాంక్ ఖాతాలో ₹${data.totalSettledToBank.toLocaleString('en-IN')} జమ చేయబడింది.`;
      }
      if (tool === 'get_customer_dues') {
        return `మొత్తం బకాయిలు ₹${data.totalOutstandingDues.toLocaleString('en-IN')} ఉన్నాయి.`;
      }
    }

    // Fallback safe english draft
    return `Today's collections stand at ₹${(data.todayGrossCollections || 0).toLocaleString('en-IN')}.`;
  }
}
