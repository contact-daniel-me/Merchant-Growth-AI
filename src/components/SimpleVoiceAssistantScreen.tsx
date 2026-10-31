import React, { useState, useEffect, useRef } from 'react';
import { MerchantProfile, IndianLanguage, AgentChatMessage } from '../types/index.ts';
import { translations } from '../utils/translations.ts';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  RotateCcw,
  Radio,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface SimpleVoiceAssistantScreenProps {
  merchant: MerchantProfile;
  currentLanguage: IndianLanguage;
  onSelectLanguage: (lang: IndianLanguage) => void;
  onApproveAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string) => Promise<void>;
}

export const SimpleVoiceAssistantScreen: React.FC<SimpleVoiceAssistantScreenProps> = ({
  merchant,
  currentLanguage,
  onSelectLanguage,
  onApproveAction,
  onRejectAction,
}) => {
  const t = translations[currentLanguage] || translations.hi;

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastRecognizedQuery, setLastRecognizedQuery] = useState<string>('');
  const [lastAnswer, setLastAnswer] = useState<{
    text: string;
    spokenText: string;
    actionCard?: any;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      const langMap: Record<IndianLanguage, string> = {
        hi: 'hi-IN',
        ta: 'ta-IN',
        kn: 'kn-IN',
        te: 'te-IN',
        en: 'en-IN',
      };
      recognition.lang = langMap[currentLanguage] || 'hi-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLastRecognizedQuery(transcript);
        setInputText(transcript);
        if (event.results[0].isFinal) {
          setIsListening(false);
          handleProcessQuery(transcript);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, [currentLanguage]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setLastRecognizedQuery('');
      recognitionRef.current?.start();
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const clean = text.replace(/\*\*/g, '').replace(/###/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    const langMap: Record<IndianLanguage, string> = {
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      te: 'te-IN',
      en: 'en-IN',
    };
    utterance.lang = langMap[currentLanguage] || 'hi-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleProcessQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsProcessing(true);
    setLastRecognizedQuery(queryText.trim());

    try {
      const response = await fetch('/api/voice/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant.id,
          query: queryText.trim(),
          language: currentLanguage,
          voicePin: '1947',
          isAuthenticated: true,
        }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const result = data.data;
        setLastAnswer({
          text: result.responseText,
          spokenText: result.spokenResponseText || result.responseText,
          actionCard: result.actionCard,
        });

        // Automatically narrate spoken answer
        speakText(result.spokenResponseText || result.responseText);
      }
    } catch (err: any) {
      setLastAnswer({
        text: `Error: ${err.message}. Please try again.`,
        spokenText: 'Something went wrong. Please ask again.',
      });
    } finally {
      setIsProcessing(false);
      setInputText('');
    }
  };

  // Section 4: Suggested simple questions
  const suggestedQuestions: Record<IndianLanguage, string[]> = {
    hi: [
      'आज मैंने कितना पैसा कमाया?',
      'मेरा अटका हुआ पैसा कहाँ है?',
      '27 अक्टूबर के सेटलमेंट में क्या गड़बड़ है?',
      'मेरी दुकान की बिक्री कैसी चल रही है?',
      'मैं अपनी बिक्री कैसे बढ़ा सकता हूँ?',
    ],
    en: [
      'How much did I earn today?',
      'Where is my pending money?',
      'Why is my settlement delayed?',
      'How is my business doing?',
      'How can I increase my sales?',
    ],
    ta: [
      'இன்று நான் எவ்வளவு சம்பாதித்தேன்?',
      'என் வர வேண்டிய பணம் எங்கே?',
      'செட்டில்மென்ட் தாமதத்திற்கு காரணம் என்ன?',
      'என் வியாபாரம் எப்படி நடக்கிறது?',
      'என் விற்பனையை எப்படி அதிகரிக்கலாம்?',
    ],
    kn: [
      'ಇಂದು ನಾನು ಎಷ್ಟು ಹಣ ಗಳಿಸಿದೆ?',
      'ನನ್ನ ಬಾಕಿ ಹಣ ಎಲ್ಲಿದೆ?',
      'ಸೆಟಲ್ಮೆಂಟ್ ವಿಳಂಬಕ್ಕೆ ಕಾರಣವೇನು?',
      'ನನ್ನ ವ್ಯಾಪಾರ ಹೇಗಿದೆ?',
      'ನನ್ನ ಮಾರಾಟವನ್ನು ಹೆಚ್ಚಿಸುವುದು ಹೇಗೆ?',
    ],
    te: [
      'ఈ రోజు నేను ఎంత సంపాదించాను?',
      'నా పెండింగ్ డబ్బు ఎక్కడ ఉంది?',
      'సెటిల్మెంట్ ఆలస్యానికి కారణం ఏమిటి?',
      'నా వ్యాపారం ఎలా నడుస్తోంది?',
      'నా అమ్మకాలను ఎలా పెంచుకోవాలి?',
    ],
  };

  const currentQuestions = suggestedQuestions[currentLanguage] || suggestedQuestions.hi;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6 font-sans">
      {/* 1. Friendly Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#002970] text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
          <span>Paytm Voice Business Companion</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
          {t.assistantHeading}
        </h1>
        <p className="mt-1.5 text-sm sm:text-base text-slate-600">
          {t.assistantSubheading}
        </p>

        {/* 2. Large Central Microphone Button */}
        <div className="mt-8 flex flex-col items-center justify-center">
          <button
            onClick={toggleListening}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${
              isListening
                ? 'bg-rose-600 text-white shadow-rose-200 ring-8 ring-rose-100 animate-pulse'
                : 'bg-[#002970] text-white hover:bg-[#001f55] hover:shadow-2xl ring-8 ring-blue-50'
            }`}
            title="Tap to speak"
          >
            {isListening ? (
              <MicOff className="w-12 h-12 stroke-[2.5]" />
            ) : (
              <Mic className="w-12 h-12 stroke-[2.5] text-[#00BAF2]" />
            )}
          </button>

          {/* Status Label */}
          <div className="mt-4 text-center">
            {isListening ? (
              <div className="text-base font-bold text-rose-600 animate-pulse flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span>{t.listening}</span>
              </div>
            ) : isProcessing ? (
              <div className="text-sm font-semibold text-[#002970] flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#00BAF2] border-t-transparent rounded-full animate-spin" />
                <span>Checking your shop records...</span>
              </div>
            ) : (
              <div className="text-sm font-medium text-slate-500">
                {t.tapToSpeak}
              </div>
            )}
          </div>
        </div>

        {/* 3. Recognised Sentence Card */}
        {lastRecognizedQuery && (
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
            <div className="text-xs font-semibold text-slate-500">You asked:</div>
            <div className="text-base font-bold text-[#172B4D] mt-0.5">
              "{lastRecognizedQuery}"
            </div>
          </div>
        )}

        {/* 4. Large Readable Answer Card */}
        {lastAnswer && (
          <div className="mt-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-50/90 to-white border border-blue-200 text-left shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#002970] text-[#00BAF2] flex items-center justify-center text-xs font-bold">
                  ₹
                </div>
                <span className="text-xs font-bold text-[#002970]">
                  Assistant's Answer
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    else speakText(lastAnswer.spokenText);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#002970] text-white hover:bg-[#001f55] text-xs font-semibold shadow-xs"
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#00BAF2]" />}
                  <span>{isSpeaking ? 'Stop' : 'Replay Answer'}</span>
                </button>
              </div>
            </div>

            <div className="mt-3.5 text-base sm:text-lg font-bold text-[#172B4D] leading-relaxed whitespace-pre-line">
              {lastAnswer.text}
            </div>

            {/* Action Authorization Card if sensitive action drafted */}
            {lastAnswer.actionCard && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs">
                <div className="font-bold text-sm text-amber-900 mb-1">
                  Confirmation Needed: {lastAnswer.actionCard.title}
                </div>
                <p className="text-slate-700">{lastAnswer.actionCard.description}</p>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => onRejectAction(lastAnswer.actionCard.id)}
                    className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onApproveAction(lastAnswer.actionCard.id)}
                    className="px-4 py-1.5 bg-[#002970] text-white rounded-lg font-bold hover:bg-[#001f55] flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00BAF2]" />
                    <span>Approve & Send</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fallback Typed Input */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleProcessQuery(inputText);
            }}
            placeholder="Type your question if you cannot speak right now..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
          />
          <button
            onClick={() => handleProcessQuery(inputText)}
            disabled={!inputText.trim() || isProcessing}
            className="px-4 py-2.5 bg-[#002970] text-white rounded-xl text-xs font-semibold hover:bg-[#001f55] disabled:opacity-40"
          >
            Ask
          </button>
        </div>
      </div>

      {/* 5. Simple Suggested Questions (Section 4) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-[#172B4D] mb-3">
          {t.askQuestionsPrompt}
        </h3>

        <div className="flex flex-wrap gap-2">
          {currentQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleProcessQuery(q)}
              className="text-left px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-xs sm:text-sm font-medium text-[#002970] border border-slate-200 hover:border-blue-200 transition-all flex items-center gap-2"
            >
              <span>{q}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#00BAF2] shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
