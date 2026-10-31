import React, { useState } from 'react';
import { Transaction, PaymentMethod, IndianLanguage } from '../types/index.ts';
import { translations } from '../utils/translations.ts';
import { PaymentVerificationCard } from './PaymentVerificationCard.tsx';
import { MerchantFeeAdvisorCard } from './MerchantFeeAdvisorCard.tsx';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  Plus,
  Radio,
  QrCode,
  CreditCard,
  Wallet,
  X,
  ShieldCheck,
  Percent,
} from 'lucide-react';

interface SimplePaymentsScreenProps {
  transactions: Transaction[];
  merchantId?: string;
  currentLanguage: IndianLanguage;
  onSimulatePayment: (data: { amount: number; paymentMethod: PaymentMethod; customerName: string }) => Promise<void>;
}

export const SimplePaymentsScreen: React.FC<SimplePaymentsScreenProps> = ({
  transactions,
  merchantId = 'mer_sharma_kirana',
  currentLanguage,
  onSimulatePayment,
}) => {
  const t = translations[currentLanguage] || translations.hi;

  const [activeToolTab, setActiveToolTab] = useState<'NONE' | 'VERIFY' | 'FEES'>('NONE');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING_SETTLEMENT' | 'REFUNDED' | 'FAILED'>('ALL');
  const [isTestPaymentModalOpen, setIsTestPaymentModalOpen] = useState(false);
  const [testAmount, setTestAmount] = useState('150');
  const [testCustomer, setTestCustomer] = useState('Manoj Kumar');
  const [testMethod, setTestMethod] = useState<PaymentMethod>('SOUNDBOX_UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered transactions
  const filteredTxns = transactions.filter((txn) => {
    const matchesSearch =
      txn.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (txn.customerName && txn.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      txn.amount.toString().includes(searchQuery);

    const matchesStatus =
      activeFilter === 'ALL' ||
      (activeFilter === 'SUCCESS' && (txn.status === 'SUCCESS' || txn.status === 'SETTLED')) ||
      txn.status === activeFilter;

    return matchesSearch && matchesStatus;
  });

  const totalReceivedAmount = transactions
    .filter((t) => t.status === 'SUCCESS' || t.status === 'SETTLED')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testAmount) return;
    setIsSubmitting(true);
    try {
      await onSimulatePayment({
        amount: Number(testAmount),
        customerName: testCustomer || 'Retail Customer',
        paymentMethod: testMethod,
      });
      setIsTestPaymentModalOpen(false);
      setTestAmount('150');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'SUCCESS':
      case 'SETTLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.filterReceived}</span>
          </span>
        );
      case 'PENDING_SETTLEMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#002970] text-xs font-bold border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-[#00BAF2]" />
            <span>{t.filterPending}</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.filterRefunded}</span>
          </span>
        );
      case 'FAILED':
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{t.filterFailed}</span>
          </span>
        );
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'SOUNDBOX_UPI':
        return <Radio className="w-4 h-4 text-[#00BAF2]" />;
      case 'UPI_QR':
        return <QrCode className="w-4 h-4 text-[#002970]" />;
      case 'RUPAY_CARD':
      case 'VISA_MASTERCARD':
        return <CreditCard className="w-4 h-4 text-slate-700" />;
      default:
        return <Wallet className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 font-sans">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight">
            {t.myPayments}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Total money received: <strong className="text-[#002970] font-mono text-base">₹{totalReceivedAmount.toLocaleString('en-IN')}</strong> from {transactions.length} payments
          </p>
        </div>

        <button
          onClick={() => setIsTestPaymentModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#002970] hover:bg-[#001f55] text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#00BAF2]" />
          <span>Test Payment Soundbox</span>
        </button>
      </div>

      {/* Smart Operations Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveToolTab(activeToolTab === 'VERIFY' ? 'NONE' : 'VERIFY')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeToolTab === 'VERIFY'
              ? 'bg-[#002970] text-white border-[#002970] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${activeToolTab === 'VERIFY' ? 'text-[#00BAF2]' : 'text-emerald-600'}`} />
          <span>Verify Customer Payment (Anti-Fraud)</span>
        </button>

        <button
          onClick={() => setActiveToolTab(activeToolTab === 'FEES' ? 'NONE' : 'FEES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeToolTab === 'FEES'
              ? 'bg-[#002970] text-white border-[#002970] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Percent className={`w-4 h-4 ${activeToolTab === 'FEES' ? 'text-[#00BAF2]' : 'text-[#002970]'}`} />
          <span>2026 UPI MDR Policy Advisor</span>
        </button>
      </div>

      {activeToolTab === 'VERIFY' && (
        <PaymentVerificationCard merchantId={merchantId} />
      )}

      {activeToolTab === 'FEES' && (
        <MerchantFeeAdvisorCard merchantId={merchantId} />
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.searchPayments}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'ALL', label: t.filterAll },
            { id: 'SUCCESS', label: t.filterReceived },
            { id: 'PENDING_SETTLEMENT', label: t.filterPending },
            { id: 'REFUNDED', label: t.filterRefunded },
            { id: 'FAILED', label: t.filterFailed },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                activeFilter === f.id
                  ? 'bg-[#002970] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simple Transaction List (Section 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {filteredTxns.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No payments match your search.
            </div>
          ) : (
            filteredTxns.map((txn) => (
              <div
                key={txn.id}
                className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    {getMethodIcon(txn.paymentMethod)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#172B4D] truncate">
                      {txn.customerName || 'Retail Customer'}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{new Date(txn.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span>{new Date(txn.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      <span>·</span>
                      <span className="font-mono text-slate-400">{txn.orderId}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base sm:text-lg font-bold font-mono text-[#172B4D]">
                    ₹{txn.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="mt-1">
                    {getStatusBadge(txn.status)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Test Payment Modal */}
      {isTestPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#002970]">
                Test Soundbox Payment
              </h3>
              <button onClick={() => setIsTestPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTestSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-base font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={testCustomer}
                  onChange={(e) => setTestCustomer(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Payment Channel
                </label>
                <select
                  value={testMethod}
                  onChange={(e) => setTestMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                >
                  <option value="SOUNDBOX_UPI">Soundbox UPI (Voice Chime)</option>
                  <option value="UPI_QR">Paytm QR Code</option>
                  <option value="RUPAY_CARD">RuPay Debit Card</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestPaymentModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#002970] text-white font-bold hover:bg-[#001f55]"
                >
                  {isSubmitting ? 'Sending...' : 'Receive Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
