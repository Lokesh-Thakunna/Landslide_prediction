import type { RiskLevel } from "../types";

export type DashboardLanguage = "en" | "hi";

export const dashboardLanguageOptions: Array<{
  code: DashboardLanguage;
  label: string;
  nativeLabel: string;
}> = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिंदी" }
];

type DashboardDictionary = {
  language: string;
  english: string;
  hindi: string;
  headerEyebrow: string;
  headerTitle: string;
  headerSubtitle: string;
  monitoredZones: string;
  activeHotspots: string;
  dispatchesToday: string;
  rainfallOverlay: string;
  live: string;
  filters: string;
  filtersSubtitle: string;
  district: string;
  allDistricts: string;
  riskLevel: string;
  allLevels: string;
  manualAlertTitle: string;
  manualAlertSubtitle: string;
  zone: string;
  reason: string;
    channels: string;
    testRecipient: string;
    testRecipientHint: string;
    testRecipientLanguage: string;
    queueManualAlert: string;
    alertQueued: (
      alertId: string,
      channels: string[],
      deliveryStatus: string,
      recipientCount?: number
    ) => string;
  multilingualPreview: string;
  multilingualPreviewSubtitle: string;
  subscribers: string;
  loadPreviewFailed: string;
  smsBlocked: string;
  withinSmsLimit: string;
  exceedsSmsLimit: string;
  notesPrefix: string;
  alertDispatchLog: string;
  alertDispatchSubtitle: string;
  level: string;
  channel: string;
  status: string;
  recipients: string;
  timestamp: string;
  hotspotWatchlist: string;
  hotspotSubtitle: string;
  scoreLabel: string;
  nextHorizonStatus: string;
  trendLabel: Record<"rising" | "steady" | "falling", string>;
  riskLabel: Record<RiskLevel, string>;
};

const dictionaries: Record<DashboardLanguage, DashboardDictionary> = {
  en: {
    language: "Language",
    english: "English",
    hindi: "Hindi",
    headerEyebrow: "BHURAKSHAN Operator Dashboard",
    headerTitle: "Forecast-aware landslide monitoring for district response teams",
    headerSubtitle:
      "Monitor current zone risk, rising hotspots, rainfall pressure, and manual dispatch activity from one surface.",
    monitoredZones: "Monitored zones",
    activeHotspots: "Active hotspots",
    dispatchesToday: "Dispatches today",
    rainfallOverlay: "Rainfall overlay",
    live: "Live",
    filters: "Filters",
    filtersSubtitle: "Narrow the map and operations feed by district and current risk state.",
    district: "District",
    allDistricts: "All districts",
    riskLevel: "Risk level",
    allLevels: "All levels",
    manualAlertTitle: "Manual alert trigger",
    manualAlertSubtitle:
      "Operator override for field-confirmed instability or precautionary action.",
    zone: "Zone",
    reason: "Reason",
    channels: "Channels",
    testRecipient: "Test recipient (optional)",
    testRecipientHint:
      "If you enter one verified number here, the dashboard sends only to that number instead of all zone subscribers.",
    testRecipientLanguage: "Recipient alert language",
    queueManualAlert: "Queue manual alert",
    alertQueued: (alertId, channels, deliveryStatus, recipientCount) =>
      `Alert ${alertId} finished with status ${deliveryStatus} for ${channels.join(" and ")}${typeof recipientCount === "number" ? ` (${recipientCount} recipients)` : ""}.`,
    multilingualPreview: "Multilingual preview",
    multilingualPreviewSubtitle:
      "Review the exact SMS and WhatsApp copy by language group before dispatch.",
    subscribers: "subscribers",
    loadPreviewFailed: "Failed to load alert preview.",
    smsBlocked:
      "SMS dispatch is blocked because one or more language variants exceed the 160 character limit.",
    withinSmsLimit: "Within 160-character SMS limit",
    exceedsSmsLimit: "Exceeds 160-character SMS limit",
    notesPrefix: "Notes",
    alertDispatchLog: "Alert dispatch log",
    alertDispatchSubtitle:
      "Channel, status, recipients, and timestamps for recent alert activity.",
    level: "Level",
    channel: "Channel",
    status: "Status",
    recipients: "Recipients",
    timestamp: "Timestamp",
    hotspotWatchlist: "Hotspot watchlist",
    hotspotSubtitle:
      "Highest risk or fastest-rising zones based on current and forecast state.",
    scoreLabel: "Score",
    nextHorizonStatus: "Next horizon status",
    trendLabel: {
      rising: "Rising",
      steady: "Steady",
      falling: "Falling"
    },
    riskLabel: {
      SAFE: "Safe",
      WATCH: "Watch",
      DANGER: "Danger"
    }
  },
  hi: {
    language: "भाषा",
    english: "English",
    hindi: "हिंदी",
    headerEyebrow: "BHURAKSHAN ऑपरेटर डैशबोर्ड",
    headerTitle: "जिला प्रतिक्रिया टीमों के लिए पूर्वानुमान-आधारित भूस्खलन निगरानी",
    headerSubtitle:
      "एक ही स्क्रीन पर वर्तमान क्षेत्र जोखिम, उभरते हॉटस्पॉट, वर्षा दबाव और मैनुअल अलर्ट गतिविधि देखें।",
    monitoredZones: "निगरानी क्षेत्र",
    activeHotspots: "सक्रिय हॉटस्पॉट",
    dispatchesToday: "आज के डिस्पैच",
    rainfallOverlay: "वर्षा लेयर",
    live: "लाइव",
    filters: "फ़िल्टर",
    filtersSubtitle: "जिला और वर्तमान जोखिम स्तर के आधार पर मानचित्र और संचालन फ़ीड सीमित करें।",
    district: "जिला",
    allDistricts: "सभी जिले",
    riskLevel: "जोखिम स्तर",
    allLevels: "सभी स्तर",
    manualAlertTitle: "मैनुअल अलर्ट ट्रिगर",
    manualAlertSubtitle: "मैदान से पुष्टि हुई अस्थिरता या एहतियाती कार्रवाई के लिए ऑपरेटर ओवरराइड।",
    zone: "क्षेत्र",
    reason: "कारण",
    channels: "चैनल",
    testRecipient: "टेस्ट प्राप्तकर्ता (वैकल्पिक)",
    testRecipientHint:
      "यदि यहाँ एक सत्यापित नंबर भरते हैं, तो डैशबोर्ड केवल उसी नंबर पर भेजेगा, पूरे ज़ोन पर नहीं।",
    testRecipientLanguage: "प्राप्तकर्ता अलर्ट भाषा",
    queueManualAlert: "मैनुअल अलर्ट कतार में डालें",
    alertQueued: (alertId, channels, deliveryStatus, recipientCount) =>
      `अलर्ट ${alertId} ${channels.join(" और ")} के लिए ${deliveryStatus} स्थिति के साथ पूरा हुआ${typeof recipientCount === "number" ? ` (${recipientCount} प्राप्तकर्ता)` : ""}।`,
    multilingualPreview: "बहुभाषी प्रीव्यू",
    multilingualPreviewSubtitle:
      "भेजने से पहले हर भाषा समूह के लिए सटीक SMS और WhatsApp संदेश देख लें।",
    subscribers: "सदस्य",
    loadPreviewFailed: "अलर्ट प्रीव्यू लोड नहीं हो सका।",
    smsBlocked:
      "SMS भेजना रोका गया है क्योंकि एक या अधिक भाषा संस्करण 160 अक्षर सीमा से बड़े हैं।",
    withinSmsLimit: "160-अक्षर SMS सीमा के भीतर",
    exceedsSmsLimit: "160-अक्षर SMS सीमा से अधिक",
    notesPrefix: "नोट्स",
    alertDispatchLog: "अलर्ट डिस्पैच लॉग",
    alertDispatchSubtitle: "हालिया अलर्ट गतिविधि के चैनल, स्थिति, प्राप्तकर्ता और समय देखें।",
    level: "स्तर",
    channel: "चैनल",
    status: "स्थिति",
    recipients: "प्राप्तकर्ता",
    timestamp: "समय",
    hotspotWatchlist: "हॉटस्पॉट वॉचलिस्ट",
    hotspotSubtitle: "वर्तमान और पूर्वानुमान स्थिति के आधार पर सबसे जोखिमपूर्ण या तेज़ी से बढ़ते क्षेत्र।",
    scoreLabel: "स्कोर",
    nextHorizonStatus: "अगले चरण की स्थिति",
    trendLabel: {
      rising: "बढ़ता हुआ",
      steady: "स्थिर",
      falling: "घटता हुआ"
    },
    riskLabel: {
      SAFE: "सुरक्षित",
      WATCH: "सावधान",
      DANGER: "खतरा"
    }
  }
};

export function getDashboardDictionary(language: DashboardLanguage) {
  return dictionaries[language];
}

export function getDashboardRiskLabel(language: DashboardLanguage, riskLevel: RiskLevel) {
  return dictionaries[language].riskLabel[riskLevel];
}
