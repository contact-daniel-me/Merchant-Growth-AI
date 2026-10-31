import React, { useState, useRef, useEffect } from 'react';
import {
  MerchantProfile,
  IndianLanguage,
  CustomerCreditRecord,
  SettlementBatch,
} from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface SimpleVoiceAssistantScreenProps {
  merchant: MerchantProfile;
  currentLanguage: IndianLanguage;
  creditRecords: CustomerCreditRecord[];
  settlements: SettlementBatch[];
  onApproveAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string) => Promise<void>;
}

export const SimpleVoiceAssistantScreen: React.FC<SimpleVoiceAssistantScreenProps> = ({
  merchant,
  currentLanguage,
  creditRecords,
  settlements,
  onApproveAction,
  onRejectAction,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastRecognizedQuery, setLastRecognizedQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [lastAnswer, setLastAnswer] = useState<{
    text: string;
    spokenText: string;
    actionCard?: any;
    audioBase64?: string | null;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Translations
  const labels: Record<
    IndianLanguage,
    {
      assistantHeading: string;
      assistantSubheading: string;
      tapToSpeak: string;
      listening: string;
      stopSpeaking: string;
      suggestedQuestionsHeading: string;
      orTypeHere: string;
      askButton: string;
      sarvamNotice: string;
    }
  > = {
    en: {
      assistantHeading: 'Voice Business Assistant',
      assistantSubheading: 'Speak naturally to check your sales, pending money, or send reminders',
      tapToSpeak: 'Tap to Speak',
      listening: 'Listening... Tap to finish',
      stopSpeaking: 'Stop Audio',
      suggestedQuestionsHeading: 'Frequently Asked Questions',
      orTypeHere: 'Or type your question here...',
      askButton: 'Ask',
      sarvamNotice: 'Powered by Sarvam AI · Saaras v4 STT & Bulbul v4 TTS',
    },
    hi: {
      assistantHeading: 'बोलकर पूछें, तुरंत उत्तर पाएं',
      assistantSubheading: 'अपनी दुकान की बिक्री, अटका हुआ पैसा या खाता बही के बारे में सीधे पूछें',
      tapToSpeak: 'बोलने के लिए दबाएं',
      listening: 'सुन रहे हैं... समाप्त करने के लिए दबाएं',
      stopSpeaking: 'आवाज़ बंद करें',
      suggestedQuestionsHeading: 'अक्सर पूछे जाने वाले सवाल',
      orTypeHere: 'या यहाँ अपना सवाल लिखें...',
      askButton: 'पूछें',
      sarvamNotice: 'सर्वम एआई द्वारा संचालित · Saaras v4 STT और Bulbul v4 TTS',
    },
    ta: {
      assistantHeading: 'குரல் வணிக உதவியாளர்',
      assistantSubheading: 'விற்பனை, வர வேண்டிய பணம் மற்றும் வாடிக்கையாளர் கடன்களை எளிதாக கேளுங்கள்',
      tapToSpeak: 'பேச அழுத்தவும்',
      listening: 'கேட்கிறது... முடிக்க அழுத்தவும்',
      stopSpeaking: 'ஆடியோவை நிறுத்து',
      suggestedQuestionsHeading: 'அடிக்கடி கேட்கப்படும் கேள்விகள்',
      orTypeHere: 'அல்லது உங்கள் கேள்வியை இங்கே தட்டச்சு செய்யவும்...',
      askButton: 'கேட்க',
      sarvamNotice: 'சர்வம் AI தொழில்நுட்பம் · Saaras v4 STT & Bulbul v4 TTS',
    },
    kn: {
      assistantHeading: 'ಧ್ವನಿ ವ್ಯಾಪಾರ ಸಹಾಯಕ',
      assistantSubheading: 'ನಿಮ್ಮ ಮಾರಾಟ, ಬಾಕಿ ಹಣ ಮತ್ತು ಗ್ರಾಹಕರ ಸಾಲದ ವಿವರಗಳನ್ನು ಧ್ವನಿಯ ಮೂಲಕ ಕೇಳಿ',
      tapToSpeak: 'ಮಾತನಾಡಲು ಒತ್ತಿ',
      listening: 'ಆಲಿಸಲಾಗುತ್ತಿದೆ... ಮುಗಿಸಲು ಒತ್ತಿ',
      stopSpeaking: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ',
      suggestedQuestionsHeading: 'ಸಾಮಾನ್ಯವಾಗಿ ಕೇಳಲಾಗುವ ಪ್ರಶ್ನೆಗಳು',
      orTypeHere: 'ಅಥವಾ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...',
      askButton: 'ಕೇಳಿ',
      sarvamNotice: 'ಸರ್ವಮ್ ಎಐ ಚಾಲಿತ · Saaras v4 STT & Bulbul v4 TTS',
    },
    te: {
      assistantHeading: 'వాయిస్ వ్యాపార సహాయకుడు',
      assistantSubheading: 'మీ విక్రయాలు, పెండింగ్ బకాయిలు మరియు ఖాతా వివరాలను నోటితో అడగండి',
      tapToSpeak: 'మాట్లాడటానికి నొక్కండి',
      listening: 'వింటోంది... ముగించడానికి నొక్కండి',
      stopSpeaking: 'ఆడియో ఆపండి',
      suggestedQuestionsHeading: 'తరచుగా అడిగే ప్రశ్నలు',
      orTypeHere: 'లేదా మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...',
      askButton: 'అడగండి',
      sarvamNotice: 'సర్వం AI ఆధారితం · Saaras v4 STT & Bulbul v4 TTS',
    },
  };

  const t = labels[currentLanguage] || labels.en;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // MediaRecorder Voice Capture
  const startRecording = async () => {
    stopSpeaking();
    setAudioError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          await processRecordedAudio(audioBlob);
        }
      };

      recorder.start(250);
      setIsListening(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 25) {
            // Cap at 25 seconds for snappy STT turnaround
            stopRecording();
            return 25;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setAudioError(err.message || 'Could not access microphone. Please allow microphone permission.');
      setIsListening(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const processRecordedAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        // Step 1: Send to STT / Voice Query
        const result = await api.queryVoice({
          merchantId: merchant.id,
          language: currentLanguage,
          audioBase64: base64Audio,
        });

        if (result) {
          setLastRecognizedQuery(result.recognizedTranscript || 'Voice question');
          setLastAnswer({
            text: result.responseText,
            spokenText: result.spokenResponseText || result.responseText,
            actionCard: result.actionCard,
            audioBase64: result.audioBase64,
          });

          playSynthesizedAudio(result.spokenResponseText || result.responseText, result.audioBase64);
        }
        setIsProcessing(false);
      };
    } catch (err: any) {
      console.error('Audio processing failed:', err);
      setIsProcessing(false);
      setAudioError(err.message || 'Voice recognition failed. Please try again.');
    }
  };

  const stopSpeaking = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const playSynthesizedAudio = async (spokenText: string, audioBase64?: string | null) => {
    stopSpeaking();

    // 1. Play Sarvam Bulbul v4 Flash base64 audio
    if (audioBase64) {
      try {
        const audioUrl = audioBase64.startsWith('data:audio')
          ? audioBase64
          : `data:audio/wav;base64,${audioBase64}`;
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;

        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          fallbackSpeech(spokenText);
        };

        await audio.play();
        setIsSpeaking(true);
        return;
      } catch (err) {
        console.warn('Sarvam audio playback error:', err);
      }
    }

    // 2. Fallback to client speech synthesis
    fallbackSpeech(spokenText);
  };

  const fallbackSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const clean = text.replace(/\*\*/g, '').replace(/###/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    const langMap: Record<IndianLanguage, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      te: 'te-IN',
    };
    utterance.lang = langMap[currentLanguage] || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleProcessQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    stopSpeaking();
    setIsProcessing(true);
    setLastRecognizedQuery(queryText.trim());

    try {
      const result = await api.queryVoice({
        merchantId: merchant.id,
        query: queryText.trim(),
        language: currentLanguage,
      });

      if (result) {
        setLastAnswer({
          text: result.responseText,
          spokenText: result.spokenResponseText || result.responseText,
          actionCard: result.actionCard,
          audioBase64: result.audioBase64,
        });

        playSynthesizedAudio(result.spokenResponseText || result.responseText, result.audioBase64);
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

  // Suggested simple questions
  const suggestedQuestions: Record<IndianLanguage, string[]> = {
    en: [
      'How much money did I receive today?',
      'Show my pending settlements.',
      'Why is my settlement delayed?',
      'Which customers have outstanding dues?',
      'How is my business performing?',
    ],
    hi: [
      'आज मैंने कितना पैसा प्राप्त किया?',
      'मेरा अटका हुआ पैसा कहाँ है?',
      'सेटलमेंट में क्या गड़बड़ है?',
      'किन ग्राहकों का उधार बाकी है?',
      'मेरी दुकान की बिक्री कैसी चल रही है?',
    ],
    ta: [
      'இன்று நான் எவ்வளவு பணம் பெற்றேன்?',
      'என் வர வேண்டிய பணம் எங்கே?',
      'செட்டில்மென்ட் தாமதத்திற்கு காரணம் என்ன?',
      'யார் யாருக்கு கடன் பாக்கி உள்ளது?',
      'என் வியாபாரம் எப்படி நடக்கிறது?',
    ],
    kn: [
      'ಇಂದು ನನಗೆ ಎಷ್ಟು ಹಣ ಬಂದಿದೆ?',
      'ನನ್ನ ಬಾಕಿ ಹಣ ಎಲ್ಲಿದೆ?',
      'ಸೆಟಲ್ಮೆಂಟ್ ವಿಳಂಬಕ್ಕೆ ಕಾರಣವೇನು?',
      'ಯಾವ ಗ್ರಾಹಕರಿಗೆ ಸಾಲ ಬಾಕಿ ಇದೆ?',
      'ನನ್ನ ವ್ಯಾಪಾರ ಹೇಗಿದೆ?',
    ],
    te: [
      'ఈ రోజు నేను ఎంత డబ్బు అందుకున్నాను?',
      'నా పెండింగ్ బకాయిలు ఎక్కడ ఉన్నాయి?',
      'సెటిల్మెంట్ ఆలస్యానికి కారణం ఏమిటి?',
      'ఎవరికి అప్పు బకాయి ఉంది?',
      'నా వ్యాపారం ఎలా నడుస్తోంది?',
    ],
  };

  const currentQuestions = suggestedQuestions[currentLanguage] || suggestedQuestions.en;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6 font-sans">
      {/* 1. Friendly Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#002970] text-xs font-bold mb-3 border border-blue-100">
          <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
          <span>{t.sarvamNotice}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
          {t.assistantHeading}
        </h1>
        <p className="mt-1.5 text-sm sm:text-base text-slate-600">
          {t.assistantSubheading}
        </p>

        {audioError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs max-w-md mx-auto text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{audioError}</span>
          </div>
        )}

        {/* 2. Large Central Microphone Button */}
        <div className="mt-8 flex flex-col items-center justify-center">
          <button
            onClick={toggleListening}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 cursor-pointer ${
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
                <span>{t.listening} ({recordingSeconds}s)</span>
              </div>
            ) : isProcessing ? (
              <div className="text-sm font-semibold text-[#002970] flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#00BAF2] border-t-transparent rounded-full animate-spin" />
                <span>Sarvam AI is analyzing shop records...</span>
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
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>You asked:</span>
              <span className="text-[10px] text-sky-700 font-mono uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                Sarvam Saaras v4
              </span>
            </div>
            <div className="text-base font-bold text-[#172B4D] mt-1">
              &ldquo;{lastRecognizedQuery}&rdquo;
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
                <span className="text-[10px] bg-white border border-blue-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                  Verified Math
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    } else {
                      playSynthesizedAudio(lastAnswer.spokenText, lastAnswer.audioBase64);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#002970] text-white hover:bg-[#001f55] text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#00BAF2]" />}
                  <span>{isSpeaking ? 'Stop Audio' : 'Replay Voice'}</span>
                </button>
              </div>
            </div>

            <div className="mt-3.5 text-base sm:text-lg font-bold text-[#172B4D] leading-relaxed whitespace-pre-line">
              {lastAnswer.text}
            </div>

            {/* Action Confirmation Card: Explicit On-Screen Approval */}
            {lastAnswer.actionCard && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs">
                <div className="font-bold text-sm text-amber-900 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>On-Screen Confirmation Needed: {lastAnswer.actionCard.title}</span>
                </div>
                <p className="text-slate-700 mt-1">{lastAnswer.actionCard.description}</p>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      onRejectAction(lastAnswer.actionCard.id);
                      setLastAnswer((prev) => prev ? { ...prev, actionCard: undefined } : null);
                    }}
                    className="px-3.5 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await onApproveAction(lastAnswer.actionCard.id);
                      setLastAnswer((prev) => prev ? {
                        ...prev,
                        actionCard: { ...prev.actionCard, status: 'EXECUTED' }
                      } : null);
                    }}
                    disabled={lastAnswer.actionCard.status === 'EXECUTED'}
                    className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      lastAnswer.actionCard.status === 'EXECUTED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#002970] text-white hover:bg-[#001f55]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00BAF2]" />
                    <span>{lastAnswer.actionCard.status === 'EXECUTED' ? 'Executed & Logged' : 'Confirm & Execute'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fallback Typed Input */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessQuery(inputText);
            }}
            className="flex items-center gap-2 max-w-xl mx-auto"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.orTypeHere}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-[#00BAF2] focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={isProcessing || !inputText.trim()}
              className="px-5 py-2.5 bg-[#00BAF2] hover:bg-[#0099cc] text-white font-semibold rounded-xl text-sm transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {t.askButton}
            </button>
          </form>
        </div>
      </div>

      {/* 5. Suggested Questions Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold text-[#172B4D] mb-3 flex items-center gap-2">
          <span>{t.suggestedQuestionsHeading}</span>
          <span className="text-xs font-normal text-slate-500">
            (Tap any question to ask)
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {currentQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleProcessQuery(q)}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50/70 hover:border-blue-200 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#002970]">
                {q}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#002970] group-hover:translate-x-0.5 transition" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
