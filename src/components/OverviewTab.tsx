import React from 'react';
import { FinancialOverviewReport } from '../server/analyticsEngine.ts';
import { MerchantProfile } from '../types/index.ts';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  CreditCard,
  QrCode,
  ArrowUpRight,
  ShieldAlert,
  Radio,
  CheckCircle2,
  Volume2,
  BatteryCharging,
  Clock,
  Sparkles,
} from 'lucide-react';

interface OverviewTabProps {
  overview: FinancialOverviewReport;
  merchant: MerchantProfile;
  onNavigateTab: (tab: string) => void;
  onOpenVoiceWithPrompt: (prompt: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  overview,
  merchant,
  onNavigateTab,
  onOpenVoiceWithPrompt,
}) => {
  const [soundboxChimePlaying, setSoundboxChimePlaying] = React.useState(false);

  // Play synthetic Paytm Soundbox audio announcement
  const playSoundboxTestChime = () => {
    setSoundboxChimePlaying(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        'पेटीएम पर एक सौ पच्चीस रुपये प्राप्त हुए. Paytm par ek sau pachhis rupaye prapt huye.'
      );
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.onend = () => setSoundboxChimePlaying(false);
      utterance.onerror = () => setSoundboxChimePlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setSoundboxChimePlaying(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* High-Priority Discrepancy & Alert Banner */}
      {overview.discrepanciesCount > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900 text-sm">
                Settlement Discrepancy Detected (Batch 27-Oct)
              </div>
              <div className="text-amber-800 mt-0.5">
                Variance of ₹1,100 detected between Soundbox collection ledger and clearing house disburals.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('settlements')}
              className="px-3 py-1.5 bg-amber-700 text-white font-medium rounded-md hover:bg-amber-800 transition-colors whitespace-nowrap"
            >
              Reconcile Batch
            </button>
            <button
              onClick={() => onOpenVoiceWithPrompt('27 अक्टूबर के सेटलमेंट में क्या गड़बड़ हुई है?')}
              className="px-3 py-1.5 bg-white text-amber-800 border border-amber-300 font-medium rounded-md hover:bg-amber-100/50 transition-colors whitespace-nowrap"
            >
              Ask Voice AI
            </button>
          </div>
        </div>
      )}

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Collections */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Today's Collections</span>
            <div className="p-1 rounded bg-blue-50 text-[#002970]">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ₹{(overview.todayCollections || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
              +14.2%
            </span>
            <span aria-hidden="true">·</span>
            <span>{overview.todayTransactionsCount || 0} transactions</span>
          </div>
        </div>

        {/* Metric 2: Average Ticket Size */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Average Order Value</span>
            <div className="p-1 rounded bg-slate-50 text-slate-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ₹{(overview.averageTransactionValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Evening peak AOV ₹1,420 · Morning ₹650</span>
          </div>
        </div>

        {/* Metric 3: Settlements in Transit */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>In-Transit to Bank</span>
            <div className="p-1 rounded bg-emerald-50 text-emerald-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-700 tracking-tight">
            ₹{(overview.inTransitSettlementAmount || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate">
            <span>{merchant.settlementAccount?.bankName || 'Bank'} (23:30 IST)</span>
          </div>
        </div>

        {/* Metric 4: Soundbox Audio Collections */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Soundbox 4G Volume</span>
            <div className="p-1 rounded bg-blue-50 text-[#002970]">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ₹{(overview.soundboxCollections || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>{overview.soundboxTransactionsCount || 0} verified instant chimes</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Grid: Weekly Trends & Soundbox Hardware Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Weekly Collections Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                7-Day Collections Trend (Verified Ledger)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic daily gross collections from UPI QR, Cards, and Soundbox
              </p>
            </div>
            <div className="text-xs font-mono font-medium text-slate-500">
              Weekly Gross: ₹160,840
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.weeklyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="paytmBlueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#002970" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#002970" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Collections']}
                  labelFormatter={(label) => `Day: ${label}`}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#002970"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#paytmBlueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#002970]" />
                UPI & Soundbox (72%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
                Cards & Wallet (28%)
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-[#002970] font-semibold hover:underline inline-flex items-center gap-1"
            >
              View Full Transaction Ledger →
            </button>
          </div>
        </div>

        {/* Right Column (1 Col): Soundbox Terminal & Instant Actions */}
        <div className="space-y-6">
          {/* Soundbox Terminal Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#002970]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Paytm Soundbox 4G Pro
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                CONNECTED
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Device Serial</span>
                <span className="font-mono font-medium text-slate-900">{merchant.deviceInfo.soundboxSerial}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Battery Status</span>
                <span className="font-mono font-medium text-slate-900 flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                  {merchant.deviceInfo.batteryLevel}% (Healthy)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Voice Language</span>
                <span className="font-medium text-slate-900 uppercase">{merchant.deviceInfo.languageAnnouncement} (Hindi Dual)</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Speaker Volume</span>
                <span className="font-medium text-slate-900">Level {merchant.deviceInfo.soundVolume} / 10</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={playSoundboxTestChime}
                disabled={soundboxChimePlaying}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#002970] bg-blue-50/80 hover:bg-blue-100 rounded-md transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                <span>{soundboxChimePlaying ? 'Playing Audio Announcement...' : 'Play Test Payment Chime'}</span>
              </button>
            </div>
          </div>

          {/* Quick Voice Assistant Prompts */}
          <div className="bg-slate-900 text-white rounded-lg p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                Conversational Intelligence
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Ask any question in Hindi, Tamil, Telugu, Kannada, or English.
            </p>

            <div className="mt-3.5 space-y-2">
              <button
                onClick={() => onOpenVoiceWithPrompt('आज की कुल बिक्री और साउंडबॉक्स कलेक्शन कितना रहा?')}
                className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700/80 text-xs text-slate-200 transition-colors flex items-center justify-between"
              >
                <span className="truncate">"आज की कुल बिक्री कितनी रही?"</span>
                <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
              <button
                onClick={() => onOpenVoiceWithPrompt('खाता बही में किस ग्राहक का बकाया बाकी है?')}
                className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700/80 text-xs text-slate-200 transition-colors flex items-center justify-between"
              >
                <span className="truncate">"खाता बही में किसका बकाया है?"</span>
                <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
              <button
                onClick={() => onOpenVoiceWithPrompt('कल के लिए कैश फ्लो का क्या अनुमान है?')}
                className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700/80 text-xs text-slate-200 transition-colors flex items-center justify-between"
              >
                <span className="truncate">"कल का कैश फ्लो अनुमान बताओ"</span>
                <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
