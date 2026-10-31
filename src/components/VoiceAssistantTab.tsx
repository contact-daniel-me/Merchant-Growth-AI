import React, { useState, useEffect, useRef } from 'react';
import { IndianLanguage, AgentChatMessage, MerchantAction, MerchantProfile } from '../types/index.ts';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Languages,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Play,
  ArrowRight,
  CreditCard,
  Building,
  TrendingUp,
  FileText,
  Calendar,
  Radio,
} from 'lucide-react';

interface VoiceAssistantTabProps {
  merchant: MerchantProfile;
  onApproveAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string) => Promise<void>;
  onNavigateTab: (tab: string) => void;
}

export const VoiceAssistantTab: React.FC<VoiceAssistantTabProps> = ({
  merchant,
  onApproveAction,
  onRejectAction,
  onNavigateTab,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<IndianLanguage>(merchant.primaryLanguage || 'hi');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);

  // Authentication PIN state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome-tab-msg',
      sender: 'assistant',
      content:
        selectedLanguage === 'hi'
          ? `नमस्ते ${merchant.ownerName} जी! मैं आपका पेटीएम वॉइस बिजनेस कम्पेनियन हूँ।\n\nआप मुझसे बिना कोई मेनू खोजे सीधे बात कर सकते हैं:\n• "आज की कुल बिक्री और साउंडबॉक्स कलेक्शन बताओ"\n• "27 अक्टूबर के सेटलमेंट में क्या गड़बड़ है? जांच करो"\n• "कल का कैश फ्लो और लोन ईएमआई कटने के बाद क्या बचेगा?"\n• "खाता बही में रमेश कुमार को उधारी का रिमाइंडर भेजो"\n• "त्योहार के लिए 5% कैशबैक ऑफर तैयार करो"`
          : `Hello ${merchant.ownerName}! I am your Paytm Multilingual AI Business Assistant.\n\nYou can ask me naturally without navigating complex menus:\n• "What are today's collections and Soundbox audio payments?"\n• "Investigate the settlement discrepancy on the Oct 27 batch"\n• "What is my cash-flow forecast after tomorrow's loan EMI deduction?"\n• "Who has overdue store credit in Khata? Draft a reminder"\n• "Prepare a festive 5% cashback promotional campaign"`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      thoughtTrace: {
        agentName: 'Merchant Orchestrator',
        intentIdentified: 'VOICE_COMPANION_READY',
        deterministicVerification: `Grounded in tenant ledger for ${merchant.businessName} (MID: ${merchant.mid})`,
      },
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Speech Recognition setup
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

      recognition.onstart = () => setIsListening(true);
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
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, [selectedLanguage]);

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please use text input.');
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

  const speakText = (text: string, lang: IndianLanguage) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

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

  const handleVerifyPin = (pin: string) => {
    if (pin === '1947') {
      setIsAuthenticated(true);
      setShowPinModal(false);
      setPinInput('');
      const authMsg: AgentChatMessage = {
        id: `auth-${Date.now()}`,
        sender: 'assistant',
        content: `✓ Identity Confirmed: ${merchant.ownerName} authenticated via Voice Security PIN (1947). Sensitive financial operations and approvals are now unlocked.`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, authMsg]);
    } else {
      alert('Invalid Voice PIN. Default PIN for testing is 1947.');
    }
  };

  const handleSendQuery = async (queryText: string, fromVoice = false) => {
    if (!queryText.trim()) return;

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
            deterministicVerification: 'Cross-verified with core transaction database',
          },
          actionCard: result.actionCard,
        };

        setMessages((prev) => [...prev, assistantMsg]);

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

  return (
    <div className="space-y-6">
      {/* Top Banner: Voice Assistant Command Center */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#002970] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Multilingual AI Voice Business Assistant
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Understand and run your business through natural conversation in Indian languages
              </p>
            </div>
          </div>
        </div>

        {/* Security & Settings Controls */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setShowPinModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
              isAuthenticated
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {isAuthenticated ? <Unlock className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
            <span>{isAuthenticated ? 'Voice PIN Verified' : 'Authenticate Voice PIN (1947)'}</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
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
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  selectedLanguage === l.code
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Interactive Conversation Stream & Microphone */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg flex flex-col h-[650px] overflow-hidden">
          {/* Header of chat card */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">
                Voice Session Connected · {merchant.businessName}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`flex items-center gap-1 text-[11px] font-medium ${
                  autoSpeak ? 'text-[#002970] font-semibold' : 'text-slate-400'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Auto-Speak</span>
              </button>
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold"
                >
                  Stop Audio
                </button>
              )}
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1 px-1">
                  {msg.sender === 'user' ? (
                    <>
                      <span className="font-medium text-slate-700">{merchant.ownerName}</span>
                      {msg.isVoiceInput && (
                        <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-medium">
                          Spoken
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

                <div
                  className={`max-w-[85%] rounded-lg p-4 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#002970] text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200/90 text-slate-900'
                  }`}
                >
                  <div className="whitespace-pre-line text-xs font-normal">{msg.content}</div>

                  {msg.thoughtTrace && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 text-[11px] text-slate-600 font-mono space-y-0.5">
                      <div className="font-semibold text-slate-700">
                        {msg.thoughtTrace.agentName} ({msg.thoughtTrace.intentIdentified})
                      </div>
                      <div className="text-emerald-700">
                        ✓ {msg.thoughtTrace.deterministicVerification}
                      </div>
                    </div>
                  )}

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

                {/* Inline Action Card */}
                {msg.actionCard && (
                  <div className="mt-2.5 max-w-[85%] w-full bg-amber-50 border border-amber-300 rounded-lg p-3.5 text-xs text-amber-950 shadow-sm">
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
                <span>Assistant is querying verified backend data and generating spoken audio...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Input Strip */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-200">
            {isListening && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  <span className="text-xs font-bold text-red-900">
                    Listening in {selectedLanguage.toUpperCase()}... Speak naturally
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
              <button
                onClick={toggleListening}
                className={`p-3.5 rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-600 text-white shadow-lg animate-pulse'
                    : 'bg-[#002970] text-white hover:bg-[#001f52] shadow-sm'
                }`}
                title="Push to speak in Indian languages"
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

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
                    ? 'माइक दबाकर बोलें या सवाल लिखें (उदा. आज की कुल बिक्री कितनी है?)...'
                    : selectedLanguage === 'ta'
                    ? 'மைக் அழுத்தி பேசவும் அல்லது கேள்வி எழுதவும்...'
                    : selectedLanguage === 'kn'
                    ? 'ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ ಅಥವಾ ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ...'
                    : selectedLanguage === 'te'
                    ? 'మైక్ నొక్కి మాట్లాడండి లేదా ప్రశ్న టైప్ చేయండి...'
                    : 'Tap microphone to speak or type query (e.g. today collections)...'
                }
                className="flex-1 px-4 py-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#002970]"
              />

              <button
                onClick={() => handleSendQuery(inputText, false)}
                disabled={!inputText.trim() || isProcessing}
                className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): The 5 Core Capability Launchpads */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#002970]" />
              <span>Core Voice Capabilities</span>
            </h3>

            <div className="mt-4 space-y-3 text-xs">
              {/* Capability 1 */}
              <div className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200/80 transition-colors">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#002970]" />
                    <span>1. Payment Intelligence</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono font-bold">
                    Soundbox 4G
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Ask about today's collections, UPI QR volume, card deductions, and Soundbox instant chimes.
                </p>
                <button
                  onClick={() => handleSendQuery('आज की कुल बिक्री और साउंडबॉक्स कलेक्शन बताओ', false)}
                  className="mt-2 text-[11px] font-semibold text-[#002970] hover:underline flex items-center gap-1"
                >
                  <span>Ask collections inquiry →</span>
                </button>
              </div>

              {/* Capability 2 */}
              <div className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200/80 transition-colors">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-700" />
                    <span>2. Financial & Settlements</span>
                  </div>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-mono font-bold">
                    Reconciliation
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Verify UTR numbers, investigate settlement variances against bank ledgers, and audit clearing cuts.
                </p>
                <button
                  onClick={() => handleSendQuery('27 अक्टूबर के सेटलमेंट में क्या गड़बड़ है? जांच करो', false)}
                  className="mt-2 text-[11px] font-semibold text-[#002970] hover:underline flex items-center gap-1"
                >
                  <span>Investigate 27-Oct variance →</span>
                </button>
              </div>

              {/* Capability 3 */}
              <div className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200/80 transition-colors">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>3. Cash-Flow & Loans</span>
                  </div>
                  <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                    7-Day Model
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Forecast tomorrow's inflows with auto-deduction of ₹350 Paytm Merchant Growth Loan EMI.
                </p>
                <button
                  onClick={() => handleSendQuery('कल का कैश फ्लो और लोन EMI बताओ', false)}
                  className="mt-2 text-[11px] font-semibold text-[#002970] hover:underline flex items-center gap-1"
                >
                  <span>Check cash-flow forecast →</span>
                </button>
              </div>

              {/* Capability 4 */}
              <div className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200/80 transition-colors">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-700" />
                    <span>4. Khata Due & Reminders</span>
                  </div>
                  <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded font-mono font-bold">
                    Overdue
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Track overdue store credit and draft friendly WhatsApp/SMS payment reminders with UPI QR intent.
                </p>
                <button
                  onClick={() => handleSendQuery('खाता बही में किस ग्राहक का बकाया बाकी है? रिमाइंडर भेजो', false)}
                  className="mt-2 text-[11px] font-semibold text-[#002970] hover:underline flex items-center gap-1"
                >
                  <span>Draft customer reminder →</span>
                </button>
              </div>

              {/* Capability 5 */}
              <div className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200/80 transition-colors">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                    <span>5. Business Growth & Promos</span>
                  </div>
                  <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-mono font-bold">
                    +14% Lift
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Analyze peak hours and launch festival weekend 5% cashback promotional QR campaigns.
                </p>
                <button
                  onClick={() => handleSendQuery('आने वाले त्योहार के लिए 5% कैशबैक ऑफर तैयार करो', false)}
                  className="mt-2 text-[11px] font-semibold text-[#002970] hover:underline flex items-center gap-1"
                >
                  <span>Prepare growth promo →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice PIN Authentication Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#002970]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Merchant Voice Security PIN
                </h3>
              </div>
              <button onClick={() => setShowPinModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <p className="mt-3 text-slate-600 leading-relaxed">
              Verify identity for <strong className="text-slate-900">{merchant.ownerName}</strong> to unlock sensitive banking details and authorize financial dispute actions.
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
                  Verify Voice PIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
