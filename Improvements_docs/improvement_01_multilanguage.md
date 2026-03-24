# HH-LEWS — Improvement Spec: Multilanguage Support
## English · Hindi · Garhwali · Kumaoni

**Version:** 2.0 | **Type:** Feature Improvement Specification
**Scope:** Citizen PWA + Alert Messages (SMS & WhatsApp) + Official Dashboard
**Priority:** High — directly improves last-mile reach for Uttarakhand communities

---

## 1. Why This Matters

The current system sends all messages and shows all screens in Hindi only. This leaves out a large part of the people we are actually trying to protect.

Uttarakhand has three main language communities:

- **Garhwali** is what people speak daily across Chamoli, Rudraprayag, Tehri, and Uttarkashi. Around 2.5 million speakers. Many villagers — especially older residents — understand Hindi but feel far more comfortable acting on instructions given in Garhwali. A warning in Hindi might be understood intellectually. A warning in Garhwali will be acted on immediately.

- **Kumaoni** is the daily language for people in Pithoragarh, Almora, Bageshwar, Champawat, and Nainital. Around 2 million speakers. Same situation — Hindi is understood but Kumaoni creates trust and urgency.

- **English** is needed for the Official Dashboard used by DDMOs, NDMA analysts, and international NGO partners who work with the system.

When a person receives a warning in a language they are not fully comfortable with, they hesitate. They re-read it. They ask someone nearby. In a landslide, that hesitation can be the difference between getting out and not getting out. This improvement removes that hesitation.

---

## 2. Languages Supported

| Language | Where it is spoken | Used in | Default for |
|----------|-------------------|---------|-------------|
| Hindi | All of Uttarakhand | Citizen PWA, SMS, WhatsApp, Dashboard | All districts (current default) |
| Garhwali | Chamoli, Rudraprayag, Tehri, Uttarkashi | Citizen PWA, SMS, WhatsApp | Garhwal division districts |
| Kumaoni | Pithoragarh, Almora, Bageshwar, Champawat | Citizen PWA, SMS, WhatsApp | Kumaon division districts |
| English | Urban areas, officials, NGOs | Official Dashboard, API | Dashboard (official users) |

> The system automatically suggests the most likely language based on which district a person's zone belongs to. A person in Chamoli will see Garhwali suggested first. A person in Pithoragarh will see Kumaoni first. They can always override this.

---

## 3. How Language Selection Works for Citizens

### 3.1 First Time Opening the App

The very first screen a person sees when they open the Citizen PWA for the first time is a language selection screen — before anything else loads.

```
┌──────────────────────────────────────────┐
│                                          │
│   अपनी भाषा चुनें                        │
│   Choose your language                   │
│                                          │
│   ┌──────────────┐  ┌──────────────────┐ │
│   │   हिंदी      │  │    English       │ │
│   │   Hindi      │  │                  │ │
│   └──────────────┘  └──────────────────┘ │
│                                          │
│   ┌──────────────┐  ┌──────────────────┐ │
│   │  गढ़वाली     │  │   कुमाऊँनी       │ │
│   │  Garhwali    │  │   Kumaoni        │ │
│   └──────────────┘  └──────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

- Each button shows the language in its own script and also in English, so no one gets stuck.
- The choice is saved on the phone and remembered every time the app opens.
- If someone picks the wrong language by mistake, they can change it at any time — the app does not need to restart.

### 3.2 Changing Language While the App Is Running

Language switching happens live. Every single piece of text on every screen changes the moment a person taps a different language. There is no loading screen, no restart, no re-login. The user taps the language they want and the screen updates instantly in front of them.

The language switcher is available in two places at all times:

**Place 1 — A small language chip at the top of every screen**

```
┌────────────────────────────────────────┐
│  HH-LEWS                  [ गढ़ ▾ ]   │  ← tap to change language instantly
│                                        │
│  🔴 अबी निकला!                         │  ← already showing in Garhwali
│  ...                                   │
└────────────────────────────────────────┘
```

Tapping this chip opens a small dropdown with the four language options. The person taps one and the entire screen switches. This is always one tap away — the person never has to go into any menu.

**Place 2 — Settings screen** (gear icon, top right)

```
┌────────────────────────────────────────┐
│  Settings                              │
│                                        │
│  Language / भाषा                       │
│                                        │
│  ● हिंदी          ○ गढ़वाली            │
│  ○ कुमाऊँनी       ○ English            │
│                                        │
│  Tap any option — screen changes now   │
└────────────────────────────────────────┘
```

The currently selected language has a filled circle. Tapping any other option switches immediately — no save button, no confirm step.

### 3.3 Language Is Remembered Permanently

Once a person picks a language, the app remembers it every time they open it — even without internet, even after the phone is restarted. They never have to select it again unless they want to change it.

When a person subscribes to alerts with their phone number, their chosen language is also saved against their number. Their SMS and WhatsApp alerts will arrive in that same language automatically.

---

## 4. Alert Messages in All Four Languages

When an alert fires, each person receives the message in their own saved language — not a single Hindi message sent to everyone. The system looks at what language each subscriber has chosen and sends the right version to each person. A DDMO does not need to write four separate messages — this all happens automatically.

### 4.1 SMS Alert Messages

**Hindi (हिंदी)**

| Situation | Message |
|-----------|---------|
| Danger | ⚠️ भूस्खलन खतरा \| {zone_name} \| खतरा — तुरंत {safe_zone} जाएं। हेल्पलाइन: {helpline} |
| Evacuate Now | 🔴 भूस्खलन खतरा \| {zone_name} \| अभी निकलें! — तुरंत {safe_zone} जाएं। हेल्पलाइन: {helpline} |
| All Clear | ✅ {zone_name} — खतरा समाप्त। आप सुरक्षित रूप से घर लौट सकते हैं। |

**Garhwali (गढ़वाली)**

| Situation | Message |
|-----------|---------|
| Danger | ⚠️ भ्यूड़ खतरो \| {zone_name} \| खतरो — जल्दी {safe_zone} जावा। हेल्पलाइन: {helpline} |
| Evacuate Now | 🔴 भ्यूड़ खतरो \| {zone_name} \| अबी निकला! — जल्दी {safe_zone} जावा। हेल्पलाइन: {helpline} |
| All Clear | ✅ {zone_name} — खतरो गिनो। तुम घर वापस जै सकदा। |

**Kumaoni (कुमाऊँनी)**

| Situation | Message |
|-----------|---------|
| Danger | ⚠️ पहाड़ धाँस खतरा \| {zone_name} \| खतरा — जल्दी {safe_zone} जाओ। हेल्पलाइन: {helpline} |
| Evacuate Now | 🔴 पहाड़ धाँस \| {zone_name} \| अभी निकलो! — जल्दी {safe_zone} जाओ। हेल्पलाइन: {helpline} |
| All Clear | ✅ {zone_name} — खतरा गयो। अब घर वापस जा सकदो। |

**English**

| Situation | Message |
|-----------|---------|
| Danger | ⚠️ Landslide Warning \| {zone_name} \| DANGER — Move to {safe_zone} immediately. Helpline: {helpline} |
| Evacuate Now | 🔴 Landslide Warning \| {zone_name} \| EVACUATE NOW — Move to {safe_zone} immediately. Helpline: {helpline} |
| All Clear | ✅ {zone_name} — Danger passed. You may return home safely. |

> `{zone_name}`, `{safe_zone}`, and `{helpline}` are automatically filled in by the system for each zone. The DDMO never needs to type these manually.

> All messages must stay under 160 characters so they arrive as a single SMS — never split into two parts.

> **The Garhwali and Kumaoni messages above are drafts and must be reviewed and approved by native speakers from those regions before being used in a real alert.**

### 4.2 WhatsApp Alert Messages

WhatsApp allows slightly richer formatting — bold text and bullet points. Each language gets the same structure but written in its own language.

**Example — Garhwali, Evacuate Now:**

```
🔴 *भ्यूड़ चेतावनी — गौचर, चमोली*

खतरो स्तर: *अबी निकला!*

📍 *तुमका क्या करणा च:*
• अबी घर छोड़ा
• ग्राम पंचायत भवन जावा (1.2 km)
• पहाड़ की ढलान से दूर रावा

📞 SDRF: 1070
📞 जनपद कंट्रोल: 01372-251437

— DDMO चमोली (HH-LEWS)
```

**Example — Kumaoni, Evacuate Now:**

```
🔴 *पहाड़ धाँस चेतावनी — जोशीमठ, चमोली*

खतरा: *अभी निकलो!*

📍 *तुमका क्या करणो च:*
• अभी घर छोड़ो
• ग्राम पंचायत भवन जाओ (1.2 km)
• पहाड़ की ढलान ते दूर रावो

📞 SDRF: 1070
📞 जिला नियंत्रण: 01372-251437

— DDMO चमोली (HH-LEWS)
```

---

## 5. What Every Screen Looks Like in Each Language

When a person switches language, every screen updates immediately. Nothing is left in a different language.

### Key Words Translated Across All Four Languages

| Screen text | Hindi | Garhwali | Kumaoni | English |
|-------------|-------|----------|---------|---------|
| Safe (risk level) | सुरक्षित | भलो | ठीक | Safe |
| Caution (risk level) | सावधान | होशियार रावा | सावधान | Caution |
| Danger (risk level) | खतरा | खतरो | खतरा | Danger |
| Evacuate Now (risk level) | अभी निकलें! | अबी निकला! | अभी निकलो! | Evacuate Now! |
| View Safe Zone button | सुरक्षित स्थान देखें | सुरक्षित जगह देखा | सुरक्षित स्थान देखो | View Safe Zone |
| Get Alerts button | अलर्ट पाएं | अलर्ट लेवा | अलर्ट पाओ | Get Alerts |
| Call SDRF | SDRF बुलाएं | SDRF बुलावा | SDRF बुलाओ | Call SDRF |
| Offline notice | ऑफलाइन — पुराना डेटा | ऑफलाइन — पुरानो डेटो | ऑफलाइन — पुराना डेटा | Offline — Cached data |
| Last updated | अंतिम अपडेट | आखिरी अपडेट | अंतिम अपडेट | Last updated |
| Loading | लोड हो रहा है... | लोड होणु च... | लोड हो रहो... | Loading... |

### App Language vs Alert Language

These two are independent:

- **App language** — what the person sees on their screen.
- **Alert language** — what language their SMS and WhatsApp messages arrive in.

When a person picks a language in the app, both are set to that language by default. Most people will never need to think about this. But a technical user who wants their app in English while receiving alerts in Hindi can do this through the settings screen.

---

## 6. How the Official Dashboard Handles Languages

The Official Dashboard (used by DDMOs and NDMA officials) is in English by default. A simple Hindi / English toggle in the top navigation bar lets an official switch between the two at any time.

Garhwali and Kumaoni are not available on the Official Dashboard. These are complex technical interfaces and translating every label and data table into regional languages is a large separate effort that is out of scope for now.

**The most important dashboard language feature** is the alert preview. When a DDMO is about to send a manual alert, they see a preview of exactly what will be sent to each language group before they confirm:

```
┌────────────────────────────────────────────────────────────┐
│  Manual Alert Preview — Gauchar Zone                       │
│                                                            │
│  Hindi (312 subscribers):                                  │
│  "⚠️ भूस्खलन खतरा | गौचर | खतरा — तुरंत ग्राम पंचायत..."  │
│                                                            │
│  Garhwali (189 subscribers):                               │
│  "⚠️ भ्यूड़ खतरो | गौचर | खतरो — जल्दी ग्राम पंचायत..."   │
│                                                            │
│  Kumaoni (12 subscribers):                                 │
│  "⚠️ पहाड़ धाँस खतरा | गौचर | खतरा — जल्दी ग्राम पंचायत..."│
│                                                            │
│  English (8 subscribers):                                  │
│  "⚠️ Landslide Warning | Gauchar | DANGER — Move to..."    │
│                                                            │
│  Total: 521 people                                         │
│                                                            │
│  [ Cancel ]                         [ Send / भेजें ]      │
└────────────────────────────────────────────────────────────┘
```

The DDMO sees exactly what each group will receive. No surprises.

---

## 7. How District Language Defaults Work

Each district is pre-set with the most likely language for that region. When a new person opens the app for the first time, their district's default language is already selected and highlighted. They just confirm it or change it if they want something different.

| District | Pre-selected language on first open |
|----------|-------------------------------------|
| Chamoli | Garhwali |
| Rudraprayag | Garhwali |
| Tehri Garhwal | Garhwali |
| Uttarkashi | Garhwali |
| Pithoragarh | Kumaoni |
| Almora | Kumaoni |
| Bageshwar | Kumaoni |
| Dehradun | Hindi |
| Haridwar | Hindi |
| Nainital | Kumaoni |

The system figures out the district automatically based on which zone the person selects when they subscribe to alerts. The person never has to pick a district separately — they just choose their village or area.

---

## 8. What Does Not Change Across Languages

Some things stay the same regardless of which language is selected:

- Emergency phone numbers like 1070 (SDRF) are always shown in regular numerals — they are not translated or changed.
- The risk color system (green, yellow, orange, red) is the same in all languages — colors communicate across any language.
- Zone names and safe zone names (like "Joshimath" or "Gram Panchayat Bhawan") are kept as-is — they are place names and should not be translated.
- The HH-LEWS name and logo stay in English in all languages.

---

## 9. Translation Quality Rules

The biggest risk with adding new languages is bad translations that confuse or mislead people during an emergency. These rules are not negotiable:

**No machine translation for alert messages.** Google Translate is not acceptable for the words that tell someone their life is in danger. These messages must be written and reviewed by a real person who speaks the language.

**Garhwali and Kumaoni must be reviewed by a native speaker from those districts.** Not just any Hindi speaker — someone who actually uses these languages in daily life.

**Test with real people before going live.** Show the messages to five people from the target community and ask: "What does this message tell you to do?" If they give the wrong answer or hesitate, the message needs to be rewritten.

**Every SMS must be tested for length.** Each language variant must be checked to confirm it fits within 160 characters. Garhwali and Kumaoni words can sometimes be longer than their Hindi equivalents.

---

## 10. What Needs to Be Done

| Task | Notes |
|------|-------|
| Create translated text files for all 4 languages | Alert messages are the most critical — start there |
| Add language choice to the phone subscription step | When someone signs up for alerts, ask for their language |
| Live language switching in the app — no restart needed | Tapping a language updates every screen on the spot |
| Language chip always visible on the home screen | One tap to switch, never buried in menus |
| Alert dispatch automatically sends each person their language version | Backend reads saved language, no manual effort from DDMO |
| Dashboard alert preview shows all language versions | Before DDMO confirms a manual alert |
| Native speaker review of Garhwali translations | Must happen before going live in Garhwal districts |
| Native speaker review of Kumaoni translations | Must happen before going live in Kumaon districts |
| Check all SMS variants are under 160 characters | Automated length check — reject if too long |

---

## 11. Before Going Live — Checklist

- [ ] All four risk levels translated across all four languages for every app screen
- [ ] All alert SMS templates reviewed and approved by a native Garhwali speaker
- [ ] All alert SMS templates reviewed and approved by a native Kumaoni speaker
- [ ] Every SMS variant tested and confirmed under 160 characters
- [ ] Language switches tested on a real Android phone — all screens update instantly, no reload
- [ ] Language choice saved and restored when the phone is restarted
- [ ] Language choice works correctly when offline — does not reset without internet
- [ ] District-based default language works correctly when app opens for the first time
- [ ] Dashboard alert preview correctly shows how many people receive each language version
- [ ] At least three people from a Garhwali-speaking village have tested the alerts end-to-end
- [ ] At least three people from a Kumaoni-speaking village have tested the alerts end-to-end

---

*HH-LEWS Improvement Spec: Multilanguage — v2.0*
