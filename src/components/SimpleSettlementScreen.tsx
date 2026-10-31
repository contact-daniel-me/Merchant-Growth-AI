import React, { useState } from 'react';
import { SettlementBatch, MerchantProfile, IndianLanguage } from '../types/index.ts';
import { translations } from '../utils/translations.ts';
import {
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  ShieldCheck,
  CreditCard,
  QrCode,
  Landmark,
} from 'lucide-react';

interface SimpleSettlementScreenProps {
  settlements: SettlementBatch[];
  merchant: MerchantProfile;
  currentLanguage: IndianLanguage;
  onAskWhy: (batch: SettlementBatch) => void;
}

export const SimpleSettlementScreen: React.FC<SimpleSettlementScreenProps> = ({
  settlements,
  merchant,
  currentLanguage,
  onAskWhy,
}) => {
  const t = translations[currentLanguage] || translations.hi;

  const totalInBank = settlements
    .filter((s) => s.status === 'SETTLED')
    .reduce((sum, s) => sum + s.netDisbursedAmount, 0);

  const totalPending = settlements
    .filter((s) => s.status === 'IN_TRANSIT' || s.status === 'PARTIAL' || s.status === 'DELAYED')
    .reduce((sum, s) => sum + (s.status === 'PARTIAL' ? (s.varianceAmount || 0) : s.netDisbursedAmount), 0);

  return (
    <div className="space-y-6 pb-20 md:pb-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight">
          {t.whereIsMyMoney}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Track money moving from your shop to your bank account: <strong>{merchant.settlementAccount.bankName} ({merchant.settlementAccount.accountNumber})</strong>
        </p>

        {/* Simple 3-Step Visual Flow (Section 6) */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            How your money reaches you:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#002970] text-[#00BAF2] flex items-center justify-center shrink-0 font-bold text-xs">
                1
              </div>
              <div>
                <div className="font-bold text-[#002970] text-xs">{t.moneyFlowStep1}</div>
                <div className="text-[11px] text-slate-500">Via QR or Soundbox</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#002970] text-[#00BAF2] flex items-center justify-center shrink-0 font-bold text-xs">
                2
              </div>
              <div>
                <div className="font-bold text-[#002970] text-xs">{t.moneyFlowStep2}</div>
                <div className="text-[11px] text-slate-500">Recorded instantly</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                3
              </div>
              <div>
                <div className="font-bold text-emerald-800 text-xs">{t.moneyFlowStep3}</div>
                <div className="text-[11px] text-slate-500">Every night at 11:30 PM</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Two Large Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Money Deposited in Bank */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t.moneyInBank}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-emerald-700">
            ₹{totalInBank.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Successfully credited with RBI bank UTR numbers
          </div>
        </div>

        {/* Money Pending to Bank */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t.moneyPendingBank}</span>
            <Clock className="w-4 h-4 text-[#00BAF2]" />
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-[#002970]">
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Arriving tonight in {merchant.settlementAccount.bankName}
          </div>
        </div>
      </div>

      {/* Settlement Records List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#172B4D]">
            Settlement History & Bank Records
          </h2>
          <span className="text-xs text-slate-500">Auto bank deposit</span>
        </div>

        <div className="divide-y divide-slate-100">
          {settlements.map((batch) => {
            const hasDifference = batch.varianceAmount && batch.varianceAmount > 0;
            return (
              <div key={batch.id} className="p-5 hover:bg-slate-50 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Landmark className="w-5 h-5 text-[#002970]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#172B4D]">
                        {batch.settlementDate === '2026-10-30' ? "Today's Settlement" : batch.settlementDate}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        Bank: {batch.bankAccount} · UTR: {batch.utrNumber}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-lg font-bold font-mono text-[#172B4D]">
                      ₹{batch.netDisbursedAmount.toLocaleString('en-IN')}
                    </div>
                    <div className="mt-0.5">
                      {batch.status === 'SETTLED' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Sent to Bank</span>
                        </span>
                      ) : batch.status === 'IN_TRANSIT' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          <Clock className="w-3 h-3 text-[#00BAF2]" />
                          <span>On the way (11:30 PM)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Some money is pending</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clear explanation of any difference (Section 6) */}
                {hasDifference && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-900">
                          ₹{batch.varianceAmount} is still pending. It has not reached your bank account yet.
                        </div>
                        <div className="text-amber-800 mt-0.5">
                          {batch.varianceNote || 'Partner bank clearing check was delayed. Your money is completely safe.'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onAskWhy(batch)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#002970] text-white font-bold hover:bg-[#001f55] transition-colors whitespace-nowrap self-start sm:self-auto text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#00BAF2]" />
                      <span>{t.askWhyPending}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
