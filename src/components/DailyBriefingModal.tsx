import React, { useState, useRef, useEffect } from 'react';
import { DailyBriefing, IndianLanguage, MerchantProfile } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Calendar,
  X,
  AlertCircle,
  TrendingUp,
  Clock,
  Play,
  RotateCcw,
  Square,
  CheckCircle2,
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
  const [selectedLang, setSelectedLang] = useState<IndianLanguage>(merchant.primaryLanguage || 'en');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioSource, setAudioSource] = useState<'sarvam' | 'browser' | 'none'>('none');
  const [audioProgress, setAudioProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isOpen) return null;

  const currentBriefing = briefings[selectedBriefingIndex] || briefings[0];

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const handlePlayAudio = async () => {
    if (!currentBriefing) return;

    if (isPlaying) {
      stopAudio();
      return;
    }

    // 1. Try Sarvam AI Audio (pre-cached or fetched via POST /api/voice/tts)
    let base64 = currentBriefing.audioBase64;
    if (!base64 && currentBriefing.spokenAudioText) {
      setIsGenerating(true);
      try {
        const ttsRes = await api.voiceTTS(currentBriefing.spokenAudioText, selectedLang);
        if (ttsRes.success && ttsRes.audioBase64) {
          base64 = ttsRes.audioBase64;
          currentBriefing.audioBase64 = base64;
        }
      } catch (e) {
        console.warn('Sarvam TTS API call failed, falling back:', e);
      } finally {
        setIsGenerating(false);
      }
    }

    if (base64) {
      try {
        const audioUrl = base64.startsWith('data:audio') ? base64 : `data:audio/mpeg;base64,${base64}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setAudioSource('sarvam');

        audio.ontimeupdate = () => {
          if (audio.duration) {
            setAudioProgress((audio.currentTime / audio.duration) * 100);
          }
        };

        audio.onended = () => {
          setIsPlaying(false);
          setAudioProgress(0);
        };

        audio.onerror = () => {
          console.warn('Audio playback error, falling back to speech synthesis');
          fallbackSpeechSynthesis();
        };

        await audio.play();
        setIsPlaying(true);
        return;
      } catch (err) {
        console.warn('Failed to play Sarvam audio, using fallback:', err);
      }
    }

    // 2. Client-side Speech Synthesis Fallback
    fallbackSpeechSynthesis();
  };

  const fallbackSpeechSynthesis = () => {
    if (!('speechSynthesis' in window) || !currentBriefing) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentBriefing.spokenAudioText);
    const langMap: Record<IndianLanguage, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      te: 'te-IN',
    };
    utterance.lang = langMap[selectedLang] || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setAudioSource('browser');
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setAudioProgress(0);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setAudioProgress(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleRegenerate = async (langToUse: IndianLanguage = selectedLang) => {
    stopAudio();
    setIsGenerating(true);
    try {
      await onGenerateBriefing(langToUse);
      setSelectedBriefingIndex(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLanguageChange = async (newLang: IndianLanguage) => {
    setSelectedLang(newLang);
    await handleRegenerate(newLang);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 text-xs max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#002970] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-[#00BAF2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Daily Business Intelligence Briefing
                <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium border border-sky-200">
                  Sarvam Bulbul v4
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Grounded executive briefing for {merchant.businessName} · Zero Hallucination
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedLang}
              onChange={(e) => handleLanguageChange(e.target.value as IndianLanguage)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium cursor-pointer"
            >
              <option value="en">English (Default)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
            <button
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Selector / Archive Tabs */}
        <div className="py-2.5 flex items-center justify-between gap-2 border-b border-slate-100 text-[11px]">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 mr-1">Date:</span>
            {briefings.map((b, idx) => (
              <button
                key={b.id || idx}
                onClick={() => {
                  stopAudio();
                  setSelectedBriefingIndex(idx);
                }}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedBriefingIndex === idx
                    ? 'bg-[#002970] text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {b.date || 'Today'}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleRegenerate()}
            disabled={isGenerating}
            className="text-[11px] font-semibold text-[#00BAF2] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : 'Refresh Briefing'}</span>
          </button>
        </div>

        {/* Briefing Content Body */}
        {currentBriefing ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Audio Narration Bar */}
            <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200/80 rounded-xl relative overflow-hidden">
              {isPlaying && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-[#00BAF2] transition-all duration-300"
                  style={{ width: `${audioProgress}%` }}
                />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayAudio}
                    disabled={isGenerating}
                    className="w-10 h-10 rounded-full bg-[#002970] text-white flex items-center justify-center hover:bg-[#001f52] shadow-sm transition cursor-pointer"
                    title={isPlaying ? 'Stop Spoken Audio' : 'Play Spoken Audio Briefing'}
                  >
                    {isPlaying ? (
                      <Square className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    )}
                  </button>
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      {isPlaying ? (
                        <>
                          <Volume2 className="w-4 h-4 text-[#00BAF2] animate-pulse" />
                          <span>Playing Spoken Executive Audio...</span>
                        </>
                      ) : (
                        <span>Listen to Spoken Audio Briefing</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {audioSource === 'sarvam'
                        ? 'Sarvam AI Bulbul v4 Flash (Neural Indic Speech)'
                        : `Natural Voice · ${currentBriefing.language.toUpperCase()}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#002970] bg-white border border-sky-200 px-2 py-0.5 rounded-full font-bold uppercase">
                    {currentBriefing.language} Voice
                  </span>
                </div>
              </div>

              {/* Spoken transcript preview */}
              <div className="mt-3 pt-3 border-t border-sky-100 text-[11px] text-slate-700 italic bg-white/70 p-2.5 rounded-lg">
                &ldquo;{currentBriefing.spokenAudioText}&rdquo;
              </div>
            </div>

            {/* Metric Highlights Strip */}
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-sans">Today's Collections</div>
                <div className="text-base font-bold text-slate-900">
                  ₹{currentBriefing.todayCollections.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 font-sans">{currentBriefing.todayTransactions} transactions</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-sans">Settled to Bank</div>
                <div className="text-base font-bold text-emerald-700">
                  ₹{currentBriefing.settledAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 font-sans">In-Transit / Bank Credit</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-sans">Exceptions / Deductions</div>
                <div className="text-base font-bold text-slate-700">
                  {currentBriefing.refundsCount} (₹{currentBriefing.refundsAmount})
                </div>
                <div className="text-[10px] text-slate-400 font-sans">Reconciled</div>
              </div>
            </div>

            {/* Grounded Narrative Sections */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#002970]" />
                  <span>Settlement Status & Reconciliation</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{currentBriefing.settlementStatus}</p>
                {currentBriefing.exceptionsNotice && (
                  <p className="text-[11px] text-amber-700 mt-1 font-medium bg-amber-50 p-1.5 rounded border border-amber-200/60">
                    {currentBriefing.exceptionsNotice}
                  </p>
                )}
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Cash Flow & Loan EMI Projection</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{currentBriefing.cashFlowHighlight}</p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Customer Khata (Store Credit)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{currentBriefing.creditOverdueSummary}</p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
                  <span>Growth & Peak Hour Opportunity</span>
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
          <span className="text-[11px] flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified against SQLite ledger & analytics engine
          </span>
          <button
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
