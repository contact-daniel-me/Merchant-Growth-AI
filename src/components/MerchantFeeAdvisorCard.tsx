import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { Percent, Info, ShieldCheck, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

interface MerchantFeeAdvisorCardProps {
  merchantId: string;
}

export const MerchantFeeAdvisorCard: React.FC<MerchantFeeAdvisorCardProps> = ({ merchantId }) => {
  const [assessment, setAssessment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    api.getFeeAssessment(merchantId)
      .then((data) => {
        if (isMounted) setAssessment(data);
      })
      .catch((err) => console.error('Failed to load fee assessment:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  if (isLoading || !assessment) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-10 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#172B4D]">Understand Your Payment Charges & UPI Fee Policy</h3>
            <p className="text-xs text-slate-500">
              Auditable intelligence on current 0% UPI rates vs announced 2026 framework
            </p>
          </div>
        </div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border w-fit ${
            assessment.isSmallMerchantExempt
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-blue-800 bg-blue-50 border-blue-200'
          }`}
        >
          {assessment.isSmallMerchantExempt ? '100% Small Merchant Exemption' : '2026 Post-Diwali Framework Ready'}
        </span>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#002970] text-sm">{assessment.advisoryHeadline}</span>
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            30-Day Window: ₹{assessment.merchantMonthlyVolume.toLocaleString('en-IN')}
          </span>
        </div>
        <p className="text-slate-600 leading-relaxed">{assessment.policySummaryNote}</p>
      </div>

      {/* Comparison Metrics: Actual vs Upcoming Policy Estimate */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 block">Actual Fees Deducted (Last 30 Days)</span>
          <span className="text-xl font-bold font-mono text-[#172B4D] mt-1 block">
            ₹{assessment.actualFeesDeducted.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
            ✓ 0% MDR on all UPI & Soundbox receipts
          </span>
        </div>

        <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/70">
          <span className="text-[11px] font-semibold text-blue-900 block">2026 Modeled Fee Estimate</span>
          <span className="text-xl font-bold font-mono text-[#002970] mt-1 block">
            ₹{assessment.projectedFeesUnder2026Framework.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-blue-700 block mt-1">
            * Upcoming policy estimate only. Not currently deducted.
          </span>
        </div>

        <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200/70">
          <span className="text-[11px] font-semibold text-indigo-900 block">Estimated Annual Fee Impact</span>
          <span className="text-xl font-bold font-mono text-indigo-950 mt-1 block">
            ₹{assessment.estimatedAnnualCost.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-indigo-700 block mt-1">
            Exempts tickets ≤ ₹2,000 + ₹300 maximum cap per payment
          </span>
        </div>
      </div>

      {/* Sample Classified Transactions */}
      {assessment.classifiedTransactions && assessment.classifiedTransactions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 block">Recent Payment Fee Classifications:</span>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {assessment.classifiedTransactions.slice(0, 5).map((t: any) => (
              <div
                key={t.transactionId}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-200/60 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900">₹{t.amount.toLocaleString('en-IN')}</span>
                  <span className="text-slate-500 ml-2">via {t.paymentMethod}</span>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.statusNote}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      t.isEligibleForFee ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {t.isEligibleForFee ? `Est. 0.4%: ₹${t.feeAmount}` : '0% Exempt'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

