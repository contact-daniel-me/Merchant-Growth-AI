import React, { useState } from 'react';
import { GrowthInsight } from '../types/index.ts';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  Gift,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Megaphone,
} from 'lucide-react';

interface GrowthIntelligenceTabProps {
  growthInsights: GrowthInsight[];
  hourlyDistribution: { hour: string; amount: number; count: number }[];
  onPrepareCampaign: (insight: GrowthInsight) => void;
}

export const GrowthIntelligenceTab: React.FC<GrowthIntelligenceTabProps> = ({
  growthInsights,
  hourlyDistribution,
  onPrepareCampaign,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredInsights = growthInsights.filter((item) =>
    selectedCategory === 'ALL' ? true : item.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#002970]" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Paytm Merchant Growth & Campaign Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic business intelligence: every recommendation is grounded in your actual payment velocity, customer frequency, and local festival patterns.
          </p>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
          {['ALL', 'PEAK_HOURS', 'FESTIVAL_OPPORTUNITY', 'REPEAT_CUSTOMER'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                selectedCategory === cat ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? 'All Insights' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Peak Business Hours Footfall Distribution Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Intraday Transaction Velocity & Peak Hour Heatmap
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies rush hours (18:30–21:00) vs afternoon slumps (13:00–16:00) to optimize staff and promos
            </p>
          </div>
          <div className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
            Peak Velocity: 42 txns/hr (19:00 - 20:30 IST)
          </div>
        </div>

        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(val: any, name: any) => [
                  name === 'amount' ? `₹${Number(val).toLocaleString('en-IN')}` : `${val} transactions`,
                  name === 'amount' ? 'Collections' : 'Count',
                ]}
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '12px' }}
              />
              <Bar dataKey="amount" fill="#002970" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInsights.map((insight) => (
          <div
            key={insight.id}
            className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold text-[#002970] uppercase tracking-wider">
                  {insight.category.replace('_', ' ')}
                </span>
                <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {insight.confidenceScore}% Confidence
                </span>
              </div>

              <h4 className="mt-3 text-sm font-bold text-slate-900 leading-snug">
                {insight.title}
              </h4>

              <p className="mt-2 text-xs text-slate-600">
                {insight.summary}
              </p>

              {/* Grounded Evidence Box */}
              <div className="mt-3.5 p-3 bg-slate-50 border border-slate-200/80 rounded-md text-xs space-y-2">
                <div>
                  <span className="font-semibold text-slate-800">Verified Evidence: </span>
                  <span className="text-slate-600">{insight.evidence}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Suggested Action: </span>
                  <span className="text-slate-600">{insight.suggestedAction}</span>
                </div>
                <div>
                  <span className="font-semibold text-emerald-700">Projected Outcome: </span>
                  <span className="text-slate-900 font-medium">{insight.projectedLift}</span>
                </div>
                <div className="text-[11px] text-slate-600 border-t border-slate-200/60 pt-1.5">
                  <span className="font-semibold text-slate-600">Assumptions: </span>
                  {insight.assumptions}
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => onPrepareCampaign(insight)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#002970] hover:bg-[#001f52] rounded-md transition-colors"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Prepare Action in Action Centre</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
