import { IndianLanguage } from '../types/index.ts';

export interface TranslationStrings {
  appName: string;
  tagline: string;
  navHome: string;
  navPayments: string;
  navMoney: string;
  navTips: string;
  navAssistant: string;
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  howIsBusiness: string;
  moneyReceivedToday: string;
  paymentsReceived: string;
  moneyYetToCome: string;
  salesComparison: string;
  talkToAssistant: string;
  todaysUpdates: string;
  businessTips: string;
  listenToSummary: string;
  viewDetails: string;
  myPayments: string;
  searchPayments: string;
  filterAll: string;
  filterReceived: string;
  filterPending: string;
  filterRefunded: string;
  filterFailed: string;
  whereIsMyMoney: string;
  moneyFlowStep1: string;
  moneyFlowStep2: string;
  moneyFlowStep3: string;
  moneyInBank: string;
  moneyPendingBank: string;
  askWhyPending: string;
  growYourBusiness: string;
  whatWeNoticed: string;
  whyItMatters: string;
  whatYouCanDo: string;
  myReminders: string;
  customerDuesToCollect: string;
  prepareReminderBtn: string;
  assistantHeading: string;
  assistantSubheading: string;
  listening: string;
  tapToSpeak: string;
  askQuestionsPrompt: string;
}

export const translations: Record<IndianLanguage, TranslationStrings> = {
  hi: {
    appName: 'बिजनेस असिस्टेंट',
    tagline: 'आपका भरोसेमंद साथी',
    navHome: 'होम',
    navPayments: 'पेमेंट्स',
    navMoney: 'मेरा पैसा',
    navTips: 'बिजनेस टिप्स',
    navAssistant: 'असिस्टेंट',
    greetingMorning: 'शुभ प्रभात',
    greetingAfternoon: 'नमस्कार',
    greetingEvening: 'शुभ संध्या',
    howIsBusiness: 'नमस्ते! आज आपका बिजनेस कैसा चल रहा है?',
    moneyReceivedToday: 'आज आया हुआ पैसा',
    paymentsReceived: 'कुल पेमेंट्स मिले',
    moneyYetToCome: 'आने वाला पैसा',
    salesComparison: 'आपकी आज की बिक्री कल से 12% अधिक है।',
    talkToAssistant: 'अपने बिजनेस असिस्टेंट से बात करें',
    todaysUpdates: 'आज के मुख्य अपडेट',
    businessTips: 'दुकान बढ़ाने की सलाह',
    listenToSummary: 'आज का हाल सुनें',
    viewDetails: 'विवरण देखें',
    myPayments: 'मेरे पेमेंट्स',
    searchPayments: 'ग्राहक का नाम या ऑर्डर खोजें...',
    filterAll: 'सभी',
    filterReceived: 'सफल',
    filterPending: 'प्रतीक्षारत',
    filterRefunded: 'रिफंड',
    filterFailed: 'विफल',
    whereIsMyMoney: 'मेरा पैसा कहाँ है?',
    moneyFlowStep1: 'ग्राहक ने दिया',
    moneyFlowStep2: 'पेमेंट मिला',
    moneyFlowStep3: 'बैंक खाते में भेजा',
    moneyInBank: 'बैंक में जमा हुआ पैसा',
    moneyPendingBank: 'बैंक में आना बाकी पैसा',
    askWhyPending: 'कारण पूछें',
    growYourBusiness: 'दुकान की बिक्री बढ़ाएं',
    whatWeNoticed: 'हमने क्या देखा',
    whyItMatters: 'यह क्यों जरूरी है',
    whatYouCanDo: 'आप क्या कर सकते हैं',
    myReminders: 'उधारी और रिमाइंडर',
    customerDuesToCollect: 'ग्राहकों से बकाया उधारी लेनी है',
    prepareReminderBtn: 'रिमाइंडर तैयार करें',
    assistantHeading: 'मैं आपकी क्या मदद करूँ?',
    assistantSubheading: 'बस बोलिए, मैं समझा दूँगा।',
    listening: 'मैं सुन रहा हूँ...',
    tapToSpeak: 'बोलने के लिए माइक दबाएं',
    askQuestionsPrompt: 'इनमें से कोई भी सवाल पूछें:',
  },
  en: {
    appName: 'Merchant Business Assistant',
    tagline: 'Simple shopkeeper companion',
    navHome: 'Home',
    navPayments: 'Payments',
    navMoney: 'My Money',
    navTips: 'Business Tips',
    navAssistant: 'Assistant',
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    howIsBusiness: 'Hello! How is your business today?',
    moneyReceivedToday: 'Money Received Today',
    paymentsReceived: 'Payments Received',
    moneyYetToCome: 'Money Yet to Come',
    salesComparison: 'Your sales are 12% higher than yesterday.',
    talkToAssistant: 'Talk to Your Business Assistant',
    todaysUpdates: "Today's Updates",
    businessTips: 'Business Tips',
    listenToSummary: 'Listen to Summary',
    viewDetails: 'View Details',
    myPayments: 'My Payments',
    searchPayments: 'Search customer or order ID...',
    filterAll: 'All',
    filterReceived: 'Received',
    filterPending: 'Pending',
    filterRefunded: 'Refunded',
    filterFailed: 'Failed',
    whereIsMyMoney: 'Where is my money?',
    moneyFlowStep1: 'Customer Pays',
    moneyFlowStep2: 'Payment Received',
    moneyFlowStep3: 'Money Sent to Bank',
    moneyInBank: 'Money Deposited in Bank',
    moneyPendingBank: 'Money Still Pending to Bank',
    askWhyPending: 'Ask why',
    growYourBusiness: 'Grow Your Business',
    whatWeNoticed: 'What we noticed',
    whyItMatters: 'Why it matters',
    whatYouCanDo: 'What you can do',
    myReminders: 'My Money & Reminders',
    customerDuesToCollect: 'to collect from customers',
    prepareReminderBtn: 'Prepare Reminder',
    assistantHeading: 'How can I help your business?',
    assistantSubheading: "Just speak. I'll help you.",
    listening: "I'm listening...",
    tapToSpeak: 'Tap microphone to speak',
    askQuestionsPrompt: 'Try asking these questions:',
  },
  ta: {
    appName: 'வணிக உதவியாளர்',
    tagline: 'உங்கள் நம்பகமான துணை',
    navHome: 'முகப்பு',
    navPayments: 'கொடுப்பனவுகள்',
    navMoney: 'என் பணம்',
    navTips: 'வணிகக் குறிப்புகள்',
    navAssistant: 'உதவியாளர்',
    greetingMorning: 'காலை வணக்கம்',
    greetingAfternoon: 'மதிய வணக்கம்',
    greetingEvening: 'மாலை வணக்கம்',
    howIsBusiness: 'வணக்கம்! இன்று உங்கள் வியாபாரம் எப்படி இருக்கிறது?',
    moneyReceivedToday: 'இன்று வந்த பணம்',
    paymentsReceived: 'வந்த கொடுப்பனவுகள்',
    moneyYetToCome: 'இனி வர வேண்டிய பணம்',
    salesComparison: 'நேற்றைய விட இன்று 12% விற்பனை அதிகம்.',
    talkToAssistant: 'உங்கள் வணிக உதவியாளரிடம் பேசுங்கள்',
    todaysUpdates: 'இன்றைய தகவல்கள்',
    businessTips: 'வியாபாரக் குறிப்புகள்',
    listenToSummary: 'சுருக்கத்தைக் கேளுங்கள்',
    viewDetails: 'விவரம் பார்க்க',
    myPayments: 'என் கொடுப்பனவுகள்',
    searchPayments: 'வாடிக்கையாளர் பெயரைத் தேடவும்...',
    filterAll: 'அனைத்தும்',
    filterReceived: 'வெற்றி',
    filterPending: 'நிலுவையில்',
    filterRefunded: 'திரும்பப் பெறப்பட்டது',
    filterFailed: 'தோல்வி',
    whereIsMyMoney: 'என் பணம் எங்கே?',
    moneyFlowStep1: 'வாடிக்கையாளர் செலுத்துகிறார்',
    moneyFlowStep2: 'பணம் பெறப்பட்டது',
    moneyFlowStep3: 'வங்கிக்கு அனுப்பப்பட்டது',
    moneyInBank: 'வங்கியில் வரவான பணம்',
    moneyPendingBank: 'இன்னும் வங்கிக்கு வராத பணம்',
    askWhyPending: 'காரணம் கேட்க',
    growYourBusiness: 'வியாபாரத்தை உயர்த்துங்கள்',
    whatWeNoticed: 'நாங்கள் கவனித்தது',
    whyItMatters: 'ஏன் முக்கியம்',
    whatYouCanDo: 'நீங்கள் என்ன செய்யலாம்',
    myReminders: 'கடன் பாக்கி & நினைவூட்டல்',
    customerDuesToCollect: 'வாடிக்கையாளர்களிடமிருந்து வசூலிக்க வேண்டிய கடன்',
    prepareReminderBtn: 'நினைவூட்டல் தயார் செய்',
    assistantHeading: 'நான் உங்களுக்கு எப்படி உதவ முடியும்?',
    assistantSubheading: 'பேசுங்கள், நான் உதவுகிறேன்.',
    listening: 'நான் கேட்கிறேன்...',
    tapToSpeak: 'பேச மைக்கை அழுத்தவும்',
    askQuestionsPrompt: 'இந்தக் கேள்விகளைக் கேளுங்கள்:',
  },
  kn: {
    appName: 'ವ್ಯಾಪಾರ ಸಹಾಯಕ',
    tagline: 'ನಿಮ್ಮ ವಿಶ್ವಾಸಾರ್ಹ ಸಂಗಾತಿ',
    navHome: 'ಮುಖಪುಟ',
    navPayments: 'ಪಾವತಿಗಳು',
    navMoney: 'ನನ್ನ ಹಣ',
    navTips: 'ವ್ಯಾಪಾರ ಸಲಹೆಗಳು',
    navAssistant: 'ಸಹಾಯಕ',
    greetingMorning: 'ಶುಭೋದಯ',
    greetingAfternoon: 'ನಮಸ್ಕಾರ',
    greetingEvening: 'ಶುಭ ಸಂಜೆ',
    howIsBusiness: 'ನಮಸ್ಕಾರ! ಇಂದು ನಿಮ್ಮ ವ್ಯಾಪಾರ ಹೇಗಿದೆ?',
    moneyReceivedToday: 'ಇಂದು ಬಂದ ಹಣ',
    paymentsReceived: 'ಸ್ವೀಕರಿಸಿದ ಪಾವತಿಗಳು',
    moneyYetToCome: 'ಇನ್ನೂ ಬರಬೇಕಾದ ಹಣ',
    salesComparison: 'ನಿನ್ನೆಗಿಂತ ಇಂದಿನ ಮಾರಾಟ 12% ಹೆಚ್ಚಾಗಿದೆ.',
    talkToAssistant: 'ವ್ಯಾಪಾರ ಸಹಾಯಕರೊಂದಿಗೆ ಮಾತನಾಡಿ',
    todaysUpdates: 'ಇಂದಿನ ಮುಖ್ಯಾಂಶಗಳು',
    businessTips: 'ವ್ಯಾಪಾರ ಸಲಹೆಗಳು',
    listenToSummary: 'ಸಾರಾಂಶ ಕೇಳಿ',
    viewDetails: 'ವಿವರ ನೋಡಿ',
    myPayments: 'ನನ್ನ ಪಾವತಿಗಳು',
    searchPayments: 'ಗ್ರಾಹಕರ ಹೆಸರು ಅಥವಾ ಐಡಿ ಹುಡುಕಿ...',
    filterAll: 'ಎಲ್ಲಾ',
    filterReceived: 'ಯಶಸ್ವಿ',
    filterPending: 'ಬಾಕಿ ಇದೆ',
    filterRefunded: 'ಮರುಪಾವತಿ',
    filterFailed: 'ವಿಫಲ',
    whereIsMyMoney: 'ನನ್ನ ಹಣ ಎಲ್ಲಿದೆ?',
    moneyFlowStep1: 'ಗ್ರಾಹಕರು ಪಾವತಿಸಿದರು',
    moneyFlowStep2: 'ಹಣ ಸ್ವೀಕರಿಸಲಾಗಿದೆ',
    moneyFlowStep3: 'ಬ್ಯಾಂಕಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ',
    moneyInBank: 'ಬ್ಯಾಂಕಿನಲ್ಲಿ ಜಮೆಯಾದ ಹಣ',
    moneyPendingBank: 'ಬ್ಯಾಂಕಿಗೆ ಇನ್ನೂ ಬಾರದ ಹಣ',
    askWhyPending: 'ಕಾರಣ ಕೇಳಿ',
    growYourBusiness: 'ವ್ಯಾಪಾರ ಬೆಳೆಸಿ',
    whatWeNoticed: 'ನಾವು ಗಮನಿಸಿದ್ದು',
    whyItMatters: 'ಇದು ಏಕೆ ಮುಖ್ಯ',
    whatYouCanDo: 'ನೀವೇನು ಮಾಡಬಹುದು',
    myReminders: 'ಖಾತಾ ಬಾಕಿ & ಜ್ಞಾಪನೆಗಳು',
    customerDuesToCollect: 'ಗ್ರಾಹಕರಿಂದ ಸಂಗ್ರಹಿಸಬೇಕಾದ ಬಾಕಿ',
    prepareReminderBtn: 'ಜ್ಞಾಪನೆ ಸಿದ್ಧಪಡಿಸಿ',
    assistantHeading: 'ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
    assistantSubheading: 'ಮಾತನಾಡಿ, ನಾನು ಉತ್ತರಿಸುತ್ತೇನೆ.',
    listening: 'ನಾನು ಆಲಿಸುತ್ತಿದ್ದೇನೆ...',
    tapToSpeak: 'ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ',
    askQuestionsPrompt: 'ಈ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ ನೋಡಿ:',
  },
  te: {
    appName: 'వ్యాపార అసిస్టెంట్',
    tagline: 'మీ నమ్మకమైన మిత్రుడు',
    navHome: 'హోమ్',
    navPayments: 'చెల్లింపులు',
    navMoney: 'నా డబ్బు',
    navTips: 'వ్యాపార చిట్కాలు',
    navAssistant: 'అసిస్టెంట్',
    greetingMorning: 'శుభోదయం',
    greetingAfternoon: 'నమస్కారం',
    greetingEvening: 'శుభ సాయంత్రం',
    howIsBusiness: 'నమస్కారం! ఈ రోజు మీ వ్యాపారం ఎలా ఉంది?',
    moneyReceivedToday: 'ఈ రోజు వచ్చిన డబ్బు',
    paymentsReceived: 'వచ్చిన చెల్లింపులు',
    moneyYetToCome: 'ఇంకా రావలసిన డబ్బు',
    salesComparison: 'నిన్నటి కంటే నేటి అమ్మకాలు 12% ఎక్కువ.',
    talkToAssistant: 'మీ బిజినెస్ అసిస్టెంట్‌తో మాట్లాడండి',
    todaysUpdates: 'నేటి అప్‌డేట్స్',
    businessTips: 'వ్యాపార చిట్కాలు',
    listenToSummary: 'సారాంశం వినండి',
    viewDetails: 'వివరాలు చూడండి',
    myPayments: 'నా చెల్లింపులు',
    searchPayments: 'కస్టమర్ పేరు లేదా ఆర్డర్ వెతకండి...',
    filterAll: 'అన్నీ',
    filterReceived: 'విజయవంతం',
    filterPending: 'పెండింగ్',
    filterRefunded: 'రీఫండ్',
    filterFailed: 'విఫలం',
    whereIsMyMoney: 'నా డబ్బు ఎక్కడ ఉంది?',
    moneyFlowStep1: 'కస్టమర్ చెల్లించారు',
    moneyFlowStep2: 'చెల్లింపు అందింది',
    moneyFlowStep3: 'బ్యాంకుకు పంపబడింది',
    moneyInBank: 'బ్యాంకులో జమ అయిన డబ్బు',
    moneyPendingBank: 'బ్యాంకుకు ఇంకా రాని డబ్బు',
    askWhyPending: 'కారణం అడగండి',
    growYourBusiness: 'వ్యాపారాన్ని పెంచుకోండి',
    whatWeNoticed: 'మేము గమనించినది',
    whyItMatters: 'ఇది ఎందుకు ముఖ్యం',
    whatYouCanDo: 'మీరు ఏమి చేయవచ్చు',
    myReminders: 'ఖాతా బాకీ & రిమైండర్లు',
    customerDuesToCollect: 'కస్టమర్ల నుండి వసూలు చేయాల్సిన బాకీ',
    prepareReminderBtn: 'రిమైండర్ సిద్ధం చేయండి',
    assistantHeading: 'నేను మీకు ఎలా సహాయపడగలను?',
    assistantSubheading: 'మాట్లాడండి, నేను వివరిస్తాను.',
    listening: 'నేను వింటున్నాను...',
    tapToSpeak: 'మాట్లాడటానికి మైక్ నొక్కండి',
    askQuestionsPrompt: 'ఈ ప్రశ్నలను అడగండి:',
  },
};
