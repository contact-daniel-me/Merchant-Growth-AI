import React, { useState, useEffect } from 'react';
import { MerchantProfile, IndianLanguage, DailyBriefing } from '../types/index.ts';
import { FinancialOverviewReport } from '../server/analyticsEngine.ts';
import { translations } from '../utils/translations.ts';
import { OfflineCacheService } from '../services/offlineCache.ts';
import {
  Mic,
  TrendingUp,
  CreditCard,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Building,
  HelpCircle,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';

interface SimpleHomeScreenProps {
  merchant: MerchantProfile;
  overview: FinancialOverviewReport;
  briefing?: DailyBriefing;
  currentLanguage: IndianLanguage;
  onOpenVoice: (prompt?: string) => void;
  onNavigateTab: (tab: string) => void;
  onPlayBriefingAudio: (text: string) => void;
  isAudioPlaying: boolean;
  /** True while the spoken summary audio is being prepared (Sarvam TTS request in flight). */
  isAudioLoading?: boolean;
  audioError?: string | null;
}

export const SimpleHomeScreen: React.FC<SimpleHomeScreenProps> = ({
  merchant,
  overview,
  briefing,
  currentLanguage,
  onOpenVoice,
  onNavigateTab,
  onPlayBriefingAudio,
  isAudioPlaying,
  isAudioLoading = false,
  audioError = null,
}) => {
  const t = translations[currentLanguage] || translations.hi;

  // Determine time of day greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return t.greetingMorning;
    if (hr < 17) return t.greetingAfternoon;
    return t.greetingEvening;
  };

  useEffect(() => {
    if (briefing) {
      OfflineCacheService.saveOfflineBriefing(merchant.id, briefing);
    }
  }, [merchant.id, briefing]);

  const cacheStatus = OfflineCacheService.getFreshnessBadgeText(merchant.id);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* 1. Top Greeting Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#00BAF2] uppercase tracking-wide">
                {merchant.businessName}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-medium text-slate-500">
                MID: {merchant.mid}
              </span>
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight">
              {getGreeting()}, {merchant.ownerName} ji!
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {t.howIsBusiness}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {cacheStatus && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                <Wifi className="w-3 h-3 text-[#00BAF2]" />
                <span>{cacheStatus}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Soundbox Active</span>
            </span>
          </div>
        </div>

        {/* 2. Prominent "Talk to Your Business Assistant" Button */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => onOpenVoice()}
            className="w-full bg-[#002970] hover:bg-[#001f55] text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition-all shadow-md group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-12 h-12 rounded-xl bg-[#00BAF2] text-[#002970] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Mic className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold tracking-tight">
                  {t.talkToAssistant}
                </div>
                <div className="text-xs sm:text-sm text-blue-100 mt-0.5">
                  {t.assistantSubheading}
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold">
              <span>{translations[currentLanguage]?.tapToSpeak || 'Tap to talk'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Three Large Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Money Received Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t.moneyReceivedToday}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              ₹
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-[#172B4D] tracking-tight">
            ₹{(overview.todayCollections || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t.salesComparison}</span>
          </div>
        </div>

        {/* Card 2: Payments Received Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t.paymentsReceived}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#00BAF2] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-[#172B4D] tracking-tight">
            {overview.todayTransactionsCount} <span className="text-base font-normal text-slate-500">payments</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Avg bill: ₹{(overview.averageTransactionValue || 0).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Card 3: Money Yet to Come */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t.moneyYetToCome}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-[#002970] tracking-tight">
            ₹{(overview.inTransitSettlementAmount || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Reaches {merchant.settlementAccount?.bankName || 'bank account'} by 11:30 PM
          </div>
        </div>
      </div>

      {/* 4. Daily Business Summary Card (Section 9) */}
      <div className="bg-gradient-to-br from-blue-50/80 to-white rounded-2xl border border-blue-200/70 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#002970] text-[#00BAF2] flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#002970]">
                Your Business Today
              </h2>
              <p className="text-xs text-slate-600">
                Simple daily summary in your preferred language
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Fallback text (only if no brief has loaded yet) follows the selected language.
                const fallbackText =
                  currentLanguage === 'hi'
                    ? `आज आपकी कुल बिक्री ₹${overview.todayCollections} रही, जो ${overview.todayTransactionsCount} पेमेंट्स से आई। ₹${overview.inTransitSettlementAmount} आज रात आपके बैंक खाते में जमा हो जाएंगे।`
                    : `Today your total sales are ₹${overview.todayCollections} from ${overview.todayTransactionsCount} payments. ₹${overview.inTransitSettlementAmount} will reach your bank account tonight.`;
                onPlayBriefingAudio(briefing?.spokenAudioText || fallbackText);
              }}
              data-testid="listen-summary"
              aria-busy={isAudioLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#002970] text-white hover:bg-[#001f55] text-xs font-semibold shadow-xs transition-colors"
            >
              {isAudioLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00BAF2]" />
              ) : isAudioPlaying ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#00BAF2]" />
              )}
              <span>{isAudioLoading ? 'Preparing audio…' : isAudioPlaying ? 'Stop Audio' : t.listenToSummary}</span>
            </button>
            <button
              onClick={() => onNavigateTab('payments')}
              className="px-3 py-1.5 rounded-xl bg-white text-[#002970] border border-blue-200 hover:bg-blue-50 text-xs font-semibold transition-colors"
            >
              {t.viewDetails}
            </button>
            {audioError && (
              <span role="status" className="text-[11px] text-red-600">
                {audioError}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3.5 text-xs text-slate-700 leading-relaxed space-y-1.5">
          <p>
            • Today's total sales are <strong>₹{(overview.todayCollections || 0).toLocaleString('en-IN')}</strong> from <strong>{overview.todayTransactionsCount || 0} payments</strong>.
          </p>
          <p>
            • <strong>₹{(overview.inTransitSettlementAmount || 0).toLocaleString('en-IN')}</strong> will reach your {merchant.settlementAccount?.bankName || 'bank'} account tonight by 11:30 PM.
          </p>
          {overview.refundsCount > 0 && (
            <p>
              • {overview.refundsCount} refund of ₹{overview.refundsAmount} was processed back to customer.
            </p>
          )}
          <p className="text-[#002970] font-medium pt-1">
            💡 Quick Tip: Most customers visit your shop between 6:00 PM and 9:00 PM. Keeping change ready will speed up lines!
          </p>
        </div>
      </div>

      {/* 5. Today's Updates & Business Tips Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Updates */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#172B4D]">
              {t.todaysUpdates}
            </h3>
            <span className="text-[11px] font-mono font-medium text-slate-500">Today</span>
          </div>

          <div className="mt-3.5 space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-slate-900">
                  {overview.todayTransactionsCount} payments received successfully
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Soundbox announced each payment instantly.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-[#00BAF2] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-slate-900">
                  1 settlement is pending to bank
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  ₹{(overview.inTransitSettlementAmount || 0).toLocaleString('en-IN')} will be credited tonight.
                </div>
              </div>
            </div>

            {overview.refundsCount > 0 && (
              <div className="flex items-start gap-2.5">
                <RotateCcw className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900">
                    {overview.refundsCount} refund processed (₹{overview.refundsAmount})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Returned to customer immediately for duplicate bill.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs font-bold text-[#002970] hover:text-[#00BAF2] flex items-center gap-1 transition-colors"
            >
              <span>See all payments →</span>
            </button>
          </div>
        </div>

        {/* Business Tips */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#172B4D]">
                {t.businessTips}
              </h3>
              <span className="text-[11px] text-[#00BAF2] font-semibold">Easy advice</span>
            </div>

            <div className="mt-3.5 p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
              <div className="font-bold text-[#002970]">
                "Your shop receives more payments between 6 PM and 9 PM."
              </div>
              <p className="mt-1 text-slate-600 leading-relaxed text-[11px]">
                68% of your daily sales happen in this evening window. Having snacks or quick-grab items near the billing counter can increase sales by ₹2,400 daily.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('growth')}
              className="text-xs font-bold text-[#002970] hover:text-[#00BAF2] flex items-center gap-1 transition-colors"
            >
              <span>Explore growth & partner loans →</span>
            </button>
            <button
              onClick={() => onOpenVoice('How can I increase my shop sales?')}
              className="text-xs text-[#00BAF2] font-semibold hover:underline"
            >
              Ask Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
