import React, { useState } from 'react';
import { CustomerCreditRecord, IndianLanguage } from '../types/index.ts';
import { translations } from '../utils/translations.ts';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Send,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  Calendar,
  X,
  CreditCard,
  MessageSquare,
} from 'lucide-react';

interface SimpleBusinessTipsScreenProps {
  creditRecords: CustomerCreditRecord[];
  currentLanguage: IndianLanguage;
  onPrepareReminder: (record: CustomerCreditRecord) => void;
  onAddCreditRecord: (data: { customerName: string; customerPhone: string; amount: number; dueDate: string }) => Promise<void>;
  onAskVoicePrompt: (prompt: string) => void;
}

export const SimpleBusinessTipsScreen: React.FC<SimpleBusinessTipsScreenProps> = ({
  creditRecords,
  currentLanguage,
  onPrepareReminder,
  onAddCreditRecord,
  onAskVoicePrompt,
}) => {
  const t = translations[currentLanguage] || translations.hi;

  const [activeTab, setActiveTab] = useState<'TIPS' | 'REMINDERS'>('TIPS');
  const [isAddDueModalOpen, setIsAddDueModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDues = creditRecords.reduce((sum, r) => sum + r.outstandingBalance, 0);

  // Section 7: Suggestions with "What we noticed", "Why it matters", "What you can do"
  const tips = [
    {
      id: 'tip-1',
      title: 'More customers visit your shop in the evening (6 PM – 9 PM)',
      noticed: '68% of your payments happen between 6:30 PM and 9:00 PM with 42 payments per hour.',
      matters: 'During rush hours, long checkout queues make hurried customers leave without buying.',
      action: 'Keep quick-moving items near the cash counter and display a second QR code stand.',
      tag: 'Peak Hours',
    },
    {
      id: 'tip-2',
      title: 'Try a special festival weekend offer on family packs',
      noticed: 'Festival weekends increase demand for sweets and grocery combo packs by 2.4 times.',
      matters: 'Families shop in larger basket sizes before holidays.',
      action: 'Offer 5% cashback on bills above ₹1,500 using Paytm UPI QR.',
      tag: 'Sales Booster',
    },
    {
      id: 'tip-3',
      title: 'Your repeat customers are increasing this month',
      noticed: 'Over 45 customers visited your store at least 3 times in the last 30 days.',
      matters: 'Loyal neighborhood buyers bring steady revenue with zero advertising cost.',
      action: 'Give a friendly verbal discount or small free item on their next monthly ration purchase.',
      tag: 'Customer Loyalty',
    },
  ];

  const handleAddDueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAmount) return;
    setIsSubmitting(true);
    try {
      await onAddCreditRecord({
        customerName: newName,
        customerPhone: newPhone || '+91 98000 00000',
        amount: Number(newAmount),
        dueDate: newDueDate || '2026-11-05',
      });
      setIsAddDueModalOpen(false);
      setNewName('');
      setNewAmount('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 font-sans">
      {/* Top Toggle Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight">
            {activeTab === 'TIPS' ? t.growYourBusiness : t.myReminders}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Simple ideas to increase sales and recover customer dues
          </p>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveTab('TIPS')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'TIPS'
                ? 'bg-[#002970] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.businessTips}
          </button>
          <button
            onClick={() => setActiveTab('REMINDERS')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'REMINDERS'
                ? 'bg-[#002970] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.myReminders} ({creditRecords.length})
          </button>
        </div>
      </div>

      {activeTab === 'TIPS' ? (
        /* Section 7: Business Tips View */
        <div className="space-y-4">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-[#002970] bg-blue-50 px-2.5 py-1 rounded-full">
                  {tip.tag}
                </span>
                <button
                  onClick={() => onAskVoicePrompt(`मुझे ${tip.tag} के बारे में और बताओ`)}
                  className="text-xs text-[#00BAF2] font-semibold hover:underline"
                >
                  Ask Assistant
                </button>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[#172B4D]">
                {tip.title}
              </h3>

              {/* 3 Clear Blocks: What we noticed, Why it matters, What you can do */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00BAF2]" />
                    <span>{t.whatWeNoticed}:</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{tip.noticed}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{t.whyItMatters}:</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{tip.matters}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>{t.whatYouCanDo}:</span>
                  </div>
                  <p className="text-emerald-950 font-medium leading-relaxed">{tip.action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Section 8: Credit and Reminders View */
        <div className="space-y-5">
          {/* Top Khata Summary Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Customer Dues Summary
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#002970] mt-1">
                ₹{totalDues.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                You have ₹{totalDues.toLocaleString('en-IN')} to collect from {creditRecords.length} customers.
              </p>
            </div>

            <button
              onClick={() => setIsAddDueModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#002970] text-white text-xs font-bold hover:bg-[#001f55] shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-[#00BAF2]" />
              <span>Record Customer Due</span>
            </button>
          </div>

          {/* Loan Schedule Notice (Section 8: Upcoming loan repayment dates) */}
          <div className="bg-blue-50/80 rounded-2xl border border-blue-200 p-4 sm:p-5 flex items-start gap-3.5 text-xs text-[#002970]">
            <CreditCard className="w-5 h-5 shrink-0 mt-0.5 text-[#002970]" />
            <div>
              <div className="font-bold text-sm">
                Paytm Merchant Growth Loan: ₹350 Daily Auto-EMI
              </div>
              <div className="mt-1 text-slate-600 leading-relaxed">
                ₹350 is automatically adjusted from your nightly settlement before reaching your bank account. No manual payment or cheque is needed!
              </div>
            </div>
          </div>

          {/* Customer Dues List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#172B4D]">
                Customer Udhaari & Reminder List
              </h2>
              <span className="text-xs text-slate-500">Always requires your approval</span>
            </div>

            <div className="divide-y divide-slate-100">
              {creditRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-[#172B4D]">
                      {record.customerName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Phone: {record.customerPhone} · Due Date: {record.dueDate}
                    </div>
                    {record.notes && (
                      <div className="text-[11px] text-slate-600 mt-1 italic">
                        "{record.notes}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-bold font-mono text-[#002970]">
                        ₹{record.outstandingBalance.toLocaleString('en-IN')}
                      </div>
                      <span className={`text-[11px] font-bold ${record.status === 'CURRENT' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {record.status === 'CURRENT' ? 'Current' : 'Overdue'}
                      </span>
                    </div>

                    <button
                      onClick={() => onPrepareReminder(record)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#002970] text-white hover:bg-[#001f55] text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-[#00BAF2]" />
                      <span>{t.prepareReminderBtn}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Record Customer Due Modal */}
      {isAddDueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#002970]">
                Record Customer Due (Khata)
              </h3>
              <button onClick={() => setIsAddDueModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDueSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Customer Phone (For WhatsApp reminder)
                </label>
                <input
                  type="text"
                  placeholder="+91 98XXX XXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Due Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="1500"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-base font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Promise Due Date
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDueModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#002970] text-white font-bold hover:bg-[#001f55]"
                >
                  {isSubmitting ? 'Saving...' : 'Save to Khata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
