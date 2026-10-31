import React, { useState, useEffect, useRef } from 'react';
import { IndianLanguage, AgentChatMessage, MerchantAction, MerchantProfile } from '../types/index.ts';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Languages,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Play,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building,
  HelpCircle,
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
  const [selectedLanguage, setSelectedLanguage] = useState<IndianLanguage>(merchant.primaryLanguage || 'hi');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);

  // Merchant Voice Authentication State (PIN: 1947)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  // Chat message history
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize welcoming message on language or merchant change
  useEffect(() => {
    const greetings: Record<IndianLanguage, string> = {
      hi: `नमस्ते ${merchant.ownerName} जी! मैं आपका पेटीएम बिजनेस वॉइस असिस्टेंट हूँ। आप मुझसे आज की बिक्री, साउंडबॉक्स पेमेंट, सेटलमेंट स्टेटस, उधारी खाता, या बिजनेस बढ़ाने के बारे में पूछ सकते हैं।`,
      ta: `வணக்கம் ${merchant.ownerName}, நான் உங்கள் வணிக வாய்ஸ் அசிஸ்டன்ட். இன்றைய வசூல், சவுண்ட்பாக்ஸ், செட்டில்மென்ட், அல்லது கடன் பாக்கி பற்றி என்னிடம் கேட்கலாம்.`,
      kn: `ನಮಸ್ಕಾರ ${merchant.ownerName} ಅವರೇ! ನಾನು ನಿಮ್ಮ ಪೇಟಿಎಂ ಬಿಸಿನೆಸ್ ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್. ಇಂದಿನ ಕಲೆಕ್ಷನ್, ಸೌಂಡ್‌ಬಾಕ್ಸ್, ಸೆಟಲ್ಮೆಂಟ್ ಅಥವಾ ಖಾತಾ ಬಾಕಿ ಬಗ್ಗೆ ಕೇಳಿ.`,
      te: `నమస్కారం ${merchant.ownerName} గారు! నేను మీ పేటీఎం బిజినెస్ వాయిస్ అసిస్టెంట్. ఈ రోజు వసూళ్లు, సౌండ్‌బాక్స్, సెటిల్మెంట్ లేదా ఖాతా బాకీల గురించి నన్ను అడగండి.`,
      en: `Hello ${merchant.ownerName}! I am your Paytm Merchant Intelligence voice business companion. Ask me anything about collections, Soundbox audio payments, settlement reconciliations, or Khata credit.`,
    };

    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        content: greetings[selectedLanguage] || greetings.hi,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        thoughtTrace: {
          agentName: 'Merchant Orchestrator',
          intentIdentified: 'VOICE_SESSION_INITIALIZED',
          deterministicVerification: `Strict Tenant Isolation Active: MID ${merchant.mid}`,
        },
      },
    ]);
  }, [selectedLanguage, merchant]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle initial prompt if opened via shortcut
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendQuery(initialPrompt, false);
    }
  }, [initialPrompt, isOpen]);

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
      recognition.lang = langMap[selectedLanguage] || 'hi-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
        if (event.results[0].isFinal) {
          setIsListening(false);
          handleSendQuery(transcript, true);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition event:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [selectedLanguage]);

  // Toggle listening
  const toggleListening = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please type your question.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputText('');
      recognitionRef.current?.start();
    }
  };

  // Text-to-speech audio player
  const speakText = (text: string, lang: IndianLanguage) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Clean markdown asterisks for spoken voice
    const cleanSpeech = text.replace(/\*\*/g, '').replace(/###/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    const langMap: Record<IndianLanguage, string> = {
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      te: 'te-IN',
      en: 'en-IN',
    };
    utterance.lang = langMap[lang] || 'hi-IN';
    utterance.rate = speechSpeed;
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

  // Authenticate PIN
  const handleVerifyPin = (pin: string) => {
    if (pin === '1947') {
      setIsAuthenticated(true);
      setShowPinModal(false);
      setPinInput('');

      // Add system message
      const authMsg: AgentChatMessage = {
        id: `auth-${Date.now()}`,
        sender: 'assistant',
        content:
          selectedLanguage === 'hi'
            ? `✓ वॉइस पिन सत्यापित! ${merchant.ownerName} जी की पहचान की पुष्टि हो गई है। अब आप संवेदनशील वित्तीय कार्य अधिकृत कर सकते हैं।`
            : `✓ Voice PIN Verified! Identity confirmed for ${merchant.ownerName}. You can now view sensitive banking details and authorize financial actions.`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, authMsg]);
    } else {
      alert('Invalid Voice PIN. Default PIN for testing is 1947.');
    }
  };

  // Send query to Agentic AI system
  const handleSendQuery = async (queryText: string, fromVoice = false) => {
    if (!queryText.trim()) return;

    // Check if user is typing PIN directly
    if (queryText.trim() === '1947') {
      handleVerifyPin('1947');
      setInputText('');
      return;
    }

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
      const response = await fetch('/api/voice/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant.id,
          query: queryText.trim(),
          language: selectedLanguage,
          voicePin: isAuthenticated ? '1947' : undefined,
          isAuthenticated,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const result = data.data;

        // If sensitive and requires authentication
        if (result.requiresAuthentication && !isAuthenticated) {
          setShowPinModal(true);
        }

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

        // Auto-speak response if enabled
        if (autoSpeak && result.spokenResponseText) {
          speakText(result.spokenResponseText, result.language);
        }
      } else {
        throw new Error(data.error || 'Agent execution failed');
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
    hi: [
      { label: '📊 आज की बिक्री', prompt: 'आज की कुल बिक्री और साउंडबॉक्स कलेक्शन कितना रहा?' },
      { label: '⚠️ सेटलमेंट विसंगति', prompt: '27 अक्टूबर के सेटलमेंट में क्या गड़बड़ हुई है? जांच करो' },
      { label: '📅 कल का कैश फ्लो', prompt: 'कल की अनुमानित बिक्री और ₹350 लोन EMI कटने के बाद क्या बचेगा?' },
      { label: '📖 उधारी (खाता)', prompt: 'खाता बही में किस ग्राहक का बकाया बाकी है? रिमाइंडर तैयार करो' },
      { label: '🚀 त्योहार ऑफर', prompt: 'आने वाले त्योहार के लिए 5% कैशबैक प्रोमो कैंपेन तैयार करो' },
      { label: '🎙️ बिजनेस ब्रीफिंग', prompt: 'मेरा आज का बिजनेस ब्रीफिंग सुनाओ' },
    ],
    ta: [
      { label: '📊 இன்றைய வசூல்', prompt: 'இன்றைய மொத்த வசூல் மற்றும் சவுண்ட்பாக்ஸ் விவரம் என்ன?' },
      { label: '⚠️ செட்டில்மென்ட்', prompt: 'செட்டில்மென்ட் தொகையில் உள்ள வித்தியாசத்தை விசாரி' },
      { label: '📅 ரொக்க வரவு', prompt: 'நாளை வரவு மற்றும் லோன் EMI கழிவு எவ்வளவு?' },
      { label: '📖 கடன் பாக்கி', prompt: 'கடன் பாக்கி வைத்துள்ள வாடிக்கையாளர்களுக்கு நினைவூட்டல் அனுப்பு' },
      { label: '🚀 வியாபார வளர்ச்சி', prompt: 'வியாபாரத்தை உயர்த்த என்ன புதிய ஆஃபர் தொடங்கலாம்?' },
    ],
    kn: [
      { label: '📊 ಇಂದಿನ ಸಂಗ್ರಹ', prompt: 'ಇಂದಿನ ಒಟ್ಟು ಕಲೆಕ್ಷನ್ ಮತ್ತು ಸೌಂಡ್‌ಬಾಕ್ಸ್ ಮೊತ್ತ ಎಷ್ಟು?' },
      { label: '⚠️ ಸೆಟಲ್ಮೆಂಟ್', prompt: 'ಸೆಟಲ್ಮೆಂಟ್ ವ್ಯತ್ಯಾಸವನ್ನು ತನಿಖೆ ಮಾಡಿ' },
      { label: '📅 ಕ್ಯಾಶ್ ಫ್ಲೋ', prompt: 'ನಾಳೆಯ ಅಂದಾಜು ಕಲೆಕ್ಷನ್ ಮತ್ತು ಸಾಲದ ಇಎಂಐ ವಿವರ ತಿಳಿಸಿ' },
      { label: '📖 ಖಾತಾ ಬಾಕಿ', prompt: 'ಖಾತಾ ಬಾಕಿ ಇರುವವರಿಗೆ ಪಾವತಿ ಜ್ಞಾಪನೆ ಸಿದ್ಧಪಡಿಸಿ' },
      { label: '🚀 ಬೆಳವಣಿಗೆ ಆಫರ್', prompt: 'ಹಬ್ಬದ ಸೀಸನ್‌ಗಾಗಿ ವಿಶೇಷ ಪ್ರಚಾರ ಅಭಿಯಾನ ಆರಂಭಿಸಿ' },
    ],
    te: [
      { label: '📊 నేటి వసూళ్లు', prompt: 'ఈ రోజు మొత్తం వసూళ్లు మరియు సౌండ్‌బాక్స్ కలెక్షన్ ఎంత?' },
      { label: '⚠️ సెటిల్మెంట్', prompt: 'సెటిల్మెంట్ వ్యత్యాసం పై విచారణ ప్రారంభించు' },
      { label: '📅 నగదు ప్రవాహం', prompt: 'రేపటి అంచనా వసూలు మరియు లోన్ ఈఎంఐ ఎంత?' },
      { label: '📖 ఖాతా బాకీ', prompt: 'ఖాతా పుస్తకంలో బాకీ ఉన్నవారికి రిమైండర్ పంపు' },
      { label: '🚀 బిజినెస్ గ్రోత్', prompt: 'వ్యాపార పెరుగుదల కోసం పండుగ ఆఫర్ రూపొందించు' },
    ],
    en: [
      { label: '📊 Collections', prompt: "What are today's total collections and Soundbox audio payments?" },
      { label: '⚠️ Settlement Check', prompt: 'Investigate the settlement discrepancy on the Oct 27 batch.' },
      { label: '📅 Cash Flow Forecast', prompt: "Forecast tomorrow's collections after daily loan EMI deduction." },
      { label: '📖 Khata Due Book', prompt: 'Who has overdue store credit in Khata? Draft a payment reminder.' },
      { label: '🚀 Growth Campaign', prompt: 'Prepare a 5% festive cashback campaign draft for my approval.' },
      { label: '🎙️ Daily Briefing', prompt: 'Give me my daily business briefing summary.' },
    ],
  };

  const activePrompts = capabilityPrompts[selectedLanguage] || capabilityPrompts.hi;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-white border-l border-slate-200 shadow-2xl flex flex-col font-sans">
      {/* Drawer Top Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#002970] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Multilingual Voice Business Assistant</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Sarvam AI & Multi-Agent Intelligence · {merchant.businessName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice PIN Authentication Indicator */}
          <button
            onClick={() => setShowPinModal(true)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
              isAuthenticated
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
            title="Merchant Voice Security Token"
          >
            {isAuthenticated ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-600" />}
            <span>{isAuthenticated ? 'PIN Verified' : 'Voice PIN'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Language & Voice Settings Toolbar */}
      <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between gap-2 text-xs">
        {/* Language Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { code: 'hi', label: 'हिन्दी' },
            { code: 'en', label: 'English' },
            { code: 'ta', label: 'தமிழ்' },
            { code: 'kn', label: 'ಕನ್ನಡ' },
            { code: 'te', label: 'తెలుగు' },
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => setSelectedLanguage(l.code as IndianLanguage)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                selectedLanguage === l.code
                  ? 'bg-[#002970] text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Voice Toggles */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`p-1 rounded text-[11px] flex items-center gap-1 font-medium ${
              autoSpeak ? 'text-[#002970] bg-blue-50' : 'text-slate-400'
            }`}
            title="Auto-speak incoming assistant responses"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto-Speak</span>
          </button>

          <select
            value={speechSpeed}
            onChange={(e) => setSpeechSpeed(Number(e.target.value))}
            className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600"
            title="Speech Playback Speed"
          >
            <option value="0.9">0.9x</option>
            <option value="1.0">1.0x</option>
            <option value="1.15">1.15x</option>
          </select>
        </div>
      </div>

      {/* Speaking Indicator Bar */}
      {isSpeaking && (
        <div className="px-4 py-2 bg-[#002970] text-white flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 animate-bounce text-cyan-300" />
            <span className="font-semibold text-cyan-100">
              Speaking in {selectedLanguage.toUpperCase()} voice...
            </span>
          </div>
          <button
            onClick={stopSpeaking}
            className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[11px] font-semibold"
          >
            Stop Audio
          </button>
        </div>
      )}

      {/* Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender Metadata */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1 px-1">
              {msg.sender === 'user' ? (
                <>
                  <span className="font-medium text-slate-700">{merchant.ownerName}</span>
                  {msg.isVoiceInput && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-medium">
                      Voice Input
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-[#002970]" />
                  <span className="font-semibold text-slate-800">
                    {msg.thoughtTrace?.agentName || 'Paytm Assistant'}
                  </span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span className="font-mono text-[10px] text-slate-600">{msg.timestamp}</span>
            </div>

            {/* Bubble Content */}
            <div
              className={`max-w-[92%] rounded-lg p-3.5 leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#002970] text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200/90 text-slate-900'
              }`}
            >
              <div className="whitespace-pre-line text-xs font-normal">{msg.content}</div>

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
                    onClick={() => speakText(msg.content, msg.language || selectedLanguage)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#002970] font-semibold hover:underline"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Replay Audio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Action Approval Card rendered directly inside conversation */}
            {msg.actionCard && (
              <div className="mt-2.5 max-w-[92%] w-full bg-amber-50 border border-amber-300 rounded-lg p-3.5 text-xs text-amber-950 shadow-sm">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                  <span className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Explicit Merchant Authorization Required</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    {msg.actionCard.status}
                  </span>
                </div>

                <div className="mt-2 font-bold text-slate-900">{msg.actionCard.title}</div>
                <p className="mt-1 text-[11px] text-slate-700">{msg.actionCard.description}</p>

                <div className="mt-3 pt-2 border-t border-amber-200/80 flex items-center justify-end gap-2">
                  <button
                    onClick={() => onRejectAction(msg.actionCard!.id)}
                    className="px-3 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        setShowPinModal(true);
                        return;
                      }
                      onApproveAction(msg.actionCard!.id);
                    }}
                    className="px-3.5 py-1 text-[11px] font-bold bg-[#002970] text-white rounded hover:bg-[#001f52] shadow-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Authorize & Execute Action</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-slate-600 text-xs py-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
            <div className="w-2.5 h-2.5 rounded-full bg-[#002970] animate-ping" />
            <span>Agent Orchestrator is verifying data and synthesizing Indian speech...</span>
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
            className="whitespace-nowrap px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 hover:text-slate-900 hover:border-[#002970] transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Voice Input & Audio Visualizer Control Bar */}
      <div className="p-4 bg-white border-t border-slate-200">
        {/* Dynamic 16-Bar Audio Equalizer Visualizer */}
        {isListening && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs font-bold text-red-900">
                Listening in {selectedLanguage.toUpperCase()}... Speak naturally
              </span>
            </div>

            {/* Simulated live audio frequency wave bars */}
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
          {/* Push-to-Talk Mic Button */}
          <button
            onClick={toggleListening}
            className={`p-3 rounded-lg transition-all ${
              isListening
                ? 'bg-red-600 text-white shadow-lg animate-pulse'
                : 'bg-blue-50 text-[#002970] hover:bg-blue-100 border border-blue-200'
            }`}
            title="Push to speak in Indian languages"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
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
                : 'Ask anything or speak (e.g., today collections, settlements)...'
            }
            className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendQuery(inputText, false)}
            disabled={!inputText.trim() || isProcessing}
            className="p-2.5 bg-[#002970] text-white rounded-lg hover:bg-[#001f52] disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice Security PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#002970]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Merchant Voice PIN Authentication
                </h3>
              </div>
              <button onClick={() => setShowPinModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-3 text-slate-600 leading-relaxed">
              To protect sensitive financial records and authorize actions for{' '}
              <strong className="text-slate-900">{merchant.ownerName}</strong>, please enter or speak your 4-digit Voice PIN.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  4-Digit Security PIN (Default Demo: 1947)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="1947"
                  className="w-full text-center tracking-widest text-lg font-mono font-bold py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002970]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyPin(pinInput)}
                  className="px-4 py-1.5 bg-[#002970] text-white font-semibold rounded-md hover:bg-[#001f52]"
                >
                  Verify Identity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
