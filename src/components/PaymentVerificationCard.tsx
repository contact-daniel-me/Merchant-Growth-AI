import React, { useState } from 'react';
import { api } from '../services/api.ts';
import { CheckCircle2, AlertTriangle, XCircle, Search, ShieldCheck, AlertCircle, Clock } from 'lucide-react';

interface PaymentVerificationCardProps {
  merchantId: string;
}

export const PaymentVerificationCard: React.FC<PaymentVerificationCardProps> = ({ merchantId }) => {
  const [amount, setAmount] = useState<string>('850');
  const [payerQuery, setPayerQuery] = useState<string>('Ravi');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    setIsLoading(true);
    try {
      const data = await api.verifyPayment(merchantId, {
        amount: Number(amount),
        payerQuery: payerQuery.trim() || undefined,
        timeWindowHours: 24,
      });
      setResult(data);
    } catch (err) {
      console.error('Payment verification failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#002970] flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4 text-[#00BAF2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#172B4D]">Instant Real-Time Payment Verification</h3>
            <p className="text-xs text-slate-500">
              Verify customer claims against authoritative Soundbox and bank ledger records
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 w-fit">
          Live Ledger Synced
        </span>
      </div>

      <form onSubmit={handleVerify} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 850"
              className="w-full pl-7 pr-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-[#00BAF2]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Customer Name / UPI VPA (Optional)
          </label>
          <input
            type="text"
            value={payerQuery}
            onChange={(e) => setPayerQuery(e.target.value)}
            placeholder="e.g. Ravi or ravi@upi"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-[#00BAF2]"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-[#002970] hover:bg-[#001f55] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5 text-[#00BAF2]" />
            )}
            <span>Verify in Ledger</span>
          </button>
        </div>
      </form>

      {/* Verification Result Card */}
      {result && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
            result.verificationStatus === 'CONFIRMED_SUCCESS'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : result.verificationStatus === 'NOT_FOUND'
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {result.verificationStatus === 'CONFIRMED_SUCCESS' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : result.verificationStatus === 'NOT_FOUND' ? (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <span className="font-bold text-sm">{result.headline}</span>
            </div>
            <span className="text-[10px] font-mono opacity-70">
              Verified: {result.verifiedAt ? new Date(result.verifiedAt).toLocaleTimeString() : 'Just now'}
            </span>
          </div>

          <p className="leading-relaxed font-medium">{result.detailedMessage}</p>

          {/* Matches List */}
          {result.matchedTransactions && result.matchedTransactions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200/50 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider block">Authoritative Ledger Match:</span>
              {result.matchedTransactions.map((m: any) => (
                <div key={m.transactionId} className="flex flex-wrap items-center justify-between text-[11px] bg-white/70 p-2 rounded-lg border border-slate-200/40">
                  <span className="font-mono font-bold">₹{m.amount.toLocaleString('en-IN')} via {m.paymentMethod}</span>
                  <span className="text-slate-600">{m.customerName} ({m.customerVpa})</span>
                  <span className="font-mono text-slate-500">Ref: {m.orderId}</span>
                </div>
              ))}
            </div>
          )}

          {/* Fraud advisory disclaimer */}
          <div className="mt-2 flex items-start gap-1.5 text-[11px] pt-1 border-t border-slate-200/40 opacity-85">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{result.fraudAssessment.advisoryNote}</span>
          </div>
        </div>
      )}
    </div>
  );
};

