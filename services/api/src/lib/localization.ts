import type {
  AlertPreview,
  LanguageCode,
  LocalizedAlertMessage,
  RiskLevel,
  SafeShelter,
  Subscription,
  ZoneStatic
} from "@bhurakshan/contracts";

type LanguageDefinition = {
  code: LanguageCode;
  label: string;
  shortLabel: string;
};

const LANGUAGE_DEFINITIONS: LanguageDefinition[] = [
  { code: "hi", label: "Hindi", shortLabel: "हिं" },
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "hi-x-garhwali", label: "Garhwali", shortLabel: "गढ़" },
  { code: "hi-x-kumaoni", label: "Kumaoni", shortLabel: "कुम" }
];

const DISTRICT_DEFAULT_LANGUAGE: Record<string, LanguageCode> = {
  "dist-chamoli": "hi-x-garhwali",
  "dist-rudraprayag": "hi-x-garhwali",
  "dist-tehri-garhwal": "hi-x-garhwali",
  "dist-uttarkashi": "hi-x-garhwali",
  "dist-pithoragarh": "hi-x-kumaoni",
  "dist-almora": "hi-x-kumaoni",
  "dist-bageshwar": "hi-x-kumaoni",
  "dist-champawat": "hi-x-kumaoni",
  "dist-nainital": "hi-x-kumaoni",
  "dist-dehradun": "hi",
  "dist-haridwar": "hi"
};

const DISTRICT_HELPLINE: Record<string, string> = {
  "dist-chamoli": "01372-251437",
  "dist-rudraprayag": "01364-233727",
  "dist-uttarkashi": "01374-222722"
};

const SMS_TEMPLATES: Record<LanguageCode, Record<RiskLevel, (input: TemplateInput) => string>> = {
  hi: {
    SAFE: ({ zoneName }) => `✅ ${zoneName} | खतरा समाप्त। आप सुरक्षित रूप से घर लौट सकते हैं।`,
    WATCH: ({ zoneName, safeZone, helpline }) =>
      `⚠️ भूस्खलन चेतावनी | ${zoneName} | सावधान - जरूरत पड़ने पर ${safeZone} जाएँ। हेल्पलाइन: ${helpline}`,
    DANGER: ({ zoneName, safeZone, helpline }) =>
      `🔴 भूस्खलन खतरा | ${zoneName} | तुरंत ${safeZone} जाएँ। हेल्पलाइन: ${helpline}`
  },
  en: {
    SAFE: ({ zoneName }) => `✅ ${zoneName} | Danger passed. You may return home safely.`,
    WATCH: ({ zoneName, safeZone, helpline }) =>
      `⚠️ Landslide Watch | ${zoneName} | Stay ready to move to ${safeZone}. Helpline: ${helpline}`,
    DANGER: ({ zoneName, safeZone, helpline }) =>
      `🔴 Landslide Warning | ${zoneName} | Move to ${safeZone} immediately. Helpline: ${helpline}`
  },
  "hi-x-garhwali": {
    SAFE: ({ zoneName }) => `✅ ${zoneName} | खतरो गिनो। तुम घर वापिस जै सकदा।`,
    WATCH: ({ zoneName, safeZone, helpline }) =>
      `⚠️ भ्यूड़ खबरदारी | ${zoneName} | तयार रवा, जरूरत पड़ी त ${safeZone} जावा। हेल्पलाइन: ${helpline}`,
    DANGER: ({ zoneName, safeZone, helpline }) =>
      `🔴 भ्यूड़ खतरो | ${zoneName} | जळ्दी ${safeZone} जावा। हेल्पलाइन: ${helpline}`
  },
  "hi-x-kumaoni": {
    SAFE: ({ zoneName }) => `✅ ${zoneName} | खतरा गयो। अब घर वापिस जा सकदो।`,
    WATCH: ({ zoneName, safeZone, helpline }) =>
      `⚠️ पहाड़ धांस खबरदारी | ${zoneName} | तयार रहो, जरूरत पड़ि त ${safeZone} जाओ। हेल्पलाइन: ${helpline}`,
    DANGER: ({ zoneName, safeZone, helpline }) =>
      `🔴 पहाड़ धांस खतरा | ${zoneName} | जल्दी ${safeZone} जाओ। हेल्पलाइन: ${helpline}`
  }
};

const WHATSAPP_TEMPLATES: Record<
  LanguageCode,
  Record<RiskLevel, (input: TemplateInput) => string>
> = {
  hi: {
    SAFE: ({ zoneName, safeZone, helpline }) =>
      `✅ *सुरक्षा अपडेट - ${zoneName}*\n\nस्थिति: खतरा समाप्त।\nसुरक्षित स्थान: ${safeZone}\nहेल्पलाइन: ${helpline}\n\n- HH-LEWS`,
    WATCH: ({ zoneName, safeZone, helpline }) =>
      `⚠️ *भूस्खलन सावधानी - ${zoneName}*\n\nखतरा स्तर: सावधान\n• जरूरी सामान तैयार रखें\n• जरूरत पड़ने पर ${safeZone} जाएँ\n• ढलान और कटाव वाले हिस्सों से दूर रहें\n\nहेल्पलाइन: ${helpline}\n- HH-LEWS`,
    DANGER: ({ zoneName, safeZone, helpline }) =>
      `🔴 *भूस्खलन चेतावनी - ${zoneName}*\n\nखतरा स्तर: तुरंत निकलें\n• अभी घर छोड़ें\n• ${safeZone} जाएँ\n• ढलान और टूटे रास्तों से दूर रहें\n\nहेल्पलाइन: ${helpline}\n- HH-LEWS`
  },
  en: {
    SAFE: ({ zoneName, safeZone, helpline }) =>
      `✅ *Safety update - ${zoneName}*\n\nStatus: danger passed.\nSafe shelter: ${safeZone}\nHelpline: ${helpline}\n\n- HH-LEWS`,
    WATCH: ({ zoneName, safeZone, helpline }) =>
      `⚠️ *Landslide watch - ${zoneName}*\n\nRisk level: caution\n• Keep essentials ready\n• Be prepared to move to ${safeZone}\n• Stay away from steep or damaged slopes\n\nHelpline: ${helpline}\n- HH-LEWS`,
    DANGER: ({ zoneName, safeZone, helpline }) =>
      `🔴 *Landslide warning - ${zoneName}*\n\nRisk level: move now\n• Leave immediately\n• Go to ${safeZone}\n• Avoid steep slopes and damaged roads\n\nHelpline: ${helpline}\n- HH-LEWS`
  },
  "hi-x-garhwali": {
    SAFE: ({ zoneName, safeZone, helpline }) =>
      `✅ *सुरक्षा खबर - ${zoneName}*\n\nस्थिति: खतरो गिनो।\nसुरक्षित जगह: ${safeZone}\nहेल्पलाइन: ${helpline}\n\n- HH-LEWS`,
    WATCH: ({ zoneName, safeZone, helpline }) =>
      `⚠️ *भ्यूड़ खबरदारी - ${zoneName}*\n\nखतरो स्तर: होशियार रवा\n• जरूरी सामान तयार रवा\n• जरूरत पड़ी त ${safeZone} जावा\n• ढलान अर टूटे रास्ता स दूर रवा\n\nहेल्पलाइन: ${helpline}\n- HH-LEWS`,
    DANGER: ({ zoneName, safeZone, helpline }) =>
      `🔴 *भ्यूड़ चेतावनी - ${zoneName}*\n\nखतरो स्तर: अबी निकळा\n• अबी घर छोड़ा\n• ${safeZone} जावा\n• ढलान अर टूटे रास्ता स दूर रवा\n\nहेल्पलाइन: ${helpline}\n- HH-LEWS`
  },
  "hi-x-kumaoni": {
    SAFE: ({ zoneName, safeZone, helpline }) =>
      `✅ *सुरक्षा खबर - ${zoneName}*\n\nस्थिति: खतरा गयो।\nसुरक्षित स्थान: ${safeZone}\nहेल्पलाइन: ${helpline}\n\n- HH-LEWS`,
    WATCH: ({ zoneName, safeZone, helpline }) =>
      `⚠️ *पहाड़ धांस खबरदारी - ${zoneName}*\n\nखतरा स्तर: सावधान\n• जरूरी सामान तयार राखो\n• जरूरत पड़ि त ${safeZone} जाओ\n• ढलान और टूटे रास्ता त दूर रहो\n\nहेल्पलाइन: ${helpline}\n- HH-LEWS`,
    DANGER: ({ zoneName, safeZone, helpline }) =>
      `🔴 *पहाड़ धांस चेतावनी - ${zoneName}*\n\nखतरा स्तर: अभी निकलो\n• अभी घर छोड़ो\n• ${safeZone} जाओ\n• ढलान और टूटे रास्ता त दूर रहो\n\nहेल्पलाइन: ${helpline}\n- HH-LEWS`
  }
};

type TemplateInput = {
  zoneName: string;
  safeZone: string;
  helpline: string;
};

const FALLBACK_LANGUAGE: LanguageCode = "hi";
const SMS_CHARACTER_LIMIT = 160;

export function getLanguageDefinitions() {
  return LANGUAGE_DEFINITIONS;
}

export function getLanguageLabel(language: LanguageCode) {
  return LANGUAGE_DEFINITIONS.find((item) => item.code === language)?.label ?? "Hindi";
}

export function getDefaultLanguageForDistrict(districtId: string): LanguageCode {
  return DISTRICT_DEFAULT_LANGUAGE[districtId] ?? FALLBACK_LANGUAGE;
}

export function getDistrictHelpline(districtId: string) {
  return DISTRICT_HELPLINE[districtId] ?? "1070";
}

export function normalizeLanguage(language: string | undefined, districtId: string): LanguageCode {
  if (
    language === "hi" ||
    language === "en" ||
    language === "hi-x-garhwali" ||
    language === "hi-x-kumaoni"
  ) {
    return language;
  }

  return getDefaultLanguageForDistrict(districtId);
}

function countSubscribersByLanguage(subscribers: Subscription[], districtId: string) {
  return LANGUAGE_DEFINITIONS.map((definition) => ({
    language: definition.code,
    subscriberCount: subscribers.filter((subscriber) => {
      const language = normalizeLanguage(subscriber.alertLanguage, districtId);
      return language === definition.code;
    }).length
  }));
}

export function buildLocalizedAlertPreview(params: {
  zone: ZoneStatic;
  shelter: SafeShelter | undefined;
  riskLevel: RiskLevel;
  subscribers: Subscription[];
}): AlertPreview {
  const { zone, shelter, riskLevel, subscribers } = params;
  const safeZone = shelter?.name ?? "nearest shelter";
  const helpline = getDistrictHelpline(zone.districtId);
  const counts = countSubscribersByLanguage(subscribers, zone.districtId);
  const input = {
    zoneName: zone.name,
    safeZone,
    helpline
  };

  const localizedMessages: LocalizedAlertMessage[] = counts.map(({ language, subscriberCount }) => {
    const smsBody = SMS_TEMPLATES[language][riskLevel](input);

    return {
      language,
      languageLabel: getLanguageLabel(language),
      subscriberCount,
      smsBody,
      whatsappBody: WHATSAPP_TEMPLATES[language][riskLevel](input),
      smsCharacterCount: getSmsCharacterCount(smsBody),
      smsCharacterLimit: SMS_CHARACTER_LIMIT,
      smsWithinLimit: getSmsCharacterCount(smsBody) <= SMS_CHARACTER_LIMIT
    };
  });

  const overLimitMessages = localizedMessages.filter((message) => !message.smsWithinLimit);

  const notes = [
    "Garhwali and Kumaoni alert copy still needs native-speaker approval before production use."
  ];

  if (overLimitMessages.length) {
    notes.push(
      `SMS length check failed for ${overLimitMessages
        .map((message) => `${message.languageLabel} (${message.smsCharacterCount}/${message.smsCharacterLimit})`)
        .join(", ")}.`
    );
  } else {
    notes.push("SMS length check passed for all language variants.");
  }

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    riskLevel,
    totalSubscribers: subscribers.length,
    localizedMessages,
    notes
  };
}

function getSmsCharacterCount(value: string) {
  return Array.from(value).length;
}
