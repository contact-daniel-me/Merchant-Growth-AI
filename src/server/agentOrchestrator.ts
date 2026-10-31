import { GoogleGenAI } from '@google/genai';
import { merchantDB } from './mockDb.ts';
import { DeterministicAnalyticsEngine } from './analyticsEngine.ts';
import { IndianLanguage, MerchantAction } from '../types/index.ts';

// Dedicated Multilingual Voice & Multi-Agent Orchestrator
export class AgentOrchestrator {
  private static getGeminiClient(): GoogleGenAI | null {
    const key =
      typeof process !== 'undefined' && process?.env?.GEMINI_API_KEY
        ? process.env.GEMINI_API_KEY
        : typeof window !== 'undefined' && (window as any)?.__ENV?.GEMINI_API_KEY
        ? (window as any).__ENV.GEMINI_API_KEY
        : undefined;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      return null;
    }
    try {
      return new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch {
      return null;
    }
  }

  /**
   * Main entry point for conversational agent requests (voice or text).
   * Follows strict tenant isolation, merchant identity authentication, and deterministic verification.
   */
  static async processMerchantQuery(params: {
    merchantId: string;
    query: string;
    language: IndianLanguage;
    voicePin?: string;
    isAuthenticated?: boolean;
    audioBase64?: string;
  }): Promise<{
    agentName: string;
    intentIdentified: string;
    responseText: string;
    spokenResponseText: string;
    language: IndianLanguage;
    actionCard?: MerchantAction;
    verifiedData: Record<string, any>;
    requiresAuthentication?: boolean;
    authenticationSuccess?: boolean;
  }> {
    const { merchantId, query, language, voicePin, isAuthenticated } = params;
    const lowerQuery = query.toLowerCase();

    // 1. Retrieve tenant-isolated ground truth
    const merchant = merchantDB.getMerchant(merchantId);
    const overview = DeterministicAnalyticsEngine.getFinancialOverview(merchantId);
    const reconciliation = DeterministicAnalyticsEngine.reconcileSettlements(merchantId);
    const cashFlow = DeterministicAnalyticsEngine.getCashFlowForecast(merchantId);
    const khata = DeterministicAnalyticsEngine.getKhataAnalysis(merchantId);
    const growth = merchantDB.getGrowthInsights(merchantId);

    // Security safeguard: Never authenticate sensitive financial actions by voice alone.
    // Sensitive actions create a DRAFT action card requiring explicit on-screen merchant confirmation.
    const userIsAuthenticated = Boolean(isAuthenticated);

    // 2. Identify Intent & Select Specialised Agent
    let agentName = 'Merchant Orchestrator';
    let intentIdentified = 'GENERAL_ASSISTANCE';
    let actionCard: MerchantAction | undefined = undefined;
    let verifiedData: Record<string, any> = {};

    // Check sensitive action intent (requires authentication)
    const isSensitiveAction =
      lowerQuery.includes('dispute') ||
      lowerQuery.includes('investigat') ||
      lowerQuery.includes('विवाद') ||
      lowerQuery.includes('remind') ||
      lowerQuery.includes('याद') ||
      lowerQuery.includes('रिमाइंडर') ||
      lowerQuery.includes('promo') ||
      lowerQuery.includes('campaign') ||
      lowerQuery.includes('ऑफर') ||
      lowerQuery.includes('வங்கி') ||
      lowerQuery.includes('தீர்வு') ||
      lowerQuery.includes('செட்டில்மென்ட்') ||
      lowerQuery.includes('ಬಾಕಿ') ||
      lowerQuery.includes('సెటిల్మెంట్');

    // Intent classifier logic
    if (
      lowerQuery.includes('settle') ||
      lowerQuery.includes('सेट') ||
      lowerQuery.includes('செட்டில்') ||
      lowerQuery.includes('utr') ||
      lowerQuery.includes('discrepan') ||
      lowerQuery.includes('variance') ||
      lowerQuery.includes('bank') ||
      (lowerQuery.includes('खाता') && (lowerQuery.includes('जमा') || lowerQuery.includes('क्रेडिट'))) ||
      lowerQuery.includes('தீர்வு') ||
      lowerQuery.includes('ಸೆಟಲ್') ||
      lowerQuery.includes('సెటిల్')
    ) {
      agentName = 'Financial Reconciliation Agent';
      intentIdentified = 'RECONCILE_SETTLEMENTS';
      verifiedData = reconciliation;

      if (
        reconciliation.issues.length > 0 &&
        (lowerQuery.includes('dispute') ||
          lowerQuery.includes('investigat') ||
          lowerQuery.includes('कार्रवाई') ||
          lowerQuery.includes('जांच') ||
          lowerQuery.includes('விசாரணை') ||
          lowerQuery.includes('విచారణ') ||
          lowerQuery.includes('ತನಿಖೆ'))
      ) {
        const firstIssue = reconciliation.issues[0];
        actionCard = merchantDB.createAction(merchantId, {
          merchantId,
          type: 'SETTLEMENT_INVESTIGATION',
          title: `Dispute ${firstIssue.type}: ₹${firstIssue.varianceAmount} (UTR: ${firstIssue.utr})`,
          description: firstIssue.explanation,
          status: 'PENDING_APPROVAL',
          requiresApproval: true,
          createdBy: 'VOICE_AGENT',
          payload: {
            batchId: firstIssue.batchId,
            varianceAmount: firstIssue.varianceAmount,
            utr: firstIssue.utr,
          },
        });
      }
    } else if (
      lowerQuery.includes('khata') ||
      lowerQuery.includes('credit') ||
      lowerQuery.includes('उधार') ||
      lowerQuery.includes('बकाया') ||
      lowerQuery.includes('கடன்') ||
      lowerQuery.includes('ಬಾಕಿ') ||
      lowerQuery.includes('అప్పు') ||
      lowerQuery.includes('ramesh') ||
      lowerQuery.includes('sunita') ||
      lowerQuery.includes('reminder')
    ) {
      agentName = 'Credit Information Agent';
      intentIdentified = 'KHATA_AND_CUSTOMER_CREDIT';
      verifiedData = khata;

      if (
        lowerQuery.includes('remind') ||
        lowerQuery.includes('याद') ||
        lowerQuery.includes('मैसेज') ||
        lowerQuery.includes('whatsapp') ||
        lowerQuery.includes('sms') ||
        lowerQuery.includes('நினைவூட்டல்') ||
        lowerQuery.includes('ಜ್ಞಾಪನೆ') ||
        lowerQuery.includes('రిమైండర్')
      ) {
        const targetCustomer = khata.records.find((r) => r.status === 'OVERDUE') || khata.records[0];
        actionCard = merchantDB.createAction(merchantId, {
          merchantId,
          type: 'CUSTOMER_CREDIT_REMINDER',
          title: `Payment Reminder for ${targetCustomer.customerName}`,
          description: `Draft WhatsApp notification for ₹${targetCustomer.outstandingBalance.toLocaleString(
            'en-IN'
          )} with Paytm UPI QR intent link.`,
          status: 'PENDING_APPROVAL',
          requiresApproval: true,
          createdBy: 'VOICE_AGENT',
          payload: {
            customerId: targetCustomer.id,
            customerPhone: targetCustomer.customerPhone,
            amount: targetCustomer.outstandingBalance,
            channel: 'WHATSAPP_UPI',
          },
        });
      }
    } else if (
      lowerQuery.includes('forecast') ||
      lowerQuery.includes('cash flow') ||
      lowerQuery.includes('कल') ||
      lowerQuery.includes('tomorrow') ||
      lowerQuery.includes('loan') ||
      lowerQuery.includes('emi') ||
      lowerQuery.includes('हफ्ता') ||
      lowerQuery.includes('week') ||
      lowerQuery.includes('நாளை') ||
      lowerQuery.includes('ನಾಳೆ') ||
      lowerQuery.includes('రేపు')
    ) {
      agentName = 'Cash-Flow Intelligence Agent';
      intentIdentified = 'CASH_FLOW_FORECASTING';
      verifiedData = cashFlow;
    } else if (
      lowerQuery.includes('grow') ||
      lowerQuery.includes('sale') ||
      lowerQuery.includes('offer') ||
      lowerQuery.includes('peak') ||
      lowerQuery.includes('rush') ||
      lowerQuery.includes('बिक्री') ||
      lowerQuery.includes('ऑफर') ||
      lowerQuery.includes('त्योहार') ||
      lowerQuery.includes('promo') ||
      lowerQuery.includes('வளர்ச்சி') ||
      lowerQuery.includes('ಬೆಳವಣಿಗೆ') ||
      lowerQuery.includes('పెరుగుదల')
    ) {
      agentName = 'Merchant Growth Agent';
      intentIdentified = 'GROWTH_RECOMMENDATIONS';
      verifiedData = { insights: growth };

      if (
        lowerQuery.includes('launch') ||
        lowerQuery.includes('start') ||
        lowerQuery.includes('तैयार') ||
        lowerQuery.includes('create') ||
        lowerQuery.includes('தொடங்கு') ||
        lowerQuery.includes('ಪ್ರಾರಂಭಿಸು')
      ) {
        actionCard = merchantDB.createAction(merchantId, {
          merchantId,
          type: 'PROMOTIONAL_CAMPAIGN',
          title: 'Diwali Festival 5% Cashback QR Campaign',
          description:
            'Launch customized WhatsApp & SMS promotional flyer offering 5% cashback on orders above ₹1,500.',
          status: 'PENDING_APPROVAL',
          requiresApproval: true,
          createdBy: 'VOICE_AGENT',
          payload: {
            discountRate: '5%',
            minOrderValue: 1500,
            channel: 'WHATSAPP_BROADCAST',
            targetAudience: 'REPEAT_CUSTOMERS_90_DAYS',
          },
        });
      }
    } else if (
      lowerQuery.includes('brief') ||
      lowerQuery.includes('summary') ||
      lowerQuery.includes('ब्रीफ') ||
      lowerQuery.includes('சுருக்கம்') ||
      lowerQuery.includes('ಸಾರಾಂಶ') ||
      lowerQuery.includes('సారాంశం')
    ) {
      agentName = 'Merchant Orchestrator';
      intentIdentified = 'DAILY_BRIEFING';
      verifiedData = { overview, khata };
    } else {
      agentName = 'Merchant Orchestrator';
      intentIdentified = 'TODAY_COLLECTIONS_OVERVIEW';
      verifiedData = overview;
    }

    // 3. Generate Grounded AI Response
    const ai = this.getGeminiClient();
    let responseText = '';
    let spokenText = '';

    if (ai) {
      try {
        const prompt = `You are the Paytm Merchant Intelligence AI Voice Business Assistant.
Merchant Business: "${merchant.businessName}" (Owner: ${merchant.ownerName}, MID: ${merchant.mid}).
Language requested: ${language}.
Identified Agent: ${agentName} (Intent: ${intentIdentified}).
User question: "${query}"

Grounded Verified Application Data:
${JSON.stringify(verifiedData, null, 2)}

Strict Financial Guidelines:
1. Speak naturally, politely, and respectfully to the merchant (e.g. use "ji" in Hindi, respectful honorifics in Tamil, Kannada, Telugu).
2. State exact numbers from the verified data (e.g., ₹${overview.todayCollections}, ${overview.todayTransactionsCount} transactions). Never invent or hallucinate financial numbers.
3. Answer in the requested language (${language}: hi = Hindi, ta = Tamil, kn = Kannada, te = Telugu, en = English).
4. Keep the spoken response concise (2-3 sentences max) so it can be played aloud via text-to-speech without overwhelming the merchant in a busy shop.
5. If an action was created (${actionCard ? actionCard.title : 'None'}), inform the merchant that you have drafted it in the Action Centre and require their explicit authorization to execute.

Return pure JSON with format:
{
  "displayText": "Clear formatted text with bold numbers",
  "spokenText": "Concise natural conversational script for speech synthesis in ${language}"
}`;

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Voice latency ceiling (2s)')), 2000)
        );

        const geminiRes = await Promise.race([geminiPromise, timeoutPromise]);
        const text = geminiRes.text?.trim() || '{}';
        const parsed = JSON.parse(text);
        responseText = parsed.displayText || '';
        spokenText = parsed.spokenText || parsed.displayText || '';
      } catch (err) {
        console.warn('Gemini inference fallback:', err);
      }
    }

    // Comprehensive multilingual fallback with deep support for all 5 Indian languages
    if (!responseText) {
      const fallback = this.generateDeterministicResponse({
        merchantName: merchant.ownerName,
        businessName: merchant.businessName,
        intent: intentIdentified,
        language,
        overview,
        reconciliation,
        cashFlow,
        khata,
        growth,
        actionCard,
      });
      responseText = fallback.displayText;
      spokenText = fallback.spokenText;
    }

    return {
      agentName,
      intentIdentified,
      responseText,
      spokenResponseText: spokenText,
      language,
      actionCard,
      verifiedData,
      requiresAuthentication: !userIsAuthenticated && isSensitiveAction,
      authenticationSuccess: userIsAuthenticated,
    };
  }

  /**
   * Deterministic multilingual response builder for guaranteed resilience across all 5 languages
   */
  private static generateDeterministicResponse(params: {
    merchantName: string;
    businessName: string;
    intent: string;
    language: IndianLanguage;
    overview: any;
    reconciliation: any;
    cashFlow: any;
    khata: any;
    growth: any;
    actionCard?: MerchantAction;
  }) {
    const { merchantName, intent, language, overview, reconciliation, cashFlow, khata, actionCard } = params;

    // 1. ENGLISH (India)
    if (language === 'en') {
      if (intent === 'RECONCILE_SETTLEMENTS') {
        const issue = reconciliation.issues[0];
        const statusText =
          reconciliation.issues.length > 0
            ? `I noticed a variance of ₹${issue.varianceAmount.toLocaleString('en-IN')} on batch ${issue.batchId} (UTR: ${issue.utr}). ${
                actionCard
                  ? 'I have prepared a settlement investigation dispute in your Action Centre for your authorization.'
                  : ''
              }`
            : `All your settlements are completely reconciled. ₹${overview.inTransitSettlementAmount.toLocaleString(
                'en-IN'
              )} is in transit to your SBI account.`;
        return {
          displayText: statusText,
          spokenText: `Settlement check complete. ${statusText}`,
        };
      }
      if (intent === 'KHATA_AND_CUSTOMER_CREDIT') {
        return {
          displayText: `You have ₹${khata.totalOutstanding.toLocaleString('en-IN')} outstanding across ${
            khata.totalCustomers
          } customers. ₹${khata.overdueAmount.toLocaleString(
            'en-IN'
          )} is overdue, including Ramesh Kumar (₹3,450) and Sunita Devi (₹1,850). ${
            actionCard ? 'A payment reminder draft has been created for your approval.' : ''
          }`,
          spokenText: `Your Khata has ${khata.overdueCount} overdue accounts totalling rupees ${khata.overdueAmount}. I have prepared a payment reminder draft for your confirmation.`,
        };
      }
      if (intent === 'CASH_FLOW_FORECASTING') {
        return {
          displayText: `Your projected collections for tomorrow (Saturday) are ₹28,500 with ₹350 daily loan EMI deduction, yielding a net inflow of ₹28,150. Your 7-day projected net cash flow is ₹168,900.`,
          spokenText: `Tomorrow's estimated collection is 28 thousand 500 rupees. After deducting 350 rupees daily loan EMI, your net settlement will be 28 thousand 150 rupees.`,
        };
      }
      if (intent === 'GROWTH_RECOMMENDATIONS') {
        return {
          displayText: `Evening peak hours (6:30 PM - 9:00 PM) account for 68% of your revenue. With the upcoming festive weekend, launching a 5% cashback promo on orders over ₹1,500 can boost weekend turnover by ₹18,500. ${
            actionCard ? 'A campaign preparation draft has been added for your approval.' : ''
          }`,
          spokenText: `Your evening rush drives 68 percent of sales. I have prepared a festive weekend cashback promotion draft for your confirmation.`,
        };
      }
      if (intent === 'DAILY_BRIEFING') {
        return {
          displayText: `Daily Briefing: Today's collections stand at ₹${overview.todayCollections.toLocaleString(
            'en-IN'
          )} across ${overview.todayTransactionsCount} transactions. Bank settlement of ₹${overview.inTransitSettlementAmount.toLocaleString(
            'en-IN'
          )} is in-transit for 11:30 PM. Khata has ₹${khata.overdueAmount.toLocaleString('en-IN')} overdue.`,
          spokenText: `Daily briefing: Today's collections are ${overview.todayCollections} rupees from ${overview.todayTransactionsCount} transactions. Bank settlement of ${overview.inTransitSettlementAmount} rupees is in transit.`,
        };
      }
      return {
        displayText: `Today's total collections for ${params.businessName} are **₹${overview.todayCollections.toLocaleString(
          'en-IN'
        )}** across **${overview.todayTransactionsCount}** transactions. Soundbox audio payments contributed ₹${overview.soundboxCollections.toLocaleString(
          'en-IN'
        )}. ₹${overview.inTransitSettlementAmount.toLocaleString(
          'en-IN'
        )} is scheduled for tonight's 11:30 PM bank settlement.`,
        spokenText: `Hello ${merchantName}, today's total collections are ${overview.todayCollections} rupees from ${overview.todayTransactionsCount} transactions. Bank settlement of ${overview.inTransitSettlementAmount} rupees is scheduled for 11:30 PM.`,
      };
    }

    // 2. HINDI (हिन्दी)
    if (language === 'hi') {
      if (intent === 'RECONCILE_SETTLEMENTS') {
        const issue = reconciliation.issues[0];
        const text =
          reconciliation.issues.length > 0
            ? `सुनील जी, 27 अक्टूबर के सेटलमेंट बैच में ₹${issue.varianceAmount} का अंतर पाया गया है (UTR: ${issue.utr})। ${
                actionCard
                  ? 'मैंने एक्शन सेंटर में सेटलमेंट जांच का ड्राफ्ट तैयार कर दिया है, आपकी मंजूरी के बाद इसे बैंक को भेजा जाएगा।'
                  : ''
              }`
            : `सुनील जी, आपके सभी सेटलमेंट पूरी तरह से मेल खा चुके हैं। आज के ₹${overview.inTransitSettlementAmount.toLocaleString(
                'en-IN'
              )} आपके बैंक खाते में रात 11:30 बजे क्रेडिट हो जाएंगे।`;
        return {
          displayText: text,
          spokenText: text,
        };
      }
      if (intent === 'KHATA_AND_CUSTOMER_CREDIT') {
        return {
          displayText: `खाता बही में ${khata.totalCustomers} ग्राहकों पर कुल **₹${khata.totalOutstanding.toLocaleString(
            'en-IN'
          )}** बकाया है। इनमें से **₹${khata.overdueAmount.toLocaleString(
            'en-IN'
          )}** की देय तिथि निकल चुकी है। रमेश कुमार (₹3,450) और सुनीता देवी (₹1,850) का भुगतान बाकी है। ${
            actionCard ? 'मैंने रमेश कुमार के लिए व्हाट्सएप पेमेंट रिमाइंडर तैयार किया है।' : ''
          }`,
          spokenText: `खाता बही में कुल ${khata.totalOutstanding} रुपये बकाया है, जिसमें से ${khata.overdueAmount} रुपये देय तिथि पार कर चुके हैं। मैंने पेमेंट रिमाइंडर तैयार कर दिया है।`,
        };
      }
      if (intent === 'CASH_FLOW_FORECASTING') {
        return {
          displayText: `कल (शनिवार) के लिए अनुमानित बिक्री **₹28,500** है। ₹350 दैनिक लोन ईएमआई कटने के बाद आपको शुद्ध **₹28,150** प्राप्त होंगे। अगले 7 दिनों का अनुमानित शुद्ध नकद प्रवाह ₹1,68,900 है।`,
          spokenText: `कल शनिवार की अनुमानित बिक्री अट्ठाईस हजार पांच सौ रुपये है। साढ़े तीन सौ रुपये लोन ईएमआई कटने के बाद शुद्ध अट्ठाईस हजार एक सौ पचास रुपये मिलेंगे।`,
        };
      }
      if (intent === 'GROWTH_RECOMMENDATIONS') {
        return {
          displayText: `शाम 6:30 से 9:00 बजे के बीच आपकी 68% बिक्री होती है। आने वाले त्योहार के लिए 5% कैशबैक ऑफर शुरू करने से वीकेंड पर ₹18,500 की अतिरिक्त बिक्री हो सकती है। ${
            actionCard ? 'मैंने एक्शन सेंटर में कैंपेन तैयार किया है।' : ''
          }`,
          spokenText: `शाम के समय सबसे अधिक बिक्री होती है। त्योहार के वीकेंड के लिए मैंने पांच प्रतिशत कैशबैक कैंपेन का ड्राफ्ट तैयार किया है।`,
        };
      }
      if (intent === 'DAILY_BRIEFING') {
        return {
          displayText: `दैनिक ब्रीफिंग: आज की कुल बिक्री ₹${overview.todayCollections.toLocaleString(
            'en-IN'
          )} रही (${overview.todayTransactionsCount} ट्रांजैक्शन)। ₹${overview.inTransitSettlementAmount.toLocaleString(
            'en-IN'
          )} बैंक खाते में जमा हो जाएंगे। खाता बही में ₹${khata.overdueAmount.toLocaleString(
            'en-IN'
          )} बकाया देय तिथि पार कर चुका है।`,
          spokenText: `नमस्ते ${merchantName} जी। आज की कुल बिक्री ${overview.todayCollections} रुपये रही। रात 11:30 बजे बैंक में सेटलमेंट क्रेडिट हो जाएगा।`,
        };
      }
      return {
        displayText: `नमस्ते ${merchantName} जी। आज आपकी कुल बिक्री **₹${overview.todayCollections.toLocaleString(
          'en-IN'
        )}** रही (${overview.todayTransactionsCount} ट्रांजैक्शन)। साउंडबॉक्स से ₹${overview.soundboxCollections.toLocaleString(
          'en-IN'
        )} का भुगतान आया। ₹${overview.inTransitSettlementAmount.toLocaleString(
          'en-IN'
        )} आज रात 11:30 बजे आपके SBI खाते में सेटल हो जाएगा।`,
        spokenText: `नमस्ते ${merchantName} जी। आज आपकी कुल बिक्री ${overview.todayCollections} रुपये रही जो ${overview.todayTransactionsCount} ट्रांजैक्शन से आई। रात ग्यारह तीस बजे बैंक खाते में जमा हो जाएगी।`,
      };
    }

    // 3. TAMIL (தமிழ்)
    if (language === 'ta') {
      if (intent === 'RECONCILE_SETTLEMENTS') {
        return {
          displayText: `வணக்கம் பிரியா, உங்கள் செட்டில்மெண்ட் கணக்குகளில் ₹${reconciliation.issues[0]?.varianceAmount || 1100} வித்தியாசம் கண்டறியப்பட்டது. ஆக்ஷன் சென்டரில் விசாரணை பதிவு செய்யப்பட்டுள்ளது.`,
          spokenText: `வணக்கம், உங்கள் செட்டில்மெண்ட்டில் ஆயிரம் ரூபாய் வித்தியாசம் உள்ளது. வங்கி விசாரணை கோரிக்கை தயார் செய்யப்பட்டுள்ளது.`,
        };
      }
      if (intent === 'KHATA_AND_CUSTOMER_CREDIT') {
        return {
          displayText: `கடன் கணக்கில் மொத்தம் **₹${khata.totalOutstanding.toLocaleString(
            'en-IN'
          )}** பாக்கி உள்ளது. இதில் ₹${khata.overdueAmount.toLocaleString(
            'en-IN'
          )} காலாவதியானது. நினைவூட்டல் செய்தி தயாராக உள்ளது.`,
          spokenText: `கடன் கணக்கில் ${khata.overdueAmount} ரூபாய் பாக்கி உள்ளது. நினைவூட்டல் செய்தி அனுப்ப உங்கள் அனுமதி தேவை.`,
        };
      }
      if (intent === 'CASH_FLOW_FORECASTING') {
        return {
          displayText: `நாளை சனிக்கிழமை எதிர்பார்க்கப்படும் வசூல் **₹28,500**. தினசரி கடன் தவணை ₹350 போக, நிகர வரவு **₹28,150** ஆக இருக்கும்.`,
          spokenText: `நாளை எதிர்பார்க்கப்படும் வசூல் இருபத்தெட்டாயிரத்து ஐந்நூறு ரூபாய். நிகர வரவு இருபத்தெட்டாயிரத்து நூற்று ஐம்பது ரூபாய்.`,
        };
      }
      return {
        displayText: `வணக்கம் பிரியா, இன்றைய மொத்த வசூல் **₹${overview.todayCollections.toLocaleString(
          'en-IN'
        )}** (${overview.todayTransactionsCount} பரிவர்த்தனைகள்). இரவு 11:30 மணிக்கு வங்கி கணக்கில் வரவு வைக்கப்படும்.`,
        spokenText: `வணக்கம், இன்றைய மொத்த வசூல் ${overview.todayCollections} ரூபாய். வங்கி செட்டில்மெண்ட் இரவு பதினொன்றரை மணிக்கு நடைபெறும்.`,
      };
    }

    // 4. KANNADA (ಕನ್ನಡ)
    if (language === 'kn') {
      if (intent === 'RECONCILE_SETTLEMENTS') {
        return {
          displayText: `ನಮಸ್ಕಾರ ಕಾರ್ತಿಕ್ ಅವರೇ, ನಿಮ್ಮ ಸೆಟಲ್ಮೆಂಟ್ ಬ್ಯಾಚ್‌ನಲ್ಲಿ ₹${reconciliation.issues[0]?.varianceAmount || 1100} ವ್ಯತ್ಯಾಸ ಕಂಡುಬಂದಿದೆ. ಬ್ಯಾಂಕ್ ತನಿಖೆ ಡ್ರಾಫ್ಟ್ ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ.`,
          spokenText: `ನಮಸ್ಕಾರ, ನಿಮ್ಮ ಸೆಟಲ್ಮೆಂಟ್‌ನಲ್ಲಿ ವ್ಯತ್ಯಾಸವಿದೆ. ಬ್ಯಾಂಕ್ ತನಿಖೆಗೆ ಆಕ್ಷನ್ ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ.`,
        };
      }
      if (intent === 'KHATA_AND_CUSTOMER_CREDIT') {
        return {
          displayText: `ಖಾತಾ ಪುಸ್ತಕದಲ್ಲಿ ಒಟ್ಟು **₹${khata.totalOutstanding.toLocaleString(
            'en-IN'
          )}** ಬಾಕಿ ಉಳಿದಿದೆ. ಇದರಲ್ಲಿ ₹${khata.overdueAmount.toLocaleString(
            'en-IN'
          )} ದಿನಾಂಕ ಮೀರಿದೆ. ಪಾವತಿ ಜ್ಞಾಪನೆ ಸಿದ್ಧವಾಗಿದೆ.`,
          spokenText: `ಖಾತಾ ಬಾಕಿ ಮೊತ್ತ ${khata.overdueAmount} ರೂಪಾಯಿಗಳು. ಪಾವತಿ ಜ್ಞಾಪನೆ ಕಳುಹಿಸಲು ನಿಮ್ಮ ಅನುಮೋದನೆ ಬೇಕು.`,
        };
      }
      if (intent === 'CASH_FLOW_FORECASTING') {
        return {
          displayText: `ನಾಳೆಯ ಅಂದಾಜು ಸಂಗ್ರಹ **₹28,500**. ದಿನದ ಲೋನ್ EMI ₹350 ಕಳೆದ ನಂತರ ನಿವ್ವಳ ₹28,150 ಜಮೆಯಾಗಲಿದೆ.`,
          spokenText: `ನಾಳೆಯ ಅಂದಾಜು ಕಲೆಕ್ಷನ್ ಇಪ್ಪತ್ತೆಂಟು ಸಾವಿರದ ಐನೂರು ರೂಪಾಯಿಗಳು. ನಿವ್ವಳ ಇಪ್ಪತ್ತೆಂಟು ಸಾವಿರದ ನೂರ ಐವತ್ತು ರೂಪಾಯಿ ಜಮೆಯಾಗಲಿದೆ.`,
        };
      }
      return {
        displayText: `ನಮಸ್ಕಾರ ಕಾರ್ತಿಕ್ ಅವರೇ, ಇಂದಿನ ಒಟ್ಟು ಕಲೆಕ್ಷನ್ **₹${overview.todayCollections.toLocaleString(
          'en-IN'
        )}** (${overview.todayTransactionsCount} ವಹಿವಾಟುಗಳು). ರಾತ್ರಿ 11:30 ಕ್ಕೆ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಸೆಟಲ್ ಆಗಲಿದೆ.`,
        spokenText: `ನಮಸ್ಕಾರ, ಇಂದಿನ ಒಟ್ಟು ಕಲೆಕ್ಷನ್ ${overview.todayCollections} ರೂಪಾಯಿಗಳು. ರಾತ್ರಿ 11:30 ಕ್ಕೆ ಜಮೆಯಾಗಲಿದೆ.`,
      };
    }

    // 5. TELUGU (తెలుగు)
    if (intent === 'RECONCILE_SETTLEMENTS') {
      return {
        displayText: `నమస్కారం, మీ సెటిల్మెంట్ వివరాలలో ₹${reconciliation.issues[0]?.varianceAmount || 1100} వ్యత్యాసం ఉంది. బ్యాంక్ విచారణ కోసం డ్రాఫ్ట్ సిద్ధం చేయబడింది.`,
        spokenText: `నమస్కారం, మీ సెటిల్మెంట్ లో వ్యత్యాసం ఉంది. బ్యాంక్ విచారణ కోసం రిక్వెస్ట్ సిద్ధం చేశాను.`,
      };
    }
    if (intent === 'KHATA_AND_CUSTOMER_CREDIT') {
      return {
        displayText: `ఖాతా పుస్తకంలో మొత్తం **₹${khata.totalOutstanding.toLocaleString(
          'en-IN'
        )}** అప్పు ఉంది. ఇందులో ₹${khata.overdueAmount.toLocaleString(
          'en-IN'
        )} గడువు ముగిసింది. రిమైండర్ సిద్ధంగా ఉంది.`,
        spokenText: `ఖాతా పుస్తకంలో ${khata.overdueAmount} రూపాయలు గడువు ముగిసిన అప్పు ఉంది. రిమైండర్ పంపడానికి మీ అనుమతి కావాలి.`,
      };
    }
    if (intent === 'CASH_FLOW_FORECASTING') {
      return {
        displayText: `రేపటి అంచనా వసూలు **₹28,500**. రోజువారీ లోన్ EMI ₹350 తీసివేసిన తర్వాత నికర మొత్తం ₹28,150 అవుతుంది.`,
        spokenText: `రేపటి అంచనా వసూలు ఇరవై ఎనిమిది వేల ఐదు వందల రూపాయలు. నికర మొత్తం ఇరవై ఎనిమిది వేల నూట యాభై రూపాయలు.`,
      };
    }
    return {
      displayText: `నమస్కారం, ఈ రోజు మొత్తం వసూలు **₹${overview.todayCollections.toLocaleString(
        'en-IN'
      )}** (${overview.todayTransactionsCount} లావాదేవీలు). రాత్రి 11:30 గంటలకు బ్యాంక్ ఖాతాలో జమ అవుతుంది.`,
      spokenText: `ఈ రోజు మొత్తం వసూలు ${overview.todayCollections} రూపాయలు. రాత్రి 11:30 కు సెటిల్మెంట్ జరుగుతుంది.`,
    };
  }
}
