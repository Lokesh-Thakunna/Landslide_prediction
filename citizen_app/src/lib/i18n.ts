import type { LanguageCode, RiskLevel } from "../types";

export const LANGUAGE_STORAGE_KEY = "hhlews-citizen-language";
export const ALERT_LANGUAGE_STORAGE_KEY = "hhlews-alert-language";

export const languageOptions: Array<{
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  shortLabel: string;
}> = [
  { code: "hi", label: "Hindi", nativeLabel: "हिंदी", shortLabel: "हिं" },
  { code: "en", label: "English", nativeLabel: "English", shortLabel: "EN" },
  {
    code: "hi-x-garhwali",
    label: "Garhwali",
    nativeLabel: "गढ़वाली",
    shortLabel: "गढ़"
  },
  {
    code: "hi-x-kumaoni",
    label: "Kumaoni",
    nativeLabel: "कुमाऊँनी",
    shortLabel: "कुम"
  }
];

const districtDefaultLanguage: Record<string, LanguageCode> = {
  "dist-chamoli": "hi-x-garhwali",
  "dist-rudraprayag": "hi-x-garhwali",
  "dist-uttarkashi": "hi-x-garhwali",
  "dist-pithoragarh": "hi-x-kumaoni",
  "dist-almora": "hi-x-kumaoni",
  "dist-bageshwar": "hi-x-kumaoni",
  "dist-nainital": "hi-x-kumaoni"
};

type CitizenDictionary = {
  chooseLanguageTitle: string;
  chooseLanguageSubtitle: string;
  chooseLanguageHint: string;
  appEyebrow: string;
  appIntro: string;
  loading: string;
  zoneSectionLabel: string;
  currentArea: string;
  noZones: string;
  yourCurrentZone: string;
  riskScore: string;
  rainfall: string;
  lastUpdated: string;
  nextTwoHours: string;
  nextTwoHoursSubtitle: string;
  nowLabel: string;
  nearbyShelter: string;
  shelterUnavailable: string;
  distance: string;
  capacity: string;
  evacuationRoute: string;
  routeUnavailable: string;
  locationGuidance: string;
  locationGuidanceSubtitle: string;
  locationUnavailable: string;
  locationButton: string;
  locatingLabel: string;
  currentPosition: string;
  nearestDanger: string;
  recommendedSafeZone: string;
  fallbackDirection: string;
  nearbySafeZones: string;
  noNearbySafeZones: string;
  uphillLabel: string;
  downhillLabel: string;
  reportSection: string;
  reportSubtitle: string;
  reportDescriptionLabel: string;
  reportFileLabel: string;
  reportSubmit: string;
  reportStatusLabel: string;
  reportStatusUnavailable: string;
  reportNeedLocation: string;
  emergencyContacts: string;
  alertSubscription: string;
  alertSubscriptionSubtitle: string;
  phoneNumber: string;
  phoneHint: string;
  zone: string;
  channels: string;
  subscribe: string;
  subscriptionSaved: string;
  selectZoneError: string;
  selectChannelError: string;
  phoneError: string;
  saveFailed: string;
  offlineShellTitle: string;
  offlineShellBody: string;
  settingsTitle: string;
  settingsBody: string;
  appLanguage: string;
  alertLanguage: string;
  languageChipLabel: string;
  subtitleFormat: (district: string) => string;
  subscriptionStatusFormat: (status: string) => string;
  forecastLabel: (hours: 1 | 2) => string;
  distanceFormat: (km: number) => string;
  minutesFormat: (minutes: number) => string;
  numberedStep: (index: number, step: string) => string;
  riskTitle: Record<RiskLevel, string>;
  warningText: Record<RiskLevel, string>;
  actionText: Record<RiskLevel, string>;
  riskLabel: Record<RiskLevel, string>;
};

const dictionaries: Record<LanguageCode, CitizenDictionary> = {
  hi: {
    chooseLanguageTitle: "अपनी भाषा चुनें",
    chooseLanguageSubtitle: "Choose your language",
    chooseLanguageHint: "आप इसे बाद में तुरंत बदल सकते हैं।",
    appEyebrow: "BHURAKSHAN Citizen View",
    appIntro:
      "अपने क्षेत्र का भूस्खलन जोखिम, अगले दो घंटे का पूर्वानुमान, नज़दीकी आश्रय और निकासी मार्ग देखें।",
    loading: "नागरिक ऐप लोड हो रहा है...",
    zoneSectionLabel: "क्षेत्र चयन",
    currentArea: "वर्तमान क्षेत्र",
    noZones: "अभी कोई क्षेत्र उपलब्ध नहीं है।",
    yourCurrentZone: "आपका वर्तमान क्षेत्र",
    riskScore: "जोखिम स्कोर",
    rainfall: "वर्षा",
    lastUpdated: "अंतिम अपडेट",
    nextTwoHours: "अगले दो घंटे",
    nextTwoHoursSubtitle: "देखें कि स्थिति स्थिर है या खतरे की ओर बढ़ रही है।",
    nowLabel: "अभी",
    nearbyShelter: "नज़दीकी आश्रय",
    shelterUnavailable: "आश्रय की जानकारी अभी उपलब्ध नहीं है।",
    distance: "दूरी",
    capacity: "क्षमता",
    evacuationRoute: "निकासी मार्ग",
    routeUnavailable: "मार्ग की जानकारी अभी उपलब्ध नहीं है।",
    locationGuidance: "लाइव लोकेशन मार्गदर्शन",
    locationGuidanceSubtitle: "अपनी वर्तमान लोकेशन से सुरक्षित स्थान की दिशा और दूरी देखें।",
    locationUnavailable: "लोकेशन अनुमति मिलने पर यहाँ लाइव मार्गदर्शन दिखेगा।",
    locationButton: "मेरी लोकेशन उपयोग करें",
    locatingLabel: "लोकेशन प्राप्त की जा रही है...",
    currentPosition: "वर्तमान स्थिति",
    nearestDanger: "नज़दीकी खतरे की दिशा",
    recommendedSafeZone: "सुझाया गया सुरक्षित स्थान",
    fallbackDirection: "ऑफ़लाइन दिशा",
    nearbySafeZones: "नज़दीकी सुरक्षित स्थान",
    noNearbySafeZones: "इस समय नज़दीकी सुरक्षित स्थान सूची उपलब्ध नहीं है।",
    uphillLabel: "ऊपर की ओर",
    downhillLabel: "नीचे की ओर",
    reportSection: "ज़मीनी रिपोर्ट भेजें",
    reportSubtitle: "फ़ोटो या छोटा वीडियो भेजकर अधिकारियों को मौजूदा स्थिति बताएं।",
    reportDescriptionLabel: "क्या हो रहा है? (वैकल्पिक)",
    reportFileLabel: "फ़ोटो या वीडियो चुनें",
    reportSubmit: "रिपोर्ट भेजें",
    reportStatusLabel: "रिपोर्ट स्थिति",
    reportStatusUnavailable: "अभी कोई हाल की रिपोर्ट स्थिति उपलब्ध नहीं है।",
    reportNeedLocation: "रिपोर्ट भेजने से पहले लोकेशन चाहिए।",
    emergencyContacts: "आपातकालीन संपर्क",
    alertSubscription: "अलर्ट सदस्यता",
    alertSubscriptionSubtitle: "अपने क्षेत्र के लिए SMS या WhatsApp चेतावनी प्राप्त करें।",
    phoneNumber: "फ़ोन नंबर",
    phoneHint: "स्पेस और डैश चलेगा। हम साफ किया हुआ नंबर सहेजेंगे।",
    zone: "क्षेत्र",
    channels: "चैनल",
    subscribe: "सदस्यता लें",
    subscriptionSaved: "सदस्यता",
    selectZoneError: "सदस्यता लेने से पहले क्षेत्र चुनें।",
    selectChannelError: "कम से कम एक चैनल चुनें।",
    phoneError: "अंतरराष्ट्रीय प्रारूप में सही फ़ोन नंबर दर्ज करें, जैसे +919876543210।",
    saveFailed: "सदस्यता सहेजी नहीं जा सकी।",
    offlineShellTitle: "ऑफ़लाइन-तैयार आधार",
    offlineShellBody: "बुनियादी manifest शामिल है ताकि ऐप आगे चलकर offline मोड के लिए तैयार रहे।",
    settingsTitle: "भाषा सेटिंग",
    settingsBody: "स्क्रीन और अलर्ट भाषा तुरंत बदलें।",
    appLanguage: "ऐप भाषा",
    alertLanguage: "अलर्ट भाषा",
    languageChipLabel: "भाषा",
    subtitleFormat: (district) => district,
    subscriptionStatusFormat: (status) => `सदस्यता ${status} है।`,
    forecastLabel: (hours) => `+${hours}घं`,
    distanceFormat: (km) => `${km} किमी`,
    minutesFormat: (minutes) => `${minutes} मिनट`,
    numberedStep: (index, step) => `${index}. ${step}`,
    riskTitle: {
      SAFE: "सामान्य निगरानी",
      WATCH: "सतर्क रहें",
      DANGER: "अभी कार्रवाई करें"
    },
    warningText: {
      SAFE: "अभी स्थिति सामान्य है।",
      WATCH: "स्थिति बिगड़ सकती है। ढलान और कटाव वाले किनारों से दूर रहें।",
      DANGER: "खतरा अभी है या बहुत जल्द हो सकता है। सूचीबद्ध आश्रय की ओर बढ़ें।"
    },
    actionText: {
      SAFE: "मार्ग और आश्रय की जानकारी पास रखें।",
      WATCH: "जरूरी सामान तैयार रखें और जल्दी निकलने के लिए तैयार रहें।",
      DANGER: "तुरंत सुरक्षित स्थान की ओर निकलें।"
    },
    riskLabel: {
      SAFE: "सुरक्षित",
      WATCH: "सावधान",
      DANGER: "खतरा"
    }
  },
  en: {
    chooseLanguageTitle: "Choose your language",
    chooseLanguageSubtitle: "Choose your language",
    chooseLanguageHint: "You can change it instantly later.",
    appEyebrow: "BHURAKSHAN Citizen View",
    appIntro:
      "Check your landslide risk, next-two-hour forecast, nearby shelter, and evacuation route guidance.",
    loading: "Loading citizen interface...",
    zoneSectionLabel: "Area selection",
    currentArea: "Current area",
    noZones: "No zones are available right now.",
    yourCurrentZone: "Your current zone",
    riskScore: "Risk score",
    rainfall: "Rainfall",
    lastUpdated: "Last updated",
    nextTwoHours: "Next two hours",
    nextTwoHoursSubtitle: "Check whether conditions are steady or moving toward danger.",
    nowLabel: "Now",
    nearbyShelter: "Nearby shelter",
    shelterUnavailable: "Shelter details are not available yet.",
    distance: "Distance",
    capacity: "Capacity",
    evacuationRoute: "Evacuation route",
    routeUnavailable: "Route details are not available yet.",
    locationGuidance: "Live location guidance",
    locationGuidanceSubtitle: "Use your current location to see the safest direction, distance, and shelter.",
    locationUnavailable: "Live guidance will appear here after location access is granted.",
    locationButton: "Use my location",
    locatingLabel: "Getting your location...",
    currentPosition: "Current position",
    nearestDanger: "Nearest danger direction",
    recommendedSafeZone: "Recommended safe zone",
    fallbackDirection: "Offline fallback",
    nearbySafeZones: "Nearby safe zones",
    noNearbySafeZones: "No nearby safe-zone list is available right now.",
    uphillLabel: "Uphill",
    downhillLabel: "Downhill",
    reportSection: "Send a ground report",
    reportSubtitle: "Upload a photo or short video to help officials verify current conditions.",
    reportDescriptionLabel: "What is happening? (optional)",
    reportFileLabel: "Choose photo or video",
    reportSubmit: "Submit report",
    reportStatusLabel: "Report status",
    reportStatusUnavailable: "No recent report status is available yet.",
    reportNeedLocation: "Location is required before submitting a report.",
    emergencyContacts: "Emergency contacts",
    alertSubscription: "Alert subscription",
    alertSubscriptionSubtitle: "Subscribe for SMS or WhatsApp warnings for your area.",
    phoneNumber: "Phone number",
    phoneHint: "Spaces and dashes are okay. We will save the cleaned number.",
    zone: "Zone",
    channels: "Channels",
    subscribe: "Subscribe",
    subscriptionSaved: "Subscription",
    selectZoneError: "Please select a zone before subscribing.",
    selectChannelError: "Select at least one channel.",
    phoneError: "Enter a valid phone number in international format, like +919876543210.",
    saveFailed: "Subscription save failed.",
    offlineShellTitle: "Offline-ready shell",
    offlineShellBody:
      "A basic manifest is included so the app is ready for later installability and offline polish work.",
    settingsTitle: "Language settings",
    settingsBody: "Change screen and alert language instantly.",
    appLanguage: "App language",
    alertLanguage: "Alert language",
    languageChipLabel: "Language",
    subtitleFormat: (district) => district,
    subscriptionStatusFormat: (status) => `Subscription is ${status}.`,
    forecastLabel: (hours) => `+${hours}h`,
    distanceFormat: (km) => `${km} km`,
    minutesFormat: (minutes) => `${minutes} min`,
    numberedStep: (index, step) => `${index}. ${step}`,
    riskTitle: {
      SAFE: "Normal monitoring",
      WATCH: "Stay alert",
      DANGER: "Take action now"
    },
    warningText: {
      SAFE: "Conditions are stable right now.",
      WATCH: "Conditions may worsen. Stay away from steep or damaged slope edges.",
      DANGER: "Danger is current or expected very soon. Move toward the listed shelter."
    },
    actionText: {
      SAFE: "Keep route and shelter details handy.",
      WATCH: "Keep essentials ready and be prepared to move quickly.",
      DANGER: "Move toward safety immediately."
    },
    riskLabel: {
      SAFE: "Safe",
      WATCH: "Watch",
      DANGER: "Danger"
    }
  },
  "hi-x-garhwali": {
    chooseLanguageTitle: "अपणी भासा चुनो",
    chooseLanguageSubtitle: "Choose your language",
    chooseLanguageHint: "तुम बाद मा तुर्त बदल सकदा।",
    appEyebrow: "BHURAKSHAN Citizen View",
    appIntro:
      "अपण क्षेत्र को भ्यूड़ खतरो, आगै दुई घंटा को अंदाज, नजदीकी सुरक्षित जगह अर निकासी रस्तो देखो।",
    loading: "नागरिक ऐप लोड होणु छ...",
    zoneSectionLabel: "क्षेत्र चुनो",
    currentArea: "हाल को क्षेत्र",
    noZones: "अभी कोई क्षेत्र उपलब्ध नि छ।",
    yourCurrentZone: "तुमरो हाल को क्षेत्र",
    riskScore: "खतरो स्कोर",
    rainfall: "बारिस",
    lastUpdated: "आखिरी अपडेट",
    nextTwoHours: "आगै दुई घंटा",
    nextTwoHoursSubtitle: "देखो स्थिति ठहरी छ या खतरा कू बढ़ी रै।",
    nowLabel: "अब",
    nearbyShelter: "नजदीकी सुरक्षित जगह",
    shelterUnavailable: "सुरक्षित जगह की जानकारी अभी नि छ।",
    distance: "दूरी",
    capacity: "क्षमता",
    evacuationRoute: "निकासी रस्तो",
    routeUnavailable: "रास्तो की जानकारी अभी नि छ।",
    locationGuidance: "लाइव लोकेशन मार्गदर्शन",
    locationGuidanceSubtitle: "अपणी लोकेशन स सुरक्षित जगह को रुख, दूरी अर ठौर देखो।",
    locationUnavailable: "लोकेशन अनुमति मिलण बाद यहाँ लाइव मार्गदर्शन दिखुला।",
    locationButton: "मेरी लोकेशन ल्या",
    locatingLabel: "लोकेशन ल्याणी जांदी छ...",
    currentPosition: "हाल की स्थिति",
    nearestDanger: "नजदीकी खतरो को रुख",
    recommendedSafeZone: "सुझाई सुरक्षित जगह",
    fallbackDirection: "ऑफलाइन दिशा",
    nearbySafeZones: "नजदीकी सुरक्षित जगह",
    noNearbySafeZones: "अभी नजदीकी सुरक्षित जगह की सूची नि छ।",
    uphillLabel: "ऊपर की ओर",
    downhillLabel: "नीचे की ओर",
    reportSection: "जमीनी रिपोर्ट भेजो",
    reportSubtitle: "फोटो या छोटो वीडियो भेजिके अफसरनक मौजूदा हालत बतावा।",
    reportDescriptionLabel: "क्या हुणु छ? (वैकल्पिक)",
    reportFileLabel: "फोटो या वीडियो चुनो",
    reportSubmit: "रिपोर्ट भेजो",
    reportStatusLabel: "रिपोर्ट स्थिति",
    reportStatusUnavailable: "अभी कोई हाल की रिपोर्ट स्थिति नि छ।",
    reportNeedLocation: "रिपोर्ट भेजण तै पहले लोकेशन चाही।",
    emergencyContacts: "आपतकाल संपर्क",
    alertSubscription: "अलर्ट सदस्यता",
    alertSubscriptionSubtitle: "अपण क्षेत्र खातर SMS या WhatsApp चेतावनी लेवा।",
    phoneNumber: "फोन नंबर",
    phoneHint: "स्पेस अर डैश ठीक छन। हम साफ नंबर बचौंला।",
    zone: "क्षेत्र",
    channels: "चैनल",
    subscribe: "सदस्यता लेवा",
    subscriptionSaved: "सदस्यता",
    selectZoneError: "सदस्यता लैण तै पहले क्षेत्र चुनो।",
    selectChannelError: "कम से कम एक चैनल चुनो।",
    phoneError: "सही अंतरराष्ट्रीय फोन नंबर भरो, जैसे +919876543210।",
    saveFailed: "सदस्यता बची नि।",
    offlineShellTitle: "ऑफलाइन तयार आधार",
    offlineShellBody: "बुनियादी manifest शामिल छ ताकि ऐप आगै offline काम खातर तैयार रै।",
    settingsTitle: "भासा सेटिंग",
    settingsBody: "स्क्रीन अर अलर्ट भासा तुर्त बदलो।",
    appLanguage: "ऐप भासा",
    alertLanguage: "अलर्ट भासा",
    languageChipLabel: "भासा",
    subtitleFormat: (district) => district,
    subscriptionStatusFormat: (status) => `सदस्यता ${status} छ।`,
    forecastLabel: (hours) => `+${hours} घं`,
    distanceFormat: (km) => `${km} किमी`,
    minutesFormat: (minutes) => `${minutes} मिन्ट`,
    numberedStep: (index, step) => `${index}. ${step}`,
    riskTitle: {
      SAFE: "भलो",
      WATCH: "होशियार रवा",
      DANGER: "अबी करणा पड़ल"
    },
    warningText: {
      SAFE: "अभी हालत भली छन।",
      WATCH: "हालत बिगड़ सकदी। ढलान अर टूटे किनारा स दूर रवा।",
      DANGER: "खतरो अभी छ या जळ्दी आ सक्दो। सूचीबद्ध सुरक्षित जगह जै जावा।"
    },
    actionText: {
      SAFE: "रास्तो अर सुरक्षित जगह की जानकारी याद राखो।",
      WATCH: "जरूरी सामान तयार राखो अर जळ्दी चलण खातर तैयार रवा।",
      DANGER: "अभी सुरक्षित जगह की ओर निकळा।"
    },
    riskLabel: {
      SAFE: "भलो",
      WATCH: "होशियार",
      DANGER: "खतरो"
    }
  },
  "hi-x-kumaoni": {
    chooseLanguageTitle: "अपणी भासा चुनो",
    chooseLanguageSubtitle: "Choose your language",
    chooseLanguageHint: "तुम ऐलै पछिल बदली सकौ।",
    appEyebrow: "BHURAKSHAN Citizen View",
    appIntro:
      "अपण क्षेत्र को पहाड़ धांस खतरा, आगिल दुई घंटा को अनुमान, नजिकै सुरक्षित ठौर और निकासी बाटो देखो।",
    loading: "नागरिक ऐप लोड हो रहो...",
    zoneSectionLabel: "क्षेत्र चुनो",
    currentArea: "हाल को क्षेत्र",
    noZones: "अभी कोई क्षेत्र उपलब्ध नै छ।",
    yourCurrentZone: "तुमर हाल को क्षेत्र",
    riskScore: "खतरा स्कोर",
    rainfall: "बारिस",
    lastUpdated: "अंतिम अपडेट",
    nextTwoHours: "आगिल दुई घंटा",
    nextTwoHoursSubtitle: "देखो कि हालत ठहरि छ या खतरा की ओर बढ़ि रही छ।",
    nowLabel: "अब",
    nearbyShelter: "नजिकै सुरक्षित ठौर",
    shelterUnavailable: "सुरक्षित ठौर की जानकारी अभी नै छ।",
    distance: "दूरी",
    capacity: "क्षमता",
    evacuationRoute: "निकासी बाटो",
    routeUnavailable: "बाटो की जानकारी अभी नै छ।",
    locationGuidance: "लाइव लोकेशन मार्गदर्शन",
    locationGuidanceSubtitle: "अपणी लोकेशन त सुरक्षित ठौर की दिशा, दूरी और ठौर देखो।",
    locationUnavailable: "लोकेशन अनुमति मिलल बाद यहाँ लाइव मार्गदर्शन दिखल।",
    locationButton: "मेरी लोकेशन ल्यो",
    locatingLabel: "लोकेशन ली जा रही छ...",
    currentPosition: "हाल की स्थिति",
    nearestDanger: "नजिक खतरा की दिशा",
    recommendedSafeZone: "सुझायो सुरक्षित ठौर",
    fallbackDirection: "ऑफलाइन दिशा",
    nearbySafeZones: "नजिकै सुरक्षित ठौर",
    noNearbySafeZones: "अभी नजिकै सुरक्षित ठौर की सूची नै छ।",
    uphillLabel: "ऊपर की ओर",
    downhillLabel: "नीचे की ओर",
    reportSection: "जमीनी रिपोर्ट भेजो",
    reportSubtitle: "फोटो या छोटो वीडियो भेजिके अफसरनक मौजूदा हालत बताओ।",
    reportDescriptionLabel: "क्या हो रहो छ? (वैकल्पिक)",
    reportFileLabel: "फोटो या वीडियो चुनो",
    reportSubmit: "रिपोर्ट भेजो",
    reportStatusLabel: "रिपोर्ट स्थिति",
    reportStatusUnavailable: "अभी कोई हाल की रिपोर्ट स्थिति नै छ।",
    reportNeedLocation: "रिपोर्ट भेजण स पहले लोकेशन चाही।",
    emergencyContacts: "आपतकाल संपर्क",
    alertSubscription: "अलर्ट सदस्यता",
    alertSubscriptionSubtitle: "अपण क्षेत्र खातिर SMS या WhatsApp चेतावनी पाओ।",
    phoneNumber: "फोन नंबर",
    phoneHint: "स्पेस और डैश ठीक छन। हम साफ नंबर बचौला।",
    zone: "क्षेत्र",
    channels: "चैनल",
    subscribe: "सदस्यता ल्यो",
    subscriptionSaved: "सदस्यता",
    selectZoneError: "सदस्यता लैण स पहले क्षेत्र चुनो।",
    selectChannelError: "कम से कम एक चैनल चुनो।",
    phoneError: "सही अंतरराष्ट्रीय फोन नंबर भरो, जैसे +919876543210।",
    saveFailed: "सदस्यता बची नै।",
    offlineShellTitle: "ऑफलाइन तैयार आधार",
    offlineShellBody: "बुनियादी manifest शामिल छ ताकि ऐप आगिल offline काम खातिर तैयार रहो।",
    settingsTitle: "भासा सेटिंग",
    settingsBody: "स्क्रीन और अलर्ट भासा तुरंत बदलो।",
    appLanguage: "ऐप भासा",
    alertLanguage: "अलर्ट भासा",
    languageChipLabel: "भासा",
    subtitleFormat: (district) => district,
    subscriptionStatusFormat: (status) => `सदस्यता ${status} छ।`,
    forecastLabel: (hours) => `+${hours} घं`,
    distanceFormat: (km) => `${km} किमी`,
    minutesFormat: (minutes) => `${minutes} मिनट`,
    numberedStep: (index, step) => `${index}. ${step}`,
    riskTitle: {
      SAFE: "ठीक",
      WATCH: "सावधान",
      DANGER: "अब करणा पड़ल"
    },
    warningText: {
      SAFE: "अभी हालत ठीक छ।",
      WATCH: "हालत बिगड़ सकछ। ढलान और टूटे किनारा त दूर रहो।",
      DANGER: "खतरा अभी छ या जल्द आ सकछ। सूचीबद्ध सुरक्षित ठौर जाओ।"
    },
    actionText: {
      SAFE: "बाटो और सुरक्षित ठौर की जानकारी पास राखो।",
      WATCH: "जरूरी सामान तयार राखो और जल्दी चलण खातिर तैयार रहो।",
      DANGER: "तुरंत सुरक्षित ठौर की तरफ निकलो।"
    },
    riskLabel: {
      SAFE: "ठीक",
      WATCH: "सावधान",
      DANGER: "खतरा"
    }
  }
};

export function getDefaultLanguageForDistrict(districtId: string): LanguageCode {
  return districtDefaultLanguage[districtId] ?? "hi";
}

export function getLanguageMeta(language: LanguageCode) {
  return languageOptions.find((item) => item.code === language) ?? languageOptions[0];
}

export function getCitizenDictionary(language: LanguageCode) {
  return dictionaries[language];
}

export function getRiskDisplayLabel(level: RiskLevel, language: LanguageCode) {
  return dictionaries[language].riskLabel[level];
}

export function formatLocalizedTimestamp(value: string, language: LanguageCode) {
  const locale =
    language === "en"
      ? "en-IN"
      : language === "hi"
        ? "hi-IN"
        : "hi-IN";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
