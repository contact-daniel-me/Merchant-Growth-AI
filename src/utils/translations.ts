import { IndianLanguage } from '../types/index.ts';

export interface TranslationStrings {
  appName: string;
  tagline: string;
  navHome: string;
  navPayments: string;
  navMoney: string;
  navCustomerDues: string;
  navGrowth: string;
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
  en: {
    appName: 'Merchant',
    tagline: 'AI Business Intelligence',
    navHome: 'Home',
    navPayments: 'Payments',
    navMoney: 'My Money',
    navCustomerDues: 'Customer Dues',
    navGrowth: 'Business Growth',
    navAssistant: 'Assistant',
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    howIsBusiness: 'Hello! How is your business today?',
    moneyReceivedToday: 'Money Received Today',
    paymentsReceived: 'Payments Received',
    moneyYetToCome: 'Money in Transit / Pending',
    salesComparison: 'Your verified weekly sales are tracking positively.',
    talkToAssistant: 'Talk to Merchant Assistant',
    todaysUpdates: "Today's Verified Updates",
    businessTips: 'Growth Opportunities',
    listenToSummary: 'Listen to Spoken Summary',
    viewDetails: 'View Details',
    myPayments: 'My Payments',
    searchPayments: 'Search customer or order ID...',
    filterAll: 'All',
    filterReceived: 'Settled',
    filterPending: 'Pending',
    filterRefunded: 'Refunded',
    filterFailed: 'Disputed',
    whereIsMyMoney: 'Where is my money?',
    moneyFlowStep1: 'Customer Scans QR',
    moneyFlowStep2: 'Soundbox Speaks',
    moneyFlowStep3: 'Money Credited to Bank',
    moneyInBank: 'Money Deposited in Bank',
    moneyPendingBank: 'Money In-Transit to Bank',
    askWhyPending: 'Check reason',
    growYourBusiness: 'Grow Your Business',
    whatWeNoticed: 'Evidence Observed',
    whyItMatters: 'Financial Impact',
    whatYouCanDo: 'Action Recommended',
    myReminders: 'Customer Khata & Dues',
    customerDuesToCollect: 'pending customer collection',
    prepareReminderBtn: 'Prepare Reminder',
    assistantHeading: 'How can Merchant Assistant help your shop today?',
    assistantSubheading: 'Speak naturally in your language. Real backend data answers.',
    listening: "Merchant Assistant is listening...",
    tapToSpeak: 'Tap microphone to speak',
    askQuestionsPrompt: 'Frequently Asked Questions:',
  },
  hi: {
    appName: 'मर्चेंट (GrowIOTA)',
    tagline: 'मर्चेंट बिजनेस इंटेलिजेंस व वॉइस प्लेटफॉर्म',
    navHome: 'होम',
    navPayments: 'पेमेंट्स',
    navMoney: 'मेरा पैसा',
    navCustomerDues: 'ग्राहक उधारी',
    navGrowth: 'व्यापार वृद्धि',
    navAssistant: 'असिस्टेंट',
    greetingMorning: 'शुभ प्रभात',
    greetingAfternoon: 'नमस्कार',
    greetingEvening: 'शुभ संध्या',
    howIsBusiness: 'नमस्ते! आज आपकी दुकान का हाल कैसा है?',
    moneyReceivedToday: 'आज आया हुआ पैसा',
    paymentsReceived: 'कुल पेमेंट्स मिले',
    moneyYetToCome: 'आने वाला पैसा (इन-ट्रांजिट)',
    salesComparison: 'आपकी आज की बिक्री पिछले हफ़्ते से बेहतर चल रही है।',
    talkToAssistant: 'मर्चेंट असिस्टेंट से बात करें',
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
    filterFailed: 'विवादित',
    whereIsMyMoney: 'मेरा पैसा कहाँ है?',
    moneyFlowStep1: 'ग्राहक ने QR स्कैन किया',
    moneyFlowStep2: 'साउंडबॉक्स ने घोषणा की',
    moneyFlowStep3: 'पैसा बैंक में जमा हुआ',
    moneyInBank: 'बैंक में जमा हुआ पैसा',
    moneyPendingBank: 'बैंक में आने वाला पैसा',
    askWhyPending: 'कारण जानें',
    growYourBusiness: 'व्यापार आगे बढ़ाएं',
    whatWeNoticed: 'हमने क्या पाया',
    whyItMatters: 'इसका क्या प्रभाव है',
    whatYouCanDo: 'आप क्या कर सकते हैं',
    myReminders: 'ग्राहक खाता व उधारी',
    customerDuesToCollect: 'ग्राहकों से लेना बाकी',
    prepareReminderBtn: 'रिमाइंडर तैयार करें',
    assistantHeading: 'मैं आपकी दुकान की क्या मदद करूँ?',
    assistantSubheading: 'बस अपनी भाषा में बोलिए।',
    listening: 'मर्चेंट असिस्टेंट सुन रहा है...',
    tapToSpeak: 'बोलने के लिए माइक दबाएं',
    askQuestionsPrompt: 'इनमें से कोई भी सवाल पूछें:',
  },
  ta: {
    appName: 'மெர்ச்சன்ட் (GrowIOTA)',
    tagline: 'வணிக நுண்ணறிவு மற்றும் குரல் தளம்',
    navHome: 'முகப்பு',
    navPayments: 'கொடுப்பனவுகள்',
    navMoney: 'என் பணம்',
    navCustomerDues: 'வாடிக்கையாளர் பாக்கி',
    navGrowth: 'வணிக வளர்ச்சி',
    navAssistant: 'உதவியாளர்',
    greetingMorning: 'காலை வணக்கம்',
    greetingAfternoon: 'மதிய வணக்கம்',
    greetingEvening: 'மாலை வணக்கம்',
    howIsBusiness: 'வணக்கம்! இன்று உங்கள் வியாபாரம் எப்படி இருக்கிறது?',
    moneyReceivedToday: 'இன்று வந்த பணம்',
    paymentsReceived: 'பெறப்பட்ட கொடுப்பனவுகள்',
    moneyYetToCome: 'வரவேண்டிய தொகை (இடைநிலை)',
    salesComparison: 'உங்கள் விற்பனை நிலையாக உள்ளது.',
    talkToAssistant: 'மெர்ச்சன்ட் உதவியாளரிடம் பேசுங்கள்',
    todaysUpdates: 'இன்றைய முக்கிய விவரங்கள்',
    businessTips: 'வணிக வளர்ச்சி குறிப்புகள்',
    listenToSummary: 'சுருக்கத்தைக் கேளுங்கள்',
    viewDetails: 'விவரங்களைப் பார்க்கவும்',
    myPayments: 'என் கொடுப்பனவுகள்',
    searchPayments: 'வாடிக்கையாளர் அல்லது ஆர்டரைத் தேடுங்கள்...',
    filterAll: 'அனைத்தும்',
    filterReceived: 'வரவு வைக்கப்பட்டது',
    filterPending: 'நிலுவையில் உள்ளது',
    filterRefunded: 'திரும்பப் பெறப்பட்டது',
    filterFailed: 'சிக்கல்',
    whereIsMyMoney: 'என் பணம் எங்கே?',
    moneyFlowStep1: 'வாடிக்கையாளர் செலுத்துகிறார்',
    moneyFlowStep2: 'சவுண்ட்பாக்ஸ் உறுதிசெய்கிறது',
    moneyFlowStep3: 'வங்கிக்கு அனுப்பப்படுகிறது',
    moneyInBank: 'வங்கியில் வரவு வைக்கப்பட்ட பணம்',
    moneyPendingBank: 'வங்கிக்கு இன்னும் வர வேண்டிய பணம்',
    askWhyPending: 'காரணம் என்ன?',
    growYourBusiness: 'வணிகத்தை வளர்க்கவும்',
    whatWeNoticed: 'நாங்கள் கவனித்தவை',
    whyItMatters: 'ஏன் முக்கியம்',
    whatYouCanDo: 'நீங்கள் என்ன செய்யலாம்',
    myReminders: 'வாடிக்கையாளர் கடன் பாக்கி',
    customerDuesToCollect: 'வசூலிக்க வேண்டிய தொகை',
    prepareReminderBtn: 'நினைவூட்டலைத் தயார் செய்',
    assistantHeading: 'உங்களுக்கு எப்படி உதவ முடியும்?',
    assistantSubheading: 'இயல்பாகப் பேசுங்கள், மெர்ச்சன்ட் உதவியாளர் பதிலளிப்பார்.',
    listening: 'மெர்ச்சன்ட் கேட்கிறது...',
    tapToSpeak: 'பேச மைக்ரோஃபோனைத் தொடவும்',
    askQuestionsPrompt: 'இந்தக் கேள்விகளைக் கேளுங்கள்:',
  },
  kn: {
    appName: 'ಮರ್ಚೆಂಟ್ (GrowIOTA)',
    tagline: 'ವ್ಯಾಪಾರ ಬುದ್ಧಿಮತ್ತೆ ಮತ್ತು ಧ್ವನಿ ತಂತ್ರಜ್ಞಾನ',
    navHome: 'ಮುಖಪುಟ',
    navPayments: 'ಪಾವತಿಗಳು',
    navMoney: 'ನನ್ನ ಹಣ',
    navCustomerDues: 'ಗ್ರಾಹಕರ ಬಾಕಿ',
    navGrowth: 'ವ್ಯಾಪಾರ ವೃದ್ಧಿ',
    navAssistant: 'ಸಹಾಯಕ',
    greetingMorning: 'ಶುಭೋದಯ',
    greetingAfternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
    greetingEvening: 'ಶುಭ ಸಂಜೆ',
    howIsBusiness: 'ನಮಸ್ಕಾರ! ಇಂದು ನಿಮ್ಮ ವ್ಯಾಪಾರ ಹೇಗಿದೆ?',
    moneyReceivedToday: 'ಇಂದು ಬಂದ ಹಣ',
    paymentsReceived: 'ಸ್ವೀಕರಿಸಿದ ಪಾವತಿಗಳು',
    moneyYetToCome: 'ಬರಬೇಕಿರುವ ಹಣ (ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ)',
    salesComparison: 'ನಿಮ್ಮ ಮಾರಾಟವು ಉತ್ತಮ ಮಟ್ಟದಲ್ಲಿದೆ.',
    talkToAssistant: 'ಮರ್ಚೆಂಟ್ ಸಹಾಯಕರೊಂದಿಗೆ ಮಾತನಾಡಿ',
    todaysUpdates: 'ಇಂದಿನ ಮುಖ್ಯ ಅಪ್‌ಡೇಟ್‌ಗಳು',
    businessTips: 'ವ್ಯಾಪಾರ ವೃದ್ಧಿಯ ಸಲಹೆಗಳು',
    listenToSummary: 'ಸಾರಾಂಶವನ್ನು ಆಲಿಸಿ',
    viewDetails: 'ವಿವರಗಳನ್ನು ನೋಡಿ',
    myPayments: 'ನನ್ನ ಪಾವತಿಗಳು',
    searchPayments: 'ಗ್ರಾಹಕರ ಹೆಸರು ಅಥವಾ ಆರ್ಡರ್ ಹುಡುಕಿ...',
    filterAll: 'ಎಲ್ಲವೂ',
    filterReceived: 'ಜಮೆಯಾಗಿದೆ',
    filterPending: 'ಬಾಕಿಯಿದೆ',
    filterRefunded: 'ಮರುಪಾವತಿ',
    filterFailed: 'ವಿವಾದಿತ',
    whereIsMyMoney: 'ನನ್ನ ಹಣ ಎಲ್ಲಿದೆ?',
    moneyFlowStep1: 'ಗ್ರಾಹಕರು ಪಾವತಿಸುತ್ತಾರೆ',
    moneyFlowStep2: 'ಸೌಂಡ್‌ಬಾಕ್ಸ್ ಪ್ರಕಟಿಸುತ್ತದೆ',
    moneyFlowStep3: 'ಬ್ಯಾಂಕಿಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ',
    moneyInBank: 'ಬ್ಯಾಂಕಿಗೆ ಜಮೆಯಾದ ಹಣ',
    moneyPendingBank: 'ಬ್ಯಾಂಕಿಗೆ ಇನ್ನೂ ಬರಬೇಕಾದ ಹಣ',
    askWhyPending: 'ಕಾರಣ ತಿಳಿಯಿರಿ',
    growYourBusiness: 'ವ್ಯಾಪಾರವನ್ನು ಬೆಳೆಸಿ',
    whatWeNoticed: 'ನಾವು ಗಮನಿಸಿದ ವಿಷಯಗಳು',
    whyItMatters: 'ಇದರ ಪ್ರಾಮುಖ್ಯತೆ',
    whatYouCanDo: 'ನೀವು ಏನು ಮಾಡಬಹುದು',
    myReminders: 'ಗ್ರಾಹಕರ ಸಾಲ ಮತ್ತು ಬಾಕಿ',
    customerDuesToCollect: 'ಗ್ರಾಹಕರಿಂದ ಬರಬೇಕಾದ ಬಾಕಿ',
    prepareReminderBtn: 'ಜ್ಞಾಪನೆ ಸಿದ್ಧಪಡಿಸಿ',
    assistantHeading: 'ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
    assistantSubheading: 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ, ಮರ್ಚೆಂಟ್ ಸಹಾಯಕ ಉತ್ತರಿಸುತ್ತದೆ.',
    listening: 'ಮರ್ಚೆಂಟ್ ಆಲಿಸುತ್ತಿದೆ...',
    tapToSpeak: 'ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ',
    askQuestionsPrompt: 'ಈ ಕೆಳಗಿನ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ:',
  },
  te: {
    appName: 'మర్చెంట్ (GrowIOTA)',
    tagline: 'వ్యాపార ఇంటెలిజెన్స్ & వాయిస్ ప్లాట్‌ఫారమ్',
    navHome: 'హోమ్',
    navPayments: 'చెల్లింపులు',
    navMoney: 'నా డబ్బు',
    navCustomerDues: 'కస్టమర్ బాకీలు',
    navGrowth: 'వ్యాపార వృద్ధి',
    navAssistant: 'సహాయకుడు',
    greetingMorning: 'శుభోదయం',
    greetingAfternoon: 'నమస్కారం',
    greetingEvening: 'శుభ సాయంత్రం',
    howIsBusiness: 'నమస్తే! ఈ రోజు మీ వ్యాపారం ఎలా ఉంది?',
    moneyReceivedToday: 'ఈ రోజు వచ్చిన డబ్బు',
    paymentsReceived: 'వచ్చిన చెల్లింపులు',
    moneyYetToCome: 'రావాల్సిన డబ్బు (ఇన్-ట్రాన్సిట్)',
    salesComparison: 'మీ అమ్మకాలు స్థిరంగా సాగుతున్నాయి.',
    talkToAssistant: 'మర్చెంట్ సహాయకుడితో మాట్లాడండి',
    todaysUpdates: 'ఈ రోజు తాజా వివరాలు',
    businessTips: 'వ్యాపార వృద్ధి చిట్కాలు',
    listenToSummary: 'సారాంశాన్ని వినండి',
    viewDetails: 'వివరాలు చూడండి',
    myPayments: 'నా చెల్లింపులు',
    searchPayments: 'కస్టమర్ లేదా ఆర్డర్ కోసం వెతకండి...',
    filterAll: 'అన్నీ',
    filterReceived: 'జమ అయినవి',
    filterPending: 'పెండింగ్‌లో ఉన్నవి',
    filterRefunded: 'రీఫండ్ అయినవి',
    filterFailed: 'వివాదంలో ఉన్నవి',
    whereIsMyMoney: 'నా డబ్బు ఎక్కడ ఉంది?',
    moneyFlowStep1: 'కస్టమర్ చెల్లింపు చేశారు',
    moneyFlowStep2: 'సౌండ్‌బాక్స్ ప్రకటించింది',
    moneyFlowStep3: 'బ్యాంకుకు పంపబడింది',
    moneyInBank: 'బ్యాంకులో జమ అయిన డబ్బు',
    moneyPendingBank: 'బ్యాంకుకు ఇంకా రావాల్సిన డబ్బు',
    askWhyPending: 'కారణం తెలుసుకోండి',
    growYourBusiness: 'వ్యాపారాన్ని విస్తరించండి',
    whatWeNoticed: 'మేము గమనించిన అంశాలు',
    whyItMatters: 'దీని ప్రాముఖ్యత ఏమిటి',
    whatYouCanDo: 'మీరు ఏమి చేయవచ్చు',
    myReminders: 'కస్టమర్ ఖాతా & బాకీలు',
    customerDuesToCollect: 'కస్టమర్ల నుండి రావలసిన బాకీ',
    prepareReminderBtn: 'రిమైండర్ సిద్ధం చేయండి',
    assistantHeading: 'నేను మీకు ఎలా సహాయపడగలను?',
    assistantSubheading: 'సహజంగా మాట్లాడండి, మర్చెంట్ అసిస్టెంట్ సహాయం చేస్తుంది.',
    listening: 'మర్చెంట్ వింటోంది...',
    tapToSpeak: 'మాట్లాడటానికి మైక్ నొక్కండి',
    askQuestionsPrompt: 'ఈ ప్రశ్నలను అడగండి:',
  },
};
