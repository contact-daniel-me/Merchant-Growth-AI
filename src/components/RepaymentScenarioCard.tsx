import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import type { IndianLanguage } from '../types/index.ts';
import { Calculator, ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

interface RepaymentScenarioCardProps {
  merchantId: string;
  currentLanguage?: IndianLanguage;
}

export const RepaymentScenarioCard: React.FC<RepaymentScenarioCardProps> = ({ merchantId }) => {
  const [data, setData] = useState<any>(null);
  const [selectedEmi, setSelectedEmi] = useState<number>(500);
  const [selectedTenure, setSelectedTenure] = useState<number>(6);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    api.getLoanScenarios(merchantId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => console.error('Failed to load loan scenarios:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-10 bg-slate-100 rounded" />
      </div>
    );
  }

  // Find scenario matching current selections
  const activeScenario =
    data.scenarios?.find(
      (s: any) => s.dailyEmiAmount === selectedEmi && s.tenureMonths === selectedTenure
    ) || data.scenarios?.[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#172B4D]">
              Cash-Flow & Daily Repayment Scenario Simulator
            </h3>
            <p className="text-xs text-slate-500">
              Compare how daily repayment amounts impact your remaining business cash (Zero arbitrary multipliers)
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-[#002970] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 w-fit">
          Avg Sales: ₹{data.historicalMetrics.averageDailyCollections.toLocaleString('en-IN')}/day
        </span>
      </div>

      {/* Selector Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Hypothetical Daily Deduction:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[250, 500, 1000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setSelectedEmi(amt)}
                className={`py-2 px-3 text-xs font-mono font-bold rounded-xl border transition cursor-pointer ${
                  selectedEmi === amt
                    ? 'bg-[#002970] text-white border-[#002970] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ₹{amt}/day
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Tenure:</label>
          <div className="grid grid-cols-3 gap-2">
            {[3, 6, 12].map((ten) => (
              <button
                key={ten}
                type="button"
                onClick={() => setSelectedTenure(ten)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  selectedTenure === ten
                    ? 'bg-[#002970] text-white border-[#002970] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {ten} Months
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario Output Card */}
      {activeScenario && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Estimated Remaining Daily Cash:</span>
              <div className="text-xl font-bold font-mono text-[#002970]">
                ₹{activeScenario.estimatedRemainingDailyCash.toLocaleString('en-IN')}/day
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  activeScenario.cashFlowStressLevel === 'COMFORTABLE'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : activeScenario.cashFlowStressLevel === 'MODERATE'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}
              >
                {activeScenario.cashFlowStressLevel} STRESS ({activeScenario.safeBufferPercentage}% Buffer)
              </span>
              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                Total Repayment: ₹{activeScenario.totalRepaymentAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-slate-600">
            <span className="text-[11px] font-bold text-slate-700 block">Scenario Assumptions:</span>
            {activeScenario.assumptions?.map((ass: string, i: number) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px]">
                <span className="text-slate-400">•</span>
                <span>{ass}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal & Underwriting Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <span>{data.disclaimerNote}</span>
      </div>
    </div>
  );
};

