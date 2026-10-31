import React, { useState } from 'react';
import { DailyBriefing, IndianLanguage, MerchantProfile } from '../types/index.ts';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  Play,
  RotateCcw,
} from 'lucide-react';

interface DailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: MerchantProfile;
  briefings: DailyBriefing[];
  onGenerateBriefing: (language: IndianLanguage) => Promise<void>;
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  isOpen,
  onClose,
  merchant,
  briefings,
  onGenerateBriefing,
}) => {
  const [selectedBriefingIndex, setSelectedBriefingIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLang, setSelectedLang] = useState<IndianLanguage>(merchant.primaryLanguage || 'hi');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const currentBriefing = briefings[selectedBriefingIndex] || briefings[0];

  const handlePlayAudio = () => {
    if (!currentBriefing) return;
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not available in your browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentBriefing.spokenAudioText);
    utterance.lang = currentBriefing.language === 'en' ? 'en-IN' : `${currentBriefing.language}-IN`;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateBriefing(selectedLang);
      setSelectedBriefingIndex(0);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 text-xs max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#002970] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Daily Business Intelligence Briefing
              </h2>
              <p className="text-[11px] text-slate-500">
                Automated executive summary tailored for {merchant.businessName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as IndianLanguage)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs"
            >
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Selector / Archive Tabs */}
        <div className="py-2.5 flex items-center justify-between gap-2 border-b border-slate-100 text-[11px]">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 mr-1">Archive:</span>
            {briefings.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBriefingIndex(idx);
                  window.speechSynthesis?.cancel();
                  setIsPlaying(false);
                }}
                className={`px-2.5 py-1 rounded font-medium whitespace-nowrap transition-colors ${
                  selectedBriefingIndex === idx
                    ? 'bg-[#002970] text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {b.date === '2026-10-30' ? 'Today (30 Oct)' : b.date}
              </button>
            ))}
          </div>

          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="text-[11px] font-semibold text-[#002970] hover:underline flex items-center gap-1 shrink-0"
          >
            <RotateCcw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : 'Refresh Briefing'}</span>
          </button>
        </div>

        {/* Briefing Content Body */}
        {currentBriefing ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Audio Narration Bar */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayAudio}
                  className="w-8 h-8 rounded-full bg-[#002970] text-white flex items-center justify-center hover:bg-[#001f52] shadow-xs"
                >
                  {isPlaying ? <VolumeX className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>
                <div>
                  <div className="font-semibold text-slate-900 text-xs">
                    {isPlaying ? 'Playing Spoken Executive Audio...' : 'Listen to Spoken Audio Briefing'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Duration: ~{currentBriefing.audioDurationSeconds} seconds · High-fidelity Indian voice
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-bold uppercase">
                {currentBriefing.language} Audio
              </span>
            </div>

            {/* Metric Highlights Strip */}
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-sans">Collections</div>
                <div className="text-base font-bold text-slate-900">
                  ₹{currentBriefing.todayCollections.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 font-sans">{currentBriefing.todayTransactions} transactions</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-sans">Settled to Bank</div>
                <div className="text-base font-bold text-emerald-700">
                  ₹{currentBriefing.settledAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 font-sans">In-Transit / Credited</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-sans">Exceptions / Refunds</div>
                <div className="text-base font-bold text-slate-700">
                  {currentBriefing.refundsCount} (₹{currentBriefing.refundsAmount})
                </div>
                <div className="text-[10px] text-slate-400 font-sans">Promptly returned</div>
              </div>
            </div>

            {/* Narrative Sections */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#002970]" />
                  <span>Settlement Status & Bank Cutoff</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{currentBriefing.settlementStatus}</p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Cash Flow & Loan EMI Deduction</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{currentBriefing.cashFlowHighlight}</p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Customer Khata (Credit) Outstanding</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{currentBriefing.creditOverdueSummary}</p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Key Growth & Promotional Opportunity</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{currentBriefing.keyGrowthOpportunity}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">Loading daily briefing...</div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-500">
          <span className="text-[11px]">
            Scheduled daily at 22:30 IST
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
