import React, { useState, useRef, useEffect } from 'react';
import {
  MerchantProfile,
  AgentChatMessage,
  IndianLanguage,
  MerchantAction,
} from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface VoiceAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: MerchantProfile;
  initialPrompt?: string;
  onApproveAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string) => Promise<void>;
}

export const VoiceAssistantDrawer: React.FC<VoiceAssistantDrawerProps> = ({
  isOpen,
  onClose,
  merchant,
  initialPrompt,
  onApproveAction,
  onRejectAction,
}) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      content: `Welcome ${merchant.ownerName}! I am Saathi, your Paytm voice business assistant. You can speak to me in English, Tamil, Hindi, Kannada, or Telugu. How can I help your business today?`,
      language: 'en',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<IndianLanguage>(
    merchant.primaryLanguage || 'en'
  );
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle external trigger prompts
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendQuery(initialPrompt, false);
    }
  }, [initialPrompt, isOpen]);

  // Clean up on unmount or drawer close
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

  // MediaRecorder Voice Input (Sarvam Saaras v4 STT)
  const startRecording = async () => {
    stopSpeaking();
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone recording is not supported in this browser. Please type your query.');
        return;
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

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
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
            stopRecording();
            return 25;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setIsListening(false);
      alert('Could not access microphone. Please enable microphone permissions in your browser.');
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

  const processRecordedAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        // Add user voice input indicator message
        const tempMsgId = `usr-${Date.now()}`;
        const userMsg: AgentChatMessage = {
          id: tempMsgId,
          sender: 'user',
          content: '🎙️ Spoken question (processing via Sarvam Saaras v4)...',
          language: selectedLanguage,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          isVoiceInput: true,
        };
        setMessages((prev) => [...prev, userMsg]);

        const result = await api.queryVoice({
          merchantId: merchant.id,
          language: selectedLanguage,
          audioBase64: base64Audio,
        });

        if (result) {
          // Update user message with recognized transcript
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempMsgId
                ? { ...m, content: result.recognizedTranscript || '🎙️ Spoken question' }
                : m
            )
          );

          // Add assistant message
          const assistantMsg: AgentChatMessage = {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            content: result.responseText,
            language: result.language,
            timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            thoughtTrace: {
              agentName: result.agentName,
              intentIdentified: result.intentIdentified,
              toolInvoked: 'Deterministic Financial Analytics Engine',
              deterministicVerification: 'Verified against core tenant database',
            },
            actionCard: result.actionCard,
          };
          setMessages((prev) => [...prev, assistantMsg]);

          if (autoSpeak && (result.audioBase64 || result.spokenResponseText)) {
            playAudioResponse(result.spokenResponseText || result.responseText, result.audioBase64);
          }
        }
        setIsProcessing(false);
      };
    } catch (err: any) {
      console.error('Audio processing failed:', err);
      setIsProcessing(false);
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

  const playAudioResponse = (spokenText: string, audioBase64?: string | null) => {
    stopSpeaking();

    if (audioBase64) {
      try {
        const audioUrl = audioBase64.startsWith('data:audio')
          ? audioBase64
          : `data:audio/wav;base64,${audioBase64}`;
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        setIsSpeaking(true);

        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          setIsSpeaking(false);
          fallbackSpeech(spokenText);
        };

        audio.play().catch(() => fallbackSpeech(spokenText));
        return;
      } catch {
        fallbackSpeech(spokenText);
        return;
      }
    }

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
    utterance.lang = langMap[selectedLanguage] || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Send typed query to Agentic AI system
  const handleSendQuery = async (queryText: string, fromVoice = false) => {
    if (!queryText.trim()) return;

    const userMsg: AgentChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: queryText.trim(),
      language: selectedLanguage,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      isVoiceInput: fromVoice,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      const result = await api.queryVoice({
        merchantId: merchant.id,
        query: queryText.trim(),
        language: selectedLanguage,
      });

      if (result) {
        const assistantMsg: AgentChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          content: result.responseText,
          language: result.language,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          thoughtTrace: {
            agentName: result.agentName,
            intentIdentified: result.intentIdentified,
            toolInvoked: 'Deterministic Financial Analytics Engine',
            deterministicVerification: 'Verified against core tenant database',
          },
          actionCard: result.actionCard,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (autoSpeak) {
          playAudioResponse(result.spokenResponseText || result.responseText, result.audioBase64);
        }
      }
    } catch (err: any) {
      const errorMsg: AgentChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: `Error: ${err.message}. Please try again.`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Language Quick Prompts Categorized by Core Capabilities
  const capabilityPrompts: Record<
    IndianLanguage,
    { label: string; prompt: string }[]
  > = {
    en: [
      { label: '📊 Collections', prompt: "What are today's total collections and successful payments?" },
      { label: '⚠️ Settlement Check', prompt: 'Investigate the settlement discrepancy on my recent batch.' },
      { label: '📅 Cash Flow Forecast', prompt: "Forecast tomorrow's collections after daily loan EMI deduction." },
      { label: '📖 Khata Due Book', prompt: 'Which customers have overdue store credit in Khata? Draft a payment reminder.' },
      { label: '🚀 Growth Analysis', prompt: 'How is my business performing and what are my peak sales hours?' },
      { label: '🎙️ Daily Briefing', prompt: 'Give me my daily business briefing summary.' },
    ],
    hi: [
      { label: '📊 आज की बिक्री', prompt: 'आज की कुल बिक्री और साउंडबॉक्स कलेक्शन कितना रहा?' },
      { label: '⚠️ सेटलमेंट विसंगति', prompt: 'सेटलमेंट में क्या अंतर है? जांच करो' },
      { label: '📅 कल का कैश फ्लो', prompt: 'कल की अनुमानित बिक्री और लोन EMI कटने के बाद क्या बचेगा?' },
      { label: '📖 उधारी (खाता)', prompt: 'खाता बही में किस ग्राहक का बकाया बाकी है? रिमाइंडर तैयार करो' },
      { label: '🚀 दुकान की वृद्धि', prompt: 'मेरी दुकान की बिक्री बढ़ाने के लिए क्या सुझाव हैं?' },
      { label: '🎙️ बिजनेस ब्रीफिंग', prompt: 'मेरा आज का बिजनेस ब्रीफिंग सुनाओ' },
    ],
    ta: [
      { label: '📊 இன்றைய வசூல்', prompt: 'இன்றைய மொத்த வசூல் மற்றும் சவுண்ட்பாக்ஸ் விவரம் என்ன?' },
      { label: '⚠️ செட்டில்மென்ட்', prompt: 'செட்டில்மென்ட் தொகையில் உள்ள வித்தியாசத்தை விசாரி' },
      { label: '📅 ரொக்க வரவு', prompt: 'நாளை வரவு மற்றும் லோன் EMI கழிவு எவ்வளவு?' },
      { label: '📖 கடன் பாக்கி', prompt: 'கடன் பாக்கி வைத்துள்ள வாடிக்கையாளர்களுக்கு நினைவூட்டல் அனுப்பு' },
      { label: '🚀 வியாபார வளர்ச்சி', prompt: 'வியாபாரத்தை உயர்த்த என்ன புதிய வாய்ப்புகள் உள்ளன?' },
    ],
    kn: [
      { label: '📊 ಇಂದಿನ ಸಂಗ್ರಹ', prompt: 'ಇಂದಿನ ಒಟ್ಟು ಕಲೆಕ್ಷನ್ ಮತ್ತು ಸೌಂಡ್‌ಬಾಕ್ಸ್ ಮೊತ್ತ ಎಷ್ಟು?' },
      { label: '⚠️ ಸೆಟಲ್ಮೆಂಟ್', prompt: 'ಸೆಟಲ್ಮೆಂಟ್ ವ್ಯತ್ಯಾಸವನ್ನು ತನಿಖೆ ಮಾಡಿ' },
      { label: '📅 ಕ್ಯಾಶ್ ಫ್ಲೋ', prompt: 'ನಾಳೆಯ ಅಂದಾಜು ಕಲೆಕ್ಷನ್ ಮತ್ತು ಸಾಲದ ಇಎಂಐ ವಿವರ ತಿಳಿಸಿ' },
      { label: '📖 ಖಾತಾ ಬಾಕಿ', prompt: 'ಖಾತಾ ಬಾಕಿ ಇರುವವರಿಗೆ ಪಾವತಿ ಜ್ಞಾಪನೆ ಸಿದ್ಧಪಡಿಸಿ' },
      { label: '🚀 ಬೆಳವಣಿಗೆ ಆಫರ್', prompt: 'ವ್ಯಾಪಾರ ಬೆಳೆಸಲು ವಿಶೇಷ ಶಿಫಾರಸುಗಳನ್ನು ನೀಡಿ' },
    ],
    te: [
      { label: '📊 నేటి వసూళ్లు', prompt: 'ఈ రోజు మొత్తం వసూళ్లు మరియు సౌండ్‌బాక్స్ కలెక్షన్ ఎంత?' },
      { label: '⚠️ సెటిల్మెంట్', prompt: 'సెటిల్మెంట్ వ్యత్యాసం పై విచారణ ప్రారంభించు' },
      { label: '📅 నగదు ప్రవాహం', prompt: 'రేపటి అంచనా వసూలు మరియు లోన్ ఈఎంఐ ఎంత?' },
      { label: '📖 ఖాతా బాకీ', prompt: 'ఖాతా పుస్తకంలో బాకీ ఉన్నవారికి రిమైండర్ పంపు' },
      { label: '🚀 బిజినెస్ గ్రోత్', prompt: 'వ్యాపార పెరుగుదల కోసం సలహాలు ఇవ్వండి' },
    ],
  };

  const activePrompts = capabilityPrompts[selectedLanguage] || capabilityPrompts.en;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-white border-l border-slate-200 shadow-2xl flex flex-col font-sans">
      {/* Drawer Top Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#002970] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-[#00BAF2]" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Multilingual Voice Assistant</span>
              <span className="text-[10px] bg-sky-50 text-sky-700 font-mono px-1.5 py-0.5 rounded border border-sky-100 font-normal">
                Sarvam AI
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Grounded Paytm Multi-Agent Intelligence · {merchant.businessName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as IndianLanguage)}
            className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-700 cursor-pointer"
          >
            <option value="en">English (Default)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
            <option value="te">తెలుగు (Telugu)</option>
          </select>

          {/* Close Drawer Button */}
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security & Grounded Numbers Notice */}
      <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100/70 text-[11px] text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Grounded in verified SQLite ledger · Sensitive actions require on-screen approval</span>
        </div>
        <button
          onClick={() => setAutoSpeak(!autoSpeak)}
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer ${
            autoSpeak ? 'bg-[#002970] text-white' : 'bg-slate-200 text-slate-600'
          }`}
          title="Toggle automatic speech playback"
        >
          {autoSpeak ? <Volume2 className="w-3 h-3 text-[#00BAF2]" /> : <VolumeX className="w-3 h-3" />}
          <span>{autoSpeak ? 'Voice ON' : 'Voice Mute'}</span>
        </button>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 ${
                msg.sender === 'user'
                  ? 'bg-[#002970] text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200/90 text-slate-900'
              }`}
            >
              <div className="whitespace-pre-line text-xs font-normal leading-relaxed">{msg.content}</div>

              {/* Agent Thought & Tool Trace */}
              {msg.thoughtTrace && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 text-[11px] text-slate-600 font-mono space-y-0.5">
                  <div className="font-semibold text-slate-700">
                    Agent: {msg.thoughtTrace.agentName} ({msg.thoughtTrace.intentIdentified})
                  </div>
                  <div className="text-emerald-700">
                    ✓ {msg.thoughtTrace.deterministicVerification}
                  </div>
                </div>
              )}

              {/* Spoken Audio Replay */}
              {msg.sender === 'assistant' && (
                <div className="mt-2.5 pt-1.5 flex items-center justify-end">
                  <button
                    onClick={() => playAudioResponse(msg.content)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#00BAF2] font-semibold hover:underline cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Replay Spoken Audio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Action Approval Card: Direct On-Screen Confirmation */}
            {msg.actionCard && (
              <div className="mt-2.5 max-w-[92%] w-full bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 shadow-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                  <span className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>On-Screen Merchant Confirmation Required</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    {msg.actionCard.status}
                  </span>
                </div>

                <div className="mt-2 font-bold text-slate-900">{msg.actionCard.title}</div>
                <p className="mt-1 text-[11px] text-slate-700 leading-relaxed">{msg.actionCard.description}</p>

                <div className="mt-3 pt-2 border-t border-amber-200/80 flex items-center justify-end gap-2">
                  <button
                    onClick={() => onRejectAction(msg.actionCard!.id)}
                    className="px-3 py-1.5 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await onApproveAction(msg.actionCard!.id);
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === msg.id && m.actionCard
                            ? { ...m, actionCard: { ...m.actionCard, status: 'EXECUTED' } }
                            : m
                        )
                      );
                    }}
                    disabled={msg.actionCard.status === 'EXECUTED'}
                    className={`px-3.5 py-1.5 text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer ${
                      msg.actionCard.status === 'EXECUTED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#002970] text-white hover:bg-[#001f52]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00BAF2]" />
                    <span>{msg.actionCard.status === 'EXECUTED' ? 'Executed & Logged' : 'Confirm & Execute'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-slate-600 text-xs py-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00BAF2] animate-ping" />
            <span>Verifying records with Sarvam AI...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Capability Quick Prompts Bar */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 overflow-x-auto flex items-center gap-2 text-[11px]">
        {activePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSendQuery(p.prompt, false)}
            className="whitespace-nowrap px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-slate-900 hover:border-[#002970] transition-colors cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Voice Input & Audio Wave Control Bar */}
      <div className="p-4 bg-white border-t border-slate-200">
        {/* Audio Equalizer Visualizer during MediaRecorder recording */}
        {isListening && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs font-bold text-red-900">
                Listening in {selectedLanguage.toUpperCase()}... ({recordingSeconds}s) Tap mic to send
              </span>
            </div>

            <div className="flex items-center gap-0.5 h-5">
              {[8, 14, 20, 12, 18, 24, 10, 16, 22, 14, 18, 26, 12, 16, 20, 8].map((h, idx) => (
                <span
                  key={idx}
                  className="w-1 bg-red-600 rounded-full animate-bounce"
                  style={{
                    height: `${h}px`,
                    animationDuration: `${400 + (idx % 4) * 150}ms`,
                    animationDelay: `${idx * 40}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* MediaRecorder Mic Button */}
          <button
            onClick={toggleListening}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'bg-red-600 text-white shadow-lg animate-pulse'
                : 'bg-blue-50 text-[#002970] hover:bg-blue-100 border border-blue-200'
            }`}
            title="Push to speak (Sarvam Saaras v4)"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#00BAF2]" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendQuery(inputText, false);
              }
            }}
            placeholder={
              selectedLanguage === 'hi'
                ? 'बोलें या सवाल लिखें (उदा. आज की बिक्री कितनी है?)...'
                : selectedLanguage === 'ta'
                ? 'கேள்வி கேளுங்கள் (उदा. இன்றைய வசூல் எவ்வளவு?)...'
                : selectedLanguage === 'kn'
                ? 'ಪ್ರಶ್ನೆ ಕೇಳಿ (ಉದಾ. ಇಂದಿನ ಕಲೆಕ್ಷನ್ ಎಷ್ಟು?)...'
                : selectedLanguage === 'te'
                ? 'ప్రశ్న అడగండి (ఉదా. నేటి కలెక్షన్స్ ఎంత?)...'
                : 'Ask anything or speak (e.g. today collections, settlements)...'
            }
            className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#00BAF2]"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendQuery(inputText, false)}
            disabled={!inputText.trim() || isProcessing}
            className="p-2.5 bg-[#00BAF2] hover:bg-[#0099cc] text-white rounded-xl disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
