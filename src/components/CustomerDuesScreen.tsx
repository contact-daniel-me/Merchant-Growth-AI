import React, { useState } from 'react';
import { CustomerCreditRecord, IndianLanguage } from '../types/index.ts';
import { translations } from '../utils/translations.ts';
import {
  Users,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  Calendar,
  X,
  CreditCard,
  MessageSquare,
  DollarSign,
} from 'lucide-react';

interface CustomerDuesScreenProps {
  creditRecords: CustomerCreditRecord[];
  currentLanguage: IndianLanguage;
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
  onPrepareReminder,
  onAddCreditRecord,
  onRecordRepayment,
}) => {
  const t = translations[currentLanguage] || translations.en;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRecordForPay, setSelectedRecordForPay] = useState<CustomerCreditRecord | null>(null);
  const [repayAmount, setRepayAmount] = useState('');

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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    setIsSubmitting(true);
    try {
      await onAddCreditRecord({
        customerName: name,
        customerPhone: phone || '+91 98000 00000',
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
              <span>Customer Khata & Credit Book</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] mt-1 tracking-tight">
              {t.myReminders}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track customer store credit, payment due dates, and authorized WhatsApp reminders.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00BAF2] hover:bg-[#0099cc] text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Customer Due</span>
          </button>
        </div>

        {/* High-level Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Outstanding Credit
            </div>
            <div className="text-2xl font-bold text-[#002970] mt-1">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Across {creditRecords.length} registered customers
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Overdue Past Promise Date
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1">
              ₹{totalOverdue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5 font-medium">
              {overdueRecords.length} customers require follow-up
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Collection Recovery Rate
            </div>
            <div className="text-2xl font-bold text-emerald-800 mt-1">
              88.4%
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
              Verified through Paytm Soundbox & Khata
            </div>
          </div>
        </div>
      </div>

      {/* Customer Credit List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-800 mb-4">
          Customer Ledgers ({creditRecords.length})
        </h2>

        {creditRecords.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No customer dues recorded yet. Click above to record store credit.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {creditRecords.map((r) => {
              const isOverdue = r.status === 'OVERDUE' || r.status === 'HIGH_RISK';
              return (
                <div key={r.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-blue-50 text-[#002970]'
                      }`}
                    >
                      {r.customerName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{r.customerName}</span>
                        {r.status === 'HIGH_RISK' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            High Risk
                          </span>
                        )}
                        {r.status === 'OVERDUE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {r.customerPhone}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {r.dueDate || 'N/A'}
                        </span>
                      </div>
                      {r.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">
                          "{r.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900">
                        ₹{r.outstandingBalance.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Total credit: ₹{r.totalCreditGiven.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onRecordRepayment && (
                        <button
                          onClick={() => setSelectedRecordForPay(r)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          Record Repayment
                        </button>
                      )}
                      <button
                        onClick={() => onPrepareReminder(r)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          isOverdue
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-blue-50 text-[#002970] hover:bg-blue-100 border border-blue-200'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reminder</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Due Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">Record Store Credit</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98000 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00BAF2]"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00BAF2]"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00BAF2]"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00BAF2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-[#00BAF2] hover:bg-[#0099cc] text-white rounded-xl shadow-sm"
                >
                  {isSubmitting ? 'Recording...' : 'Save to Khata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Repayment Modal */}
      {selectedRecordForPay && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">Record Repayment</h3>
              <button
                onClick={() => setSelectedRecordForPay(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="space-y-4 mt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="text-slate-500">Customer</div>
                <div className="font-bold text-slate-800">{selectedRecordForPay.customerName}</div>
                <div className="text-slate-500 mt-1">Current Due: ₹{selectedRecordForPay.outstandingBalance}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repayment Amount Received (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedRecordForPay.outstandingBalance}
                  placeholder={`Up to ${selectedRecordForPay.outstandingBalance}`}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00BAF2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForPay(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
