import React, { useState, useEffect, useRef } from 'react';
import { SimpleNavbar } from './components/SimpleNavbar.tsx';
import { SimpleHomeScreen } from './components/SimpleHomeScreen.tsx';
import { SimpleVoiceAssistantScreen } from './components/SimpleVoiceAssistantScreen.tsx';
import { SimplePaymentsScreen } from './components/SimplePaymentsScreen.tsx';
import { SimpleSettlementScreen } from './components/SimpleSettlementScreen.tsx';
import { CustomerDuesScreen } from './components/CustomerDuesScreen.tsx';
import { BusinessGrowthScreen } from './components/BusinessGrowthScreen.tsx';
import { SimpleReminderApprovalModal } from './components/SimpleReminderApprovalModal.tsx';
import { SimpleProfileModal } from './components/SimpleProfileModal.tsx';
import {
  MerchantProfile,
  Transaction,
  SettlementBatch,
  CustomerCreditRecord,
  GrowthInsight,
  DailyBriefing,
  IndianLanguage,
  PaymentMethod,
} from './types/index.ts';
import { FinancialOverviewReport, DeterministicAnalyticsEngine } from './server/analyticsEngine.ts';
import { merchantDB } from './server/mockDb.ts';
import { api } from './services/api.ts';

export default function App() {
  const [merchants, setMerchants] = useState<MerchantProfile[]>(() => merchantDB.getMerchants());
  const [currentMerchantId, setCurrentMerchantId] = useState<string>('mer_sharma_kirana');
  const [currentMerchant, setCurrentMerchant] = useState<MerchantProfile | null>(() => merchantDB.getMerchant('mer_sharma_kirana'));

  // Exactly 6 Navigation Items: home, payments, money, dues, growth, assistant
  const [activeTab, setActiveTab] = useState<string>('home');
  const [currentLanguage, setCurrentLanguage] = useState<IndianLanguage>(() => {
    return (localStorage.getItem('merchant_preferred_lang') as IndianLanguage) || 'en';
  });

  const handleSelectLanguage = (lang: IndianLanguage) => {
    setCurrentLanguage(lang);
    localStorage.setItem('merchant_preferred_lang', lang);
    if (currentMerchantId) {
      api.updateLanguage(currentMerchantId, lang).catch(() => {});
    }
  };

  // Application Data States initialized with robust local data to prevent any blank/error screen
  const [overview, setOverview] = useState<FinancialOverviewReport | null>(() =>
    DeterministicAnalyticsEngine.getFinancialOverview('mer_sharma_kirana')
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    merchantDB.getTransactions('mer_sharma_kirana')
  );
  const [settlements, setSettlements] = useState<SettlementBatch[]>(() =>
    merchantDB.getSettlements('mer_sharma_kirana')
  );
  const [creditRecords, setCreditRecords] = useState<CustomerCreditRecord[]>(() =>
    merchantDB.getKhata('mer_sharma_kirana')
  );
  const [growthInsights, setGrowthInsights] = useState<GrowthInsight[]>(() =>
    merchantDB.getGrowthInsights('mer_sharma_kirana')
  );
  const [briefings, setBriefings] = useState<DailyBriefing[]>(() =>
    merchantDB.getBriefings('mer_sharma_kirana')
  );

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedReminderRecord, setSelectedReminderRecord] = useState<CustomerCreditRecord | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  // Audio state
  const [isBriefingAudioPlaying, setIsBriefingAudioPlaying] = useState(false);
  const [isChimePlaying, setIsChimePlaying] = useState(false);

  // Loading state (starts false because initial cached state is immediately available)
  const [isLoading, setIsLoading] = useState(false);

  // 1. Initial Load: Fetch Merchants
  useEffect(() => {
    let isMounted = true;
    api.getMerchants()
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setMerchants(data);
          const defaultMer = data.find((m: any) => m.id === currentMerchantId) || data[0];
          setCurrentMerchant(defaultMer);
          const savedLang = localStorage.getItem('merchant_preferred_lang') as IndianLanguage;
          setCurrentLanguage(savedLang || 'en');
        }
      })
      .catch((err) => console.error('Failed to load merchants:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Refresh tenant data when merchant ID changes
  const refreshMerchantData = async (merchantId: string) => {
    setIsLoading(true);
    try {
      const [
        merRes,
        overviewRes,
        txnsRes,
        settleRes,
        khataRes,
        growthRes,
        briefingsRes,
      ] = await Promise.allSettled([
        api.getMerchant(merchantId),
        api.getOverview(merchantId),
        api.getTransactions(merchantId),
        api.getSettlements(merchantId),
        api.getKhata(merchantId),
        api.getGrowth(merchantId),
        api.getBriefings(merchantId),
      ]);

      if (merRes.status === 'fulfilled' && merRes.value) {
        const mer = merRes.value;
        setCurrentMerchant(mer);
        const savedLang = localStorage.getItem('merchant_preferred_lang') as IndianLanguage;
        if (!savedLang && mer.primaryLanguage) {
          setCurrentLanguage(mer.primaryLanguage);
        }
      }
      if (overviewRes.status === 'fulfilled' && overviewRes.value) {
        setOverview(overviewRes.value);
      }
      if (txnsRes.status === 'fulfilled' && txnsRes.value) {
        setTransactions(txnsRes.value);
      }
      if (settleRes.status === 'fulfilled' && settleRes.value?.settlements) {
        setSettlements(settleRes.value.settlements);
      }
      if (khataRes.status === 'fulfilled' && khataRes.value?.records) {
        setCreditRecords(khataRes.value.records);
      }
      if (growthRes.status === 'fulfilled' && growthRes.value) {
        setGrowthInsights(growthRes.value);
      }
      if (briefingsRes.status === 'fulfilled' && briefingsRes.value) {
        setBriefings(briefingsRes.value);
      }
    } catch (err) {
      console.error('Error fetching merchant data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentMerchantId) {
      refreshMerchantData(currentMerchantId);
    }
  }, [currentMerchantId]);

  // Handle Switch Merchant Tenant
  const handleSelectMerchant = (merchantId: string) => {
    setCurrentMerchantId(merchantId);
  };

  // Handle Simulate New Payment
  const handleSimulatePayment = async (data: {
    amount: number;
    paymentMethod: PaymentMethod;
    customerName: string;
  }) => {
    await api.addTransaction(currentMerchantId, data);
    await refreshMerchantData(currentMerchantId);

    // Play instant soundbox voice chime
    playTestSoundboxChime(data.amount);
  };

  // Handle Add Customer Due in Khata
  const handleAddCreditRecord = async (data: {
    customerName: string;
    customerPhone: string;
    amount: number;
    dueDate: string;
    notes?: string;
  }) => {
    await api.addKhataRecord(currentMerchantId, data);
    await refreshMerchantData(currentMerchantId);
  };

  // Handle Record Customer Repayment
  const handleRecordRepayment = async (customerId: string, amount: number) => {
    await fetch(`/api/khata/${currentMerchantId}/repay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, amount }),
    });
    await refreshMerchantData(currentMerchantId);
  };

  // Handle Prepare Reminder Modal Trigger
  const handlePrepareReminder = (record: CustomerCreditRecord) => {
    setSelectedReminderRecord(record);
    setIsReminderModalOpen(true);
  };

  // Handle Confirmed Reminder Send
  const handleConfirmSendReminder = async (record: CustomerCreditRecord, message: string) => {
    await api.createAction(currentMerchantId, {
      type: 'CUSTOMER_CREDIT_REMINDER',
      title: `Reminder sent to ${record.customerName}`,
      description: message,
      status: 'EXECUTED',
      requiresApproval: true,
      createdBy: 'MERCHANT',
      payload: {
        customerName: record.customerName,
        phone: record.customerPhone,
        amount: record.outstandingBalance,
      },
    });
    await refreshMerchantData(currentMerchantId);
  };

  // Action approval / reject handlers for voice assistant
  const handleApproveAction = async (actionId: string) => {
    await api.updateActionStatus(currentMerchantId, actionId, 'EXECUTED', currentMerchant?.ownerName || 'Merchant Owner');
    await refreshMerchantData(currentMerchantId);
  };

  const handleRejectAction = async (actionId: string) => {
    await api.updateActionStatus(currentMerchantId, actionId, 'REJECTED', currentMerchant?.ownerName || 'Merchant Owner');
    await refreshMerchantData(currentMerchantId);
  };

  // Play synthetic Paytm Soundbox Payment Audio Announcement
  const playTestSoundboxChime = (amount = 125) => {
    setIsChimePlaying(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text =
        currentLanguage === 'hi'
          ? `पेटीएम पर ${amount} रुपये प्राप्त हुए.`
          : currentLanguage === 'ta'
          ? `பேடிஎம்மில் ${amount} ரூபாய் பெறப்பட்டது.`
          : currentLanguage === 'kn'
          ? `ಪೇಟಿಎಂನಲ್ಲಿ ${amount} ರೂಪಾಯಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ.`
          : currentLanguage === 'te'
          ? `పేటీఎం లో ${amount} రూపాయలు అందాయి.`
          : `${amount} rupees received on Paytm.`;

      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<IndianLanguage, string> = {
        hi: 'hi-IN',
        ta: 'ta-IN',
        kn: 'kn-IN',
        te: 'te-IN',
        en: 'en-IN',
      };
      utterance.lang = langMap[currentLanguage] || 'hi-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.onend = () => setIsChimePlaying(false);
      utterance.onerror = () => setIsChimePlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsChimePlaying(false), 2000);
    }
  };

  const briefingAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Play Daily Briefing Audio with Sarvam Bulbul v4 Flash & Clean Fallback
  const playBriefingAudio = async (text: string) => {
    if (isBriefingAudioPlaying) {
      if (briefingAudioPlayerRef.current) {
        briefingAudioPlayerRef.current.pause();
        briefingAudioPlayerRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsBriefingAudioPlaying(false);
      return;
    }

    // 1. Try pre-cached Sarvam audio or call TTS endpoint
    let base64 = latestBriefing?.audioBase64;
    if (!base64 && text) {
      try {
        const res = await api.voiceTTS(text, currentLanguage);
        if (res.success && res.audioBase64) {
          base64 = res.audioBase64;
        }
      } catch (e) {
        console.warn('Sarvam TTS fetch warning:', e);
      }
    }

    if (base64) {
      try {
        const audioUrl = base64.startsWith('data:audio') ? base64 : `data:audio/wav;base64,${base64}`;
        const audio = new Audio(audioUrl);
        briefingAudioPlayerRef.current = audio;
        setIsBriefingAudioPlaying(true);

        audio.onended = () => {
          setIsBriefingAudioPlaying(false);
          briefingAudioPlayerRef.current = null;
        };

        audio.onerror = () => {
          fallbackSpeechSynthesis(text);
        };

        await audio.play();
        return;
      } catch (err) {
        console.warn('Audio playback error, using fallback:', err);
      }
    }

    fallbackSpeechSynthesis(text);
  };

  const fallbackSpeechSynthesis = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<IndianLanguage, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      te: 'te-IN',
    };
    utterance.lang = langMap[currentLanguage] || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsBriefingAudioPlaying(true);
    utterance.onend = () => setIsBriefingAudioPlaying(false);
    utterance.onerror = () => setIsBriefingAudioPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  if (isLoading && !currentMerchant) {
    return (
      <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div className="w-12 h-12 border-4 border-[#00BAF2] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-base font-bold text-[#002970]">
            Opening Merchant Business Assistant...
          </div>
          <div className="text-xs text-slate-500">
            Connecting your Soundbox and shop accounts
          </div>
        </div>
      </div>
    );
  }

  if (!currentMerchant || !overview) {
    return (
      <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Shop Information Loading Error</h3>
            <p className="text-xs text-slate-500 mt-1">
              Could not connect to merchant data. Please retry or check your network.
            </p>
          </div>
          <button
            onClick={() => refreshMerchantData(currentMerchantId)}
            className="w-full py-2.5 px-4 bg-[#00BAF2] hover:bg-[#0099cc] text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const latestBriefing = briefings[0];

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-[#172B4D] flex flex-col font-sans selection:bg-[#00BAF2]/20">
      {/* Navigation (Top bar on Desktop, Top & Bottom bar on Mobile) */}
      <SimpleNavbar
        currentMerchant={currentMerchant}
        merchants={merchants}
        onSelectMerchant={handleSelectMerchant}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentLanguage={currentLanguage}
        onSelectLanguage={handleSelectLanguage}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-16">
        {activeTab === 'home' && (
          <SimpleHomeScreen
            merchant={currentMerchant}
            overview={overview}
            briefing={latestBriefing}
            currentLanguage={currentLanguage}
            onOpenVoice={() => setActiveTab('assistant')}
            onNavigateTab={setActiveTab}
            onPlayBriefingAudio={playBriefingAudio}
            isAudioPlaying={isBriefingAudioPlaying}
          />
        )}

        {activeTab === 'payments' && (
          <SimplePaymentsScreen
            transactions={transactions}
            merchantId={currentMerchant.id}
            currentLanguage={currentLanguage}
            onSimulatePayment={handleSimulatePayment}
          />
        )}

        {activeTab === 'money' && (
          <SimpleSettlementScreen
            settlements={settlements}
            merchant={currentMerchant}
            currentLanguage={currentLanguage}
            onAskWhy={(batch) => {
              setActiveTab('assistant');
            }}
          />
        )}

        {activeTab === 'dues' && (
          <CustomerDuesScreen
            creditRecords={creditRecords}
            currentLanguage={currentLanguage}
            merchantId={currentMerchant.id}
            merchantName={currentMerchant.businessName}
            onPrepareReminder={handlePrepareReminder}
            onAddCreditRecord={handleAddCreditRecord}
            onRecordRepayment={handleRecordRepayment}
          />
        )}

        {activeTab === 'growth' && (
          <BusinessGrowthScreen
            merchantId={currentMerchant.id}
            currentLanguage={currentLanguage}
            onAskVoicePrompt={(prompt) => {
              setActiveTab('assistant');
            }}
          />
        )}

        {activeTab === 'assistant' && (
          <SimpleVoiceAssistantScreen
            merchant={currentMerchant}
            currentLanguage={currentLanguage}
            onSelectLanguage={handleSelectLanguage}
            onApproveAction={handleApproveAction}
            onRejectAction={handleRejectAction}
          />
        )}
      </main>

      {/* Profile & Device Diagnostics Modal */}
      <SimpleProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        merchant={currentMerchant}
        currentLanguage={currentLanguage}
        onPlayTestChime={() => playTestSoundboxChime(100)}
        isChimePlaying={isChimePlaying}
      />

      {/* Explicit Customer Reminder Approval Modal */}
      <SimpleReminderApprovalModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setSelectedReminderRecord(null);
        }}
        record={selectedReminderRecord}
        merchantName={currentMerchant.ownerName}
        shopName={currentMerchant.businessName}
        currentLanguage={currentLanguage}
        onConfirmSend={handleConfirmSendReminder}
      />
    </div>
  );
}
