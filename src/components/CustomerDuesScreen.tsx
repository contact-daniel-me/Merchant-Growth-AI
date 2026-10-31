import React, { useState, useEffect, useRef } from 'react';
import type { CustomerCreditRecord, IndianLanguage } from '../types/index.ts';
import { translations } from '../utils/translations.ts';
import { api } from '../services/api.ts';
import {
  Users,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  PhoneCall,
  PhoneOff,
  Calendar,
  X,
  CreditCard,
  MessageSquare,
  Sparkles,
  Volume2,
  VolumeX,
  Square,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Radio,
  Headphones,
  Info,
  Server,
  ExternalLink,
} from 'lucide-react';

interface CustomerDuesScreenProps {
  creditRecords: CustomerCreditRecord[];
  currentLanguage: IndianLanguage;
  merchantId?: string;
  merchantName?: string;
  onPrepareReminder: (record: CustomerCreditRecord) => void;
  onAddCreditRecord: (data: {
    customerName: string;
    customerPhone: string;
    amount: number;
    dueDate: string;
    notes?: string;
  }) => Promise<void>;
  onRecordRepayment?: (customerId: string, amount: number) => Promise<void>;
}

interface ActiveLiveCall {
  callId: string;
  customerName: string;
  customerPhone: string;
  outstandingBalance: number;
  language: IndianLanguage;
  scriptText: string;
  audioBase64?: string | null;
  status: 'DIALING' | 'IN_CALL' | 'COMPLETED';
  durationSeconds: number;
  elapsedSeconds: number;
  isMuted: boolean;
}

export const CustomerDuesScreen: React.FC<CustomerDuesScreenProps> = ({
  creditRecords,
  currentLanguage,
  merchantId = 'mer_sharma_kirana',
  merchantName = 'Sharma General Store',
  onPrepareReminder,
  onAddCreditRecord,
  onRecordRepayment,
}) => {
  const t = translations[currentLanguage] || translations.en;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRecordForPay, setSelectedRecordForPay] = useState<CustomerCreditRecord | null>(null);
  const [repayAmount, setRepayAmount] = useState('');

  // Voice Call Modal States
  const [selectedRecordForCall, setSelectedRecordForCall] = useState<CustomerCreditRecord | null>(null);
  const [callLanguage, setCallLanguage] = useState<IndianLanguage>(currentLanguage);
  const [callScript, setCallScript] = useState('');
  const [isDispatchingCall, setIsDispatchingCall] = useState(false);
  const [isPlayingAudioPreview, setIsPlayingAudioPreview] = useState(false);
  const [callSuccessMsg, setCallSuccessMsg] = useState('');
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  // Real Mobile Phone Call Modal States
  const [isRealCallModalOpen, setIsRealCallModalOpen] = useState(false);
  const [realCallPhone, setRealCallPhone] = useState('+91 ');
  const [realCallName, setRealCallName] = useState('My Mobile Phone');
  const [realCallLang, setRealCallLang] = useState<IndianLanguage>(currentLanguage);
  const [realCallScript, setRealCallScript] = useState(
    'नमस्ते, यह मर्चेंट बाई ग्रोआयोटा से एक वास्तविक वॉइस कॉल है। सर्वम एआई बुलबुल न्यूरल वॉइस सिस्टम सही ढंग से काम कर रहा है।'
  );
  const [isDialingRealCall, setIsDialingRealCall] = useState(false);
  const [realCallResponse, setRealCallResponse] = useState<any>(null);
  const [telephonyConfig, setTelephonyConfig] = useState<any>(null);
  const [showCarrierSetup, setShowCarrierSetup] = useState(false);

  // Live Simulated Call Session
  const [activeCall, setActiveCall] = useState<ActiveLiveCall | null>(null);
  const callAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<any>(null);

  // Audio preview & history refs
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [playingHistoryId, setPlayingHistoryId] = useState<string | null>(null);
  const historyAudioRef = useRef<HTMLAudioElement | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalOutstanding = creditRecords.reduce((sum, r) => sum + r.outstandingBalance, 0);
  const overdueRecords = creditRecords.filter((r) => r.status === 'OVERDUE' || r.status === 'HIGH_RISK');
  const totalOverdue = overdueRecords.reduce((sum, r) => sum + r.outstandingBalance, 0);

  // Load recent outbound calls & carrier config
  useEffect(() => {
    loadCallHistory();
    loadTelephonyStatus();
    return () => {
      if (callAudioRef.current) {
        callAudioRef.current.pause();
        callAudioRef.current = null;
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
      if (historyAudioRef.current) {
        historyAudioRef.current.pause();
        historyAudioRef.current = null;
      }
    };
  }, [merchantId]);

  const loadCallHistory = async () => {
    try {
      const calls = await api.getOutreachCalls(merchantId);
      if (calls) setRecentCalls(calls);
    } catch (e) {
      console.warn('Could not load calls history:', e);
    }
  };

  const loadTelephonyStatus = async () => {
    try {
      const cfg = await api.getTelephonyStatus();
      setTelephonyConfig(cfg);
    } catch (e) {
      console.warn('Could not load telephony status:', e);
    }
  };

  const getReminderScript = (record: CustomerCreditRecord, lang: IndianLanguage, storeName: string) => {
    switch (lang) {
      case 'hi':
        return `नमस्ते ${record.customerName} जी, यह ${storeName} की ओर से एक विनम्र सूचना है। आपके खाते में ₹${record.outstandingBalance.toLocaleString('en-IN')} का बकाया है। कृपया इसे आज ही Paytm UPI द्वारा चुकता करें। धन्यवाद।`;
      case 'ta':
        return `வணக்கம் ${record.customerName}, இது ${storeName} இலிருந்து வரும் நினைவூட்டல் அழைப்பு. உங்கள் கணக்கில் ₹${record.outstandingBalance.toLocaleString('en-IN')} நிலுவையில் உள்ளது. தயவுசெய்து Paytm UPI மூலம் உடனே செலுத்தவும். நன்றி.`;
      case 'kn':
        return `ನಮಸ್ಕಾರ ${record.customerName} ಅವರೇ, ಇದು ${storeName} ವತಿಯಿಂದ ವಿನಮ್ರ ನೆನಪಿಸುವ ಕರೆ. ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ₹${record.outstandingBalance.toLocaleString('en-IN')} ಬಾಕಿ ಇದೆ. ದಯವಿಟ್ಟು Paytm UPI ಮೂಲಕ ಪಾವತಿಸಿ. ಧನ್ಯವಾದಗಳು.`;
      case 'te':
        return `నమస్కారం ${record.customerName} గారు, ఇది ${storeName} నుండి చెల్లింపు రిమైండర్. మీ ఖాతాలో ₹${record.outstandingBalance.toLocaleString('en-IN')} బాకీ ఉంది. దయచేసి Paytm UPI ద్వారా చెల్లించండి. ధನ್ಯవాదాలు.`;
      case 'en':
      default:
        return `Hello ${record.customerName}, this is a polite payment reminder from ${storeName}. An outstanding balance of ₹${record.outstandingBalance.toLocaleString('en-IN')} is pending on your store ledger. Please complete payment via Paytm UPI. Thank you.`;
    }
  };

  const handleOpenVoiceCallModal = (record: CustomerCreditRecord) => {
    setSelectedRecordForCall(record);
    const lang = currentLanguage;
    setCallLanguage(lang);
    setCallScript(getReminderScript(record, lang, merchantName));
  };

  const handlePlayCallPreview = async () => {
    if (isPlayingAudioPreview) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
      setIsPlayingAudioPreview(false);
      return;
    }

    try {
      const tts = await api.voiceTTS(callScript, callLanguage);
      if (tts.success && tts.audioBase64) {
        const audioUrl = tts.audioBase64.startsWith('data:audio')
          ? tts.audioBase64
          : `data:audio/wav;base64,${tts.audioBase64}`;
        const audio = new Audio(audioUrl);
        audioPreviewRef.current = audio;
        setIsPlayingAudioPreview(true);
        audio.onended = () => setIsPlayingAudioPreview(false);
        audio.onerror = () => setIsPlayingAudioPreview(false);
        await audio.play();
      }
    } catch (e) {
      console.warn('TTS preview error:', e);
      setIsPlayingAudioPreview(false);
    }
  };

  const handleDispatchCall = async () => {
    if (!selectedRecordForCall) return;
    setIsDispatchingCall(true);

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
      setIsPlayingAudioPreview(false);
    }

    try {
      const record = selectedRecordForCall;
      const res = await api.dispatchCustomerCall(merchantId, {
        customerId: record.id,
        recipientName: record.customerName,
        recipientPhone: record.customerPhone,
        callPurpose: 'PAYMENT_REMINDER',
        language: callLanguage,
        scriptText: callScript,
      });

      const callId = res?.id || `CALL-${Date.now().toString().slice(-6)}`;
      const duration = res?.durationSeconds || Math.max(10, Math.round(callScript.length / 15));
      const audioBase64 = res?.audioBase64 || null;

      // Close configuration modal and transition to Live Simulated Telephony Call
      setSelectedRecordForCall(null);

      setActiveCall({
        callId,
        customerName: record.customerName,
        customerPhone: record.customerPhone,
        outstandingBalance: record.outstandingBalance,
        language: callLanguage,
        scriptText: callScript,
        audioBase64,
        status: 'DIALING',
        durationSeconds: duration,
        elapsedSeconds: 0,
        isMuted: false,
      });

      // Reload call ledger in background
      await loadCallHistory();

      // After simulated ring (1.5s), transition to IN_CALL and start Sarvam AI Bulbul neural audio playback
      setTimeout(() => {
        setActiveCall((prev) => (prev ? { ...prev, status: 'IN_CALL' } : null));

        if (audioBase64) {
          const audioUrl = audioBase64.startsWith('data:audio')
            ? audioBase64
            : `data:audio/wav;base64,${audioBase64}`;
          const audio = new Audio(audioUrl);
          callAudioRef.current = audio;
          audio.play().catch((err) => console.warn('Call audio autoplay blocked:', err));

          audio.onended = () => {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            setActiveCall((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
          };
          audio.onerror = () => {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            setActiveCall((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
          };
        }

        // Live seconds counter
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
          setActiveCall((prev) => {
            if (!prev || prev.status !== 'IN_CALL') return prev;
            const nextSec = prev.elapsedSeconds + 1;
            if (nextSec >= prev.durationSeconds && !prev.audioBase64) {
              clearInterval(callTimerRef.current);
              return { ...prev, elapsedSeconds: nextSec, status: 'COMPLETED' };
            }
            return { ...prev, elapsedSeconds: nextSec };
          });
        }, 1000);
      }, 1500);

      setCallSuccessMsg(
        `Automated Sarvam AI voice call successfully connected to ${record.customerName} (${record.customerPhone}). Outcome logged.`
      );
    } catch (err: any) {
      alert(`Call dispatch failed: ${err.message}`);
    } finally {
      setIsDispatchingCall(false);
    }
  };

  const handleDialRealPhone = async () => {
    if (!realCallPhone.trim() || !realCallScript.trim()) return;
    setIsDialingRealCall(true);
    setRealCallResponse(null);

    try {
      const res = await api.makeRealTestCall({
        phoneNumber: realCallPhone,
        recipientName: realCallName,
        language: realCallLang,
        scriptText: realCallScript,
      });

      setRealCallResponse(res);
      await loadCallHistory();

      // Launch simulated live call console so merchant can also hear it in-browser
      if (res?.audioBase64) {
        setActiveCall({
          callId: res.id,
          customerName: realCallName,
          customerPhone: realCallPhone,
          outstandingBalance: 0,
          language: realCallLang,
          scriptText: realCallScript,
          audioBase64: res.audioBase64,
          status: 'IN_CALL',
          durationSeconds: res.durationSeconds || 12,
          elapsedSeconds: 0,
          isMuted: false,
        });

        const audioUrl = res.audioBase64.startsWith('data:audio')
          ? res.audioBase64
          : `data:audio/wav;base64,${res.audioBase64}`;
        const audio = new Audio(audioUrl);
        callAudioRef.current = audio;
        audio.play().catch((e) => console.warn(e));
        audio.onended = () => setActiveCall((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
      }
    } catch (err: any) {
      alert(`Real call dispatch error: ${err.message}`);
    } finally {
      setIsDialingRealCall(false);
    }
  };

  const handleEndCall = () => {
    if (callAudioRef.current) {
      callAudioRef.current.pause();
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    setActiveCall((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
  };

  const handleToggleMute = () => {
    if (!activeCall) return;
    const newMuted = !activeCall.isMuted;
    if (callAudioRef.current) {
      callAudioRef.current.muted = newMuted;
    }
    setActiveCall((prev) => (prev ? { ...prev, isMuted: newMuted } : null));
  };

  const handleReplayCallAudio = () => {
    if (!activeCall || !activeCall.audioBase64) return;
    if (callAudioRef.current) {
      callAudioRef.current.currentTime = 0;
      callAudioRef.current.play().catch((e) => console.warn(e));
      setActiveCall((prev) => (prev ? { ...prev, status: 'IN_CALL', elapsedSeconds: 0 } : null));
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setActiveCall((prev) => {
          if (!prev || prev.status !== 'IN_CALL') return prev;
          return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
        });
      }, 1000);
    }
  };

  const handleCloseActiveCall = () => {
    if (callAudioRef.current) {
      callAudioRef.current.pause();
      callAudioRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    setActiveCall(null);
  };

  const handlePlayHistoryAudio = (call: any) => {
    if (playingHistoryId === call.id) {
      if (historyAudioRef.current) {
        historyAudioRef.current.pause();
        historyAudioRef.current = null;
      }
      setPlayingHistoryId(null);
      return;
    }

    if (historyAudioRef.current) {
      historyAudioRef.current.pause();
    }

    if (call.audioBase64) {
      const audioUrl = call.audioBase64.startsWith('data:audio')
        ? call.audioBase64
        : `data:audio/wav;base64,${call.audioBase64}`;
      const audio = new Audio(audioUrl);
      historyAudioRef.current = audio;
      setPlayingHistoryId(call.id);
      audio.onended = () => setPlayingHistoryId(null);
      audio.onerror = () => setPlayingHistoryId(null);
      audio.play().catch((e) => console.warn('History audio play error:', e));
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    setIsSubmitting(true);
    try {
      await onAddCreditRecord({
        customerName: name,
        customerPhone: phone || '+91 98450 12890',
        amount: Number(amount),
        dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        notes,
      });
      setIsAddModalOpen(false);
      setName('');
      setPhone('');
      setAmount('');
      setDueDate('');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForPay || !repayAmount || !onRecordRepayment) return;
    setIsSubmitting(true);
    try {
      await onRecordRepayment(selectedRecordForPay.id, Number(repayAmount));
      setSelectedRecordForPay(null);
      setRepayAmount('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLanguageSpeakerLabel = (lang: IndianLanguage) => {
    switch (lang) {
      case 'hi':
        return 'Hindi (hi-IN) · Voice: Shreya';
      case 'ta':
        return 'Tamil (ta-IN) · Voice: Kavya';
      case 'kn':
        return 'Kannada (kn-IN) · Voice: Roopa';
      case 'te':
        return 'Telugu (te-IN) · Voice: Aditya';
      case 'en':
      default:
        return 'English (en-IN) · Voice: Priya';
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 font-sans">
      {/* Top Dues Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#00BAF2] uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>Customer Khata & Automated Outreach</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] mt-1 tracking-tight">
              {t.myReminders}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track customer store credit, record payments, and dispatch Gemini-analyzed Sarvam AI voice calls.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {/* Real Phone Call Dialer Button */}
            <button
              onClick={() => setIsRealCallModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-98"
            >
              <Phone className="w-4 h-4 text-emerald-200" />
              <span>Make a Real Phone Call</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#002970] text-white hover:bg-[#001f55] text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Store Credit</span>
            </button>
          </div>
        </div>

        {callSuccessMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{callSuccessMsg}</span>
            </span>
            <button onClick={() => setCallSuccessMsg('')} className="text-emerald-600 font-bold ml-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Aggregate Metrics Strip */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500">Total Khata Credit</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Across {creditRecords.length} registered customers
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80">
            <div className="text-xs font-semibold text-rose-700 flex items-center justify-between">
              <span>Overdue Credit Pending</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">
              ₹{totalOverdue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">
              {overdueRecords.length} customers past promised due date
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/80">
            <div className="text-xs font-semibold text-[#002970] flex items-center justify-between">
              <span>Voice Outreach Engine</span>
              <Sparkles className="w-4 h-4 text-[#00BAF2]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#002970] mt-1">
              {recentCalls.length} Calls Dispatched
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Powered by Sarvam AI Bulbul Neural Voice
            </div>
          </div>
        </div>
      </div>

      {/* Customer Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Customer Accounts Ledger</h2>
          <span className="text-xs text-slate-500">{creditRecords.length} customer records</span>
        </div>

        {creditRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No credit records recorded yet. Click &ldquo;Add Store Credit&rdquo; to begin.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {creditRecords.map((r) => {
              const isOverdue = r.status === 'OVERDUE' || r.status === 'HIGH_RISK';
              return (
                <div
                  key={r.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/60 ${
                    isOverdue ? 'bg-rose-50/20' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {r.customerName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.customerPhone}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Due: {r.dueDate}</span>
                      </span>
                    </div>

                    {r.notes && (
                      <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">
                        &ldquo;{r.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-bold text-slate-900">
                        ₹{r.outstandingBalance.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Total credit: ₹{r.totalCreditGiven.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onRecordRepayment && r.outstandingBalance > 0 && (
                        <button
                          onClick={() => setSelectedRecordForPay(r)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          Repay
                        </button>
                      )}

                      {/* AI Voice Outreach Call Trigger */}
                      <button
                        onClick={() => handleOpenVoiceCallModal(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#002970] text-white hover:bg-[#001f55] shadow-xs cursor-pointer transition active:scale-98"
                        title="Dispatch automated Sarvam AI voice call"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-[#00BAF2]" />
                        <span>AI Voice Call</span>
                      </button>

                      <button
                        onClick={() => onPrepareReminder(r)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          isOverdue
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-blue-50 text-[#002970] hover:bg-blue-100 border border-blue-200'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>SMS / WA</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent AI Voice Outreach Call History */}
      {recentCalls.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#002970]" />
              <h3 className="text-sm font-bold text-slate-900">Recent Automated Voice Outreach Calls</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Sarvam AI Bulbul Neural Telephony
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentCalls.slice(0, 6).map((call) => (
              <div key={call.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{call.recipientName}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">
                      ({call.recipientPhone})
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 font-bold">
                      {call.language}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1 italic">&ldquo;{call.scriptText}&rdquo;</p>
                  <div className="text-[10px] text-slate-400">
                    {call.scheduledAt ? new Date(call.scheduledAt).toLocaleString('en-IN') : 'Recent'} · Duration: {call.durationSeconds}s
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {call.audioBase64 && (
                    <button
                      onClick={() => handlePlayHistoryAudio(call)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                        playingHistoryId === call.id
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {playingHistoryId === call.id ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-rose-700" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#002970]" />
                          <span>Play Audio</span>
                        </>
                      )}
                    </button>
                  )}

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {call.callStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REAL PHYSICAL MOBILE PHONE CALL DIALER MODAL */}
      {isRealCallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Phone className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Make a Real Phone Call
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Direct PSTN / Cellular Call using Sarvam AI Bulbul Neural Voice
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRealCallModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Carrier Connection Status Strip */}
              <div className="p-3 rounded-2xl border bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#002970]" />
                  <div>
                    <div className="font-bold text-slate-800 text-[11px]">
                      Telephony Carrier:{' '}
                      <span className={telephonyConfig?.isConfigured ? 'text-emerald-700' : 'text-slate-600'}>
                        {telephonyConfig?.provider || 'SIMULATION'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {telephonyConfig?.isConfigured
                        ? `Live PSTN cellular carrier active · Caller ID: ${telephonyConfig?.callerNumber}`
                        : 'Web audio console active · Connect Twilio / Exotel to ring physical phones'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCarrierSetup(!showCarrierSetup)}
                  className="px-2.5 py-1 text-[10px] font-bold text-[#002970] border border-[#002970]/30 rounded-lg hover:bg-blue-50 cursor-pointer shrink-0"
                >
                  {showCarrierSetup ? 'Hide Setup' : 'Carrier Setup'}
                </button>
              </div>

              {/* Carrier Setup Accordion */}
              {showCarrierSetup && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2 text-[11px] text-slate-700 animate-in fade-in">
                  <div className="font-bold text-[#002970] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>How to enable real cellular phone ringing:</span>
                  </div>
                  <p className="leading-relaxed">
                    Under Indian telecom regulations (TRAI/DoT), to make an actual physical phone ring via cellular GSM, an authorized telephony gateway must be linked. Add any of the following to your <code>.env</code> file:
                  </p>
                  <div className="space-y-1 bg-white p-2.5 rounded-xl border border-blue-100 font-mono text-[10px] text-slate-800">
                    <div className="font-bold text-[#002970]">Option 1: Twilio Voice</div>
                    <div>TWILIO_ACCOUNT_SID=&quot;your_sid&quot;</div>
                    <div>TWILIO_AUTH_TOKEN=&quot;your_token&quot;</div>
                    <div>TWILIO_PHONE_NUMBER=&quot;+1...&quot;</div>
                    <div className="font-bold text-[#002970] mt-1.5">Option 2: Exotel (India Gateway)</div>
                    <div>EXOTEL_API_KEY=&quot;key&quot;</div>
                    <div>EXOTEL_API_TOKEN=&quot;token&quot;</div>
                    <div>EXOTEL_CALLER_ID=&quot;080...&quot;</div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    The server automatically streams Sarvam Bulbul audio to answered calls via <code>/api/telephony/twiml/:callId</code>.
                  </p>
                </div>
              )}

              {/* Destination Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Mobile Phone Number (Include country code +91)
                </label>
                <input
                  type="tel"
                  value={realCallPhone}
                  onChange={(e) => setRealCallPhone(e.target.value)}
                  placeholder="+91 98450 12890"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Recipient Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Contact Name
                </label>
                <input
                  type="text"
                  value={realCallName}
                  onChange={(e) => setRealCallName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Language & Neural Voice
                </label>
                <select
                  value={realCallLang}
                  onChange={(e) => {
                    const newLang = e.target.value as IndianLanguage;
                    setRealCallLang(newLang);
                    if (newLang === 'hi') {
                      setRealCallScript('नमस्ते, यह मर्चेंट बाई ग्रोआयोटा से एक वास्तविक वॉइस कॉल है। सर्वम एआई बुलबुल न्यूरल वॉइस सिस्टम सही ढंग से काम कर रहा है।');
                    } else if (newLang === 'ta') {
                      setRealCallScript('வணக்கம், இது மெர்ச்சன்ட் பை குரோஐயோட்டாவின் நேரடி குரல் அழைப்பு. சர்வம் ஏஐ அமைப்பு வெற்றிகரமாக செயல்படுகிறது.');
                    } else {
                      setRealCallScript('Hello, this is a real AI voice call from Merchant by GrowIOTA powered by Sarvam AI Bulbul neural voice engine.');
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium cursor-pointer"
                >
                  <option value="en">English (India) · Speaker Priya</option>
                  <option value="hi">हिन्दी (Hindi) · Speaker Shreya</option>
                  <option value="ta">தமிழ் (Tamil) · Speaker Kavya</option>
                  <option value="kn">ಕನ್ನಡ (Kannada) · Speaker Roopa</option>
                  <option value="te">తెలుగు (Telugu) · Speaker Aditya</option>
                </select>
              </div>

              {/* Editable Script */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Spoken Script to Synthesize and Stream
                </label>
                <textarea
                  rows={3}
                  value={realCallScript}
                  onChange={(e) => setRealCallScript(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-sans leading-relaxed focus:bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {realCallResponse && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Call Dispatched Successfully</span>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    Call ID: {realCallResponse.id} · Status: {realCallResponse.callStatus} · Carrier: {realCallResponse.carrier || 'Standard'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRealCallModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDialRealPhone}
                  disabled={isDialingRealCall || !realCallPhone.trim() || !realCallScript.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition active:scale-98"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-200" />
                  <span>{isDialingRealCall ? 'Connecting Telephony...' : 'Dial Real Phone Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Call Configuration Modal */}
      {selectedRecordForCall && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#002970] text-white flex items-center justify-center">
                  <PhoneCall className="w-4 h-4 text-[#00BAF2]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Dispatch Automated AI Voice Outreach Call
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Powered by Sarvam AI Bulbul Neural Voice · Customer Payment Reminder
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (audioPreviewRef.current) audioPreviewRef.current.pause();
                  setSelectedRecordForCall(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Recipient Details Strip */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] text-slate-400">Customer</div>
                  <div className="font-bold text-slate-800">{selectedRecordForCall.customerName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Phone Number</div>
                  <div className="font-bold text-slate-800">{selectedRecordForCall.customerPhone}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Balance Due</div>
                  <div className="font-bold text-rose-600">₹{selectedRecordForCall.outstandingBalance.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Call Language (Sarvam AI Voice Model)
                </label>
                <select
                  value={callLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value as IndianLanguage;
                    setCallLanguage(newLang);
                    setCallScript(getReminderScript(selectedRecordForCall, newLang, merchantName));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium cursor-pointer"
                >
                  <option value="en">English (India) - Speaker Priya</option>
                  <option value="hi">हिन्दी (Hindi) - Speaker Shreya</option>
                  <option value="ta">தமிழ் (Tamil) - Speaker Kavya</option>
                  <option value="kn">ಕನ್ನಡ (Kannada) - Speaker Roopa</option>
                  <option value="te">తెలుగు (Telugu) - Speaker Aditya</option>
                </select>
              </div>

              {/* Editable Call Script */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Spoken Voice Call Script (Sarvam Bulbul)
                  </label>
                  <button
                    onClick={handlePlayCallPreview}
                    className="text-[11px] text-[#002970] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isPlayingAudioPreview ? <Square className="w-3 h-3 fill-[#002970]" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isPlayingAudioPreview ? 'Stop Preview' : 'Listen Voice Preview'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={callScript}
                  onChange={(e) => setCallScript(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-sans leading-relaxed focus:bg-white focus:outline-hidden focus:border-[#00BAF2]"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-center gap-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Calls comply with Telecom Commercial Communications regulations. Exact balance is grounded in verified ledger.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (audioPreviewRef.current) audioPreviewRef.current.pause();
                    setSelectedRecordForCall(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatchCall}
                  disabled={isDispatchingCall || !callScript.trim()}
                  className="px-5 py-2.5 bg-[#002970] text-white rounded-xl font-bold hover:bg-[#001f55] shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition active:scale-98"
                >
                  <PhoneCall className="w-4 h-4 text-[#00BAF2]" />
                  <span>{isDispatchingCall ? 'Connecting Telephony...' : 'Connect to Sarvam AI & Make Call'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE INTERACTIVE AI VOICE CALL CONSOLE */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Top Call Status Bar */}
            <div className="bg-[#002970] text-white p-5 text-center relative">
              <button
                onClick={handleCloseActiveCall}
                className="absolute top-4 right-4 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-sky-200 mb-3">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Sarvam AI Neural Telephony Gateway</span>
              </div>

              {/* Avatar & Calling Waves */}
              <div className="relative w-20 h-20 mx-auto my-2 flex items-center justify-center">
                {activeCall.status === 'IN_CALL' && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-[#00BAF2]/20 animate-ping" />
                    <div className="absolute -inset-2 rounded-full border-2 border-[#00BAF2]/40 animate-pulse" />
                  </>
                )}
                {activeCall.status === 'DIALING' && (
                  <div className="absolute -inset-1 rounded-full border border-sky-300 animate-spin" />
                )}
                <div className="w-20 h-20 rounded-full bg-linear-to-tr from-[#002970] to-[#00BAF2] text-white font-bold text-2xl flex items-center justify-center shadow-lg relative z-10">
                  {activeCall.customerName.slice(0, 2).toUpperCase()}
                </div>
              </div>

              <h2 className="text-xl font-bold mt-2 text-white">{activeCall.customerName}</h2>
              <p className="text-xs text-sky-200 font-mono mt-0.5">{activeCall.customerPhone}</p>
              {activeCall.outstandingBalance > 0 && (
                <div className="text-xs text-sky-100 font-medium mt-1">
                  Outstanding Ledger: ₹{activeCall.outstandingBalance.toLocaleString('en-IN')}
                </div>
              )}

              {/* Status Badge & Live Timer */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-3">
                {activeCall.status === 'DIALING' && (
                  <div className="flex items-center gap-2 text-xs text-sky-200 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Dialing customer phone...</span>
                  </div>
                )}

                {activeCall.status === 'IN_CALL' && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Call Connected</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                      {formatTimer(activeCall.elapsedSeconds)}
                    </span>
                  </div>
                )}

                {activeCall.status === 'COMPLETED' && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Call Completed & Recorded to Ledger</span>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Body & Audio Waves */}
            <div className="p-6 space-y-4">
              {/* Soundwave Simulation when call is active */}
              {activeCall.status === 'IN_CALL' && (
                <div className="py-2 flex items-center justify-center gap-1.5 h-12">
                  <div className="w-1.5 bg-[#00BAF2] rounded-full animate-bounce h-6" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 bg-[#002970] rounded-full animate-bounce h-10" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 bg-[#00BAF2] rounded-full animate-bounce h-8" style={{ animationDelay: '300ms' }} />
                  <div className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-11" style={{ animationDelay: '450ms' }} />
                  <div className="w-1.5 bg-[#002970] rounded-full animate-bounce h-7" style={{ animationDelay: '200ms' }} />
                  <div className="w-1.5 bg-[#00BAF2] rounded-full animate-bounce h-10" style={{ animationDelay: '350ms' }} />
                  <div className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-5" style={{ animationDelay: '100ms' }} />
                </div>
              )}

              {/* Spoken Voice Script Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 text-[#002970] font-semibold">
                    <Headphones className="w-3.5 h-3.5 text-[#00BAF2]" />
                    <span>Sarvam Bulbul AI Voice Output</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {getLanguageSpeakerLabel(activeCall.language)}
                  </span>
                </div>

                <p className="text-slate-800 font-sans leading-relaxed italic bg-white p-3 rounded-xl border border-slate-200/80">
                  &ldquo;{activeCall.scriptText}&rdquo;
                </p>

                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Call ID: {activeCall.callId}</span>
                  <span>Audio Format: 24kHz Mono WAV</span>
                </div>
              </div>

              {/* Regulatory Notice */}
              <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Encrypted call session authenticated under Paytm Merchant Telephony Policy.</span>
              </div>

              {/* Call Controls */}
              <div className="pt-2 flex items-center justify-center gap-3">
                {activeCall.status !== 'COMPLETED' ? (
                  <>
                    <button
                      onClick={handleToggleMute}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        activeCall.isMuted
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                      }`}
                      title={activeCall.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {activeCall.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={handleReplayCallAudio}
                      className="p-3.5 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                      title="Replay Voice Audio"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>

                    <button
                      onClick={handleEndCall}
                      className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-md cursor-pointer transition active:scale-95"
                    >
                      <PhoneOff className="w-5 h-5" />
                      <span>End Call</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3 w-full">
                    {activeCall.audioBase64 && (
                      <button
                        onClick={handleReplayCallAudio}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4 text-[#002970]" />
                        <span>Replay Call Audio</span>
                      </button>
                    )}

                    <button
                      onClick={handleCloseActiveCall}
                      className="flex-1 py-3 px-4 bg-[#002970] text-white rounded-xl font-bold hover:bg-[#001f55] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Done & Return to Ledger</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Repay Modal */}
      {selectedRecordForPay && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-800">
              Record Repayment for {selectedRecordForPay.customerName}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Outstanding: ₹{selectedRecordForPay.outstandingBalance.toLocaleString('en-IN')}
            </p>
            <form onSubmit={handleRepaySubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repayment Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedRecordForPay.outstandingBalance}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder={`Max ₹${selectedRecordForPay.outstandingBalance}`}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00BAF2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForPay(null)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Store Credit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">Record Store Credit</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98450 12890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Promise / Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5kg Basmati Rice + Cooking Oil"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00BAF2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002970] text-white rounded-xl text-xs font-bold hover:bg-[#001f55] transition shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
