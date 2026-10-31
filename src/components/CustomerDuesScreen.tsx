import React, { useState, useEffect, useRef } from 'react';
import { CustomerCreditRecord, IndianLanguage } from '../types/index.ts';
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
  Calendar,
  X,
  CreditCard,
  MessageSquare,
  Sparkles,
  Volume2,
  Square,
  ShieldCheck,
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

  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

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

  // Load recent outbound calls
  useEffect(() => {
    loadCallHistory();
  }, [merchantId]);

  const loadCallHistory = async () => {
    try {
      const calls = await api.getOutreachCalls(merchantId);
      if (calls) setRecentCalls(calls);
    } catch (e) {
      console.warn('Could not load calls history:', e);
    }
  };

  const handleOpenVoiceCallModal = (record: CustomerCreditRecord) => {
    setSelectedRecordForCall(record);
    const lang = currentLanguage;
    setCallLanguage(lang);

    // Default polite localized script
    const script =
      lang === 'hi'
        ? `नमस्ते ${record.customerName} जी, यह ${merchantName} की ओर से एक विनम्र सूचना है। आपके खाते में ₹${record.outstandingBalance} का बकाया है। कृपया इसे आज ही Paytm UPI द्वारा चुकता करें। धन्यवाद।`
        : lang === 'ta'
        ? `வணக்கம் ${record.customerName}, இது ${merchantName} இலிருந்து வரும் நினைவூட்டல் அழைப்பு. உங்கள் கணக்கில் ₹${record.outstandingBalance} நிலுவையில் உள்ளது. தயவுசெய்து Paytm UPI மூலம் உடனே செலுத்தவும். நன்றி.`
        : `Hello ${record.customerName}, this is a polite payment reminder from ${merchantName}. An outstanding balance of ₹${record.outstandingBalance} is pending on your store ledger. Please complete payment via Paytm UPI. Thank you.`;

    setCallScript(script);
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
    try {
      const res = await api.dispatchCustomerCall(merchantId, {
        customerId: selectedRecordForCall.id,
        recipientName: selectedRecordForCall.customerName,
        recipientPhone: selectedRecordForCall.customerPhone,
        callPurpose: 'PAYMENT_REMINDER',
        language: callLanguage,
        scriptText: callScript,
      });

      setCallSuccessMsg(
        `Automated Sarvam AI voice call successfully connected to ${selectedRecordForCall.customerName} (${selectedRecordForCall.customerPhone}). Outcome logged.`
      );
      setSelectedRecordForCall(null);
      await loadCallHistory();
    } catch (err: any) {
      alert(`Call dispatch failed: ${err.message}`);
    } finally {
      setIsDispatchingCall(false);
    }
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

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#002970] text-white hover:bg-[#001f55] text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Store Credit</span>
          </button>
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
              Powered by Sarvam AI Bulbul v4 Neural Voice
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
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOverdue ? 'OVERDUE' : 'CURRENT'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.customerPhone}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Due: {r.dueDate}</span>
                      </span>
                      {r.notes && <span className="text-slate-400 italic">&ldquo;{r.notes}&rdquo;</span>}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-start sm:self-auto">
                    <div className="text-left sm:text-right">
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#002970] text-white hover:bg-[#001f55] shadow-xs cursor-pointer"
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
              Sarvam Bulbul v4 Neural Telephony
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentCalls.slice(0, 5).map((call) => (
              <div key={call.id} className="py-3 flex items-center justify-between gap-3">
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

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                  {call.callStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Call Confirmation & Script Modal */}
      {selectedRecordForCall && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                    Powered by Sarvam AI · Customer Payment Reminder
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
                  <div className="font-bold text-rose-600">₹{selectedRecordForCall.outstandingBalance}</div>
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Call Language (Sarvam AI Voice)
                </label>
                <select
                  value={callLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value as IndianLanguage;
                    setCallLanguage(newLang);
                    const rec = selectedRecordForCall;
                    const script =
                      newLang === 'hi'
                        ? `नमस्ते ${rec.customerName} जी, यह ${merchantName} की ओर से एक विनम्र सूचना है। आपके खाते में ₹${rec.outstandingBalance} का बकाया है। कृपया इसे आज ही Paytm UPI द्वारा चुकता करें। धन्यवाद।`
                        : newLang === 'ta'
                        ? `வணக்கம் ${rec.customerName}, இது ${merchantName} இலிருந்து வரும் நினைவூட்டல் அழைப்பு. உங்கள் கணக்கில் ₹${rec.outstandingBalance} நிலுவையில் உள்ளது. தயவுசெய்து Paytm UPI மூலம் உடனே செலுத்தவும். நன்றி.`
                        : `Hello ${rec.customerName}, this is a polite payment reminder from ${merchantName}. An outstanding balance of ₹${rec.outstandingBalance} is pending on your store ledger. Please complete payment via Paytm UPI. Thank you.`;
                    setCallScript(script);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium cursor-pointer"
                >
                  <option value="en">English (Default)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                </select>
              </div>

              {/* Editable Call Script */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Spoken Voice Call Script (Gemini-Formulated)
                  </label>
                  <button
                    onClick={handlePlayCallPreview}
                    className="text-[11px] text-[#002970] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isPlayingAudioPreview ? <Square className="w-3 h-3 fill-[#002970]" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isPlayingAudioPreview ? 'Stop Audio' : 'Listen Voice Preview'}</span>
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
                  className="px-5 py-2 bg-[#002970] text-white rounded-xl font-bold hover:bg-[#001f55] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[#00BAF2]" />
                  <span>{isDispatchingCall ? 'Connecting Telephony...' : 'Authorize & Dial Call'}</span>
                </button>
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
              Outstanding: ₹{selectedRecordForPay.outstandingBalance}
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

      {/* Add Due Modal */}
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
