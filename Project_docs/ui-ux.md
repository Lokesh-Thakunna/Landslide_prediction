# HH-LEWS — UI/UX Design Document

**Document Version:** 1.0.0  
**Last Updated:** 2025-06-14  
**Status:** Active  
**Owner:** HH-LEWS UX Team  
**Scope:** Citizen PWA + Official Dashboard + Alert Messaging

---

## Table of Contents

1. [UX Philosophy](#1-ux-philosophy)
2. [User Personas](#2-user-personas)
3. [Risk Color System](#3-risk-color-system)
4. [Information Architecture](#4-information-architecture)
5. [Citizen PWA — Mobile-First Design](#5-citizen-pwa--mobile-first-design)
6. [Official Dashboard Design](#6-official-dashboard-design)
7. [Alert Message UX](#7-alert-message-ux)
8. [Hindi Localization Strategy](#8-hindi-localization-strategy)
9. [Accessibility Considerations](#9-accessibility-considerations)
10. [Wireframe Descriptions](#10-wireframe-descriptions)
11. [Interaction States](#11-interaction-states)
12. [Error Handling UI](#12-error-handling-ui)
13. [Design Tokens & System](#13-design-tokens--system)

---

## 1. UX Philosophy

### 1.1 Core Principles

**Zero Jargon.** Every label, button, and message must be understood by a 45-year-old farmer in a Chamoli village who owns a Rs. 6,000 Android phone and has never used a government app. Terms like "landslide susceptibility index," "piezometric pressure," or "prediction confidence interval" have no place in any citizen-facing interface. Every concept is translated to a direct, local-language action statement.

**Action Over Information.** In a disaster context, the interface's job is not to inform — it is to move people. Every HIGH and CRITICAL risk screen must lead with a single, unmissable action. The answer to "what do I do?" must be visible without scrolling, without menus, without thought.

**Trust Through Simplicity.** Complex dashboards, data tables, and probability percentages erode trust with low-literacy users. A clean, bold, single-color risk indicator conveys authority. Clutter conveys confusion. The citizen PWA has maximum three primary actions on any screen.

**Offline is Not an Edge Case.** Landslides occur during heavy rainfall. Heavy rainfall degrades cellular connectivity. The citizen PWA must be fully functional on cached data. Offline state is a first-class design scenario, not a fallback message.

**Channel Agnosticism.** Not every user opens the PWA. Many receive only SMS or WhatsApp. The UX of the alert message itself — its structure, language, and call-to-action — is as important as any visual interface. The 160-character SMS is a design artifact.

**Respect for Context.** Users may be in low-light conditions, outdoors in rain, using one hand, in emotional distress, or sharing a phone with family members. Font sizes are large. Touch targets are generous (minimum 48×48dp). Color is always supplemented by text and iconography (never color alone).

### 1.2 Design Anti-Patterns (Explicitly Prohibited)

- Modal dialogs requiring dismissal before seeing risk status.
- Risk level expressed only as a number or percentage (e.g., "Risk: 72%").
- Login required to view current risk level for anonymous citizens.
- Auto-playing audio/video on any screen.
- Forms with more than 3 fields for any citizen-facing action.
- English-only labels anywhere in the citizen PWA.
- Passive voice in alert messages ("It has been determined that...").
- Vague calls to action ("Please take necessary precautions").

---

## 2. User Personas

### Persona 1: Kamla Devi

**Role:** Citizen / Vulnerable Resident  
**Age:** 52 | **Location:** Gauchar village, Chamoli district  
**Device:** Samsung Galaxy A04e (Android 12, 4G)  
**Literacy:** Hindi literate, no English  
**Digital Comfort:** Uses WhatsApp for family groups; rarely uses apps beyond calls and WhatsApp; does not know how to install apps from Play Store  
**Phone Sharing:** Shares phone with husband and two children  

**Goals:**
- Know if her home is safe during monsoon nights.
- Receive a call or message if she needs to leave.
- Find out where the safe place is.

**Frustrations:**
- Government warnings come to the village pradhan, not directly to her.
- She doesn't understand weather news on TV.
- Previous system required downloading an app she couldn't find.

**Design Implication:** Alert must arrive on WhatsApp (already installed). PWA must work when sent as a link — no installation required to view risk. All text in Hindi. Safe zone must be described in local landmark terms ("ग्राम पंचायत भवन की ओर जाएं"), not GPS coordinates.

---

### Persona 2: Rajeev Negi

**Role:** District Disaster Management Officer (DDMO)  
**Age:** 38 | **Location:** Chamoli district headquarters  
**Device:** Government-issued laptop (Windows), personal Android phone  
**Literacy:** Hindi and English, comfortable with government software  
**Digital Comfort:** Uses NIC portals, email, WhatsApp; moderately familiar with maps  

**Goals:**
- Monitor all risk zones across his district from one screen.
- Verify if an ML alert is credible before mobilizing SDRF.
- Issue a district-wide broadcast quickly during a confirmed event.
- Document his actions for accountability.

**Frustrations:**
- Currently receives alerts through a WhatsApp group — no structure.
- No way to know if a sensor or model is malfunctioning vs. genuine alert.
- Manual broadcast requires calling each block officer individually.

**Design Implication:** Dashboard must show sensor health prominently alongside risk level. Manual broadcast must be ≤ 4 clicks. Alert log must be exportable as PDF for incident reports.

---

### Persona 3: Ananya Singh

**Role:** NDMA Analyst  
**Age:** 29 | **Location:** New Delhi  
**Device:** MacBook Pro, dual monitors, high-speed internet  
**Digital Comfort:** High; comfortable with dashboards, GIS tools, APIs  

**Goals:**
- See aggregated risk trends across all monitored zones.
- Identify systemic failure patterns (false positives, sensor clusters going offline).
- Generate reports for policy briefings.

**Frustrations:**
- No single source of truth for Himalayan landslide alerts.
- Cannot correlate ML predictions with actual reported incidents.
- Has no visibility into which districts are actively using the system.

**Design Implication:** National overview map, trend charts, system health metrics. Data export (CSV, PDF). API access for NDMA's own analytics tools.

---

### Persona 4: Mohan Prasad

**Role:** Village Pradhan  
**Age:** 61 | **Location:** Joshimath area, Chamoli  
**Device:** Feature phone (basic calls/SMS) + occasional use of community smartphone  
**Literacy:** Hindi, limited reading in low light  

**Goals:**
- Receive a voice call with the warning so he can act as local responder.
- Relay the warning to village residents verbally.

**Design Implication:** IVR voice call is the primary channel. Message must be short, authoritative, and action-first. Callback number for confirmation.

---

## 3. Risk Color System

### 3.1 Four-Level Risk Scale

The risk color system is the most critical design decision in the entire product. It must:
- Be understood without reading any text.
- Convey urgency gradation that matches emotional response to actual risk.
- Work on low-quality screens with color distortion.
- Not rely on color alone (supplement with icon + text + border).

| Level | Score | Color | Hex | Hindi Label | Icon | Action |
|-------|-------|-------|-----|-------------|------|--------|
| LOW | 0.00–0.39 | Green | `#22C55E` | **सुरक्षित** (Safe) | ✅ Shield | None required |
| MODERATE | 0.40–0.64 | Amber | `#F59E0B` | **सावधान** (Caution) | ⚠️ Warning | Stay alert, monitor |
| HIGH | 0.65–0.84 | Orange-Red | `#EF4444` | **खतरा** (Danger) | 🚨 Alert | Prepare to evacuate |
| CRITICAL | 0.85–1.00 | Deep Red + Pulse | `#7F1D1D` | **अभी निकलें!** (Leave Now!) | 🔴 Flashing | Immediate evacuation |

### 3.2 Color Accessibility

- All foreground text on color backgrounds meets WCAG AA (4.5:1 minimum contrast ratio).
- LOW (Green `#22C55E`) uses dark text `#14532D` on light backgrounds; white on dark.
- MODERATE (Amber) uses dark text `#78350F`.
- HIGH and CRITICAL use white text only.
- CRITICAL level adds a CSS pulse animation on the indicator dot (not the entire screen) to draw attention without being seizure-inducing.
- Color-blind safe: green/amber/red pattern is supplemented by icon shapes (shield, triangle, circle) ensuring deuteranopia accessibility.

### 3.3 Risk Indicator Component Anatomy

```
┌─────────────────────────────────────────┐
│  [ICON]  [HINDI LABEL]                  │  ← Primary indicator strip
│          [English sublabel]             │     Full width, 72px height
│  ● ● ● ●  [4 dots: filled = level]     │  ← Level depth indicator
└─────────────────────────────────────────┘
```

The four dots provide a secondary, non-color encoding of risk depth — 1 filled dot = LOW, 2 = MODERATE, 3 = HIGH, 4 = CRITICAL.

---

## 4. Information Architecture

### 4.1 Citizen PWA Navigation

```
PWA Root
├── Home Screen
│   ├── Risk Indicator (current level for user location)
│   ├── "अभी क्या करें?" (What to do now?) → Action Card
│   └── Emergency Contacts (always visible)
├── Safe Zones Screen
│   ├── Nearest safe zone (name + distance)
│   ├── Map view (Leaflet, cached tiles)
│   └── Walking directions (landmark-based text)
├── My Area Screen
│   ├── Location selector (village picker, not GPS-dependent)
│   ├── Alert history (last 7 days)
│   └── Subscribe/update phone number
└── Settings
    ├── Language toggle (Hindi / English)
    ├── Notification preferences
    └── About / How it works
```

### 4.2 Official Dashboard Navigation

```
Dashboard Root (JWT Protected)
├── Overview Map (default landing)
│   ├── All zones risk heat map
│   ├── Active alerts ticker
│   └── System health bar
├── Zone Detail
│   ├── Risk score + trend (24h sparkline)
│   ├── Sensor readings
│   ├── ML prediction breakdown
│   └── Issue/suppress alert controls
├── Alert Management
│   ├── Active alerts
│   ├── Alert history + filters
│   └── Manual broadcast form
├── Subscriber Management
│   ├── Zone-subscriber mapping
│   └── Bulk import (CSV)
├── Reports
│   ├── Event timeline export
│   └── Alert delivery statistics
└── Admin (ADMIN role only)
    ├── Zone configuration
    ├── Model version management
    └── User access management
```

---

## 5. Citizen PWA — Mobile-First Design

### 5.1 Layout Principles

- **Single-column layout** throughout. No multi-column grids on mobile.
- **Minimum touch target:** 48 × 48 dp for all interactive elements.
- **Font sizes:** Body text 16sp minimum. Risk label 28sp. Action button text 18sp.
- **Viewport:** Optimized for 360×800 (entry-level Android). Tested at 320×568 (minimum supported).
- **Thumb zone design:** Primary actions (evacuate button, emergency call) placed in bottom 40% of screen — reachable with one thumb.
- **No horizontal scrolling** on any screen.

### 5.2 Home Screen Design

The home screen has exactly three visual zones:

**Zone A — Risk Indicator (top 35% of viewport)**  
Full-width colored strip with risk level icon, Hindi label, and level dots. This is the first thing the user sees. At CRITICAL level, the border pulses. Background color of this zone reflects risk color.

**Zone B — Action Card (middle 35%)**  
White card with a single, large-text action instruction in Hindi. Examples:
- LOW: "आपका क्षेत्र अभी सुरक्षित है। सामान्य गतिविधियाँ जारी रखें।"
- MODERATE: "सावधान रहें। अपना सामान तैयार रखें।"
- HIGH: "खतरे की संभावना है। तुरंत सुरक्षित स्थान की तरफ बढ़ें।"
- CRITICAL: "**अभी घर छोड़ें।** सुरक्षित स्थान की ओर जाएं।" (Bold, 24sp, red)

At HIGH/CRITICAL, this card also shows a single prominent button: "सुरक्षित स्थान देखें →" (View Safe Zone).

**Zone C — Emergency Strip (bottom 30%, always visible)**  
Horizontal strip with three icon buttons: 📞 SDRF, 🏥 Hospital, 📋 DDMO. Tap to call. Labels in Hindi. Always present regardless of risk level.

### 5.3 Safe Zones Screen

- Lists nearest 1–3 safe zones with:
  - Name in Hindi (e.g., "ग्राम पंचायत भवन")
  - Distance in km
  - Walking time estimate
  - Elevation relative to current location (higher = safer framing)
- Mini-map showing zone location (Leaflet, offline-capable cached tiles).
- Landmark-based text directions: "मुख्य सड़क से दाएं मुड़ें, मंदिर के पास वाले रास्ते से ऊपर जाएं।"

### 5.4 PWA Installation Prompt

- Triggered after 2 visits or after viewing a HIGH/CRITICAL alert.
- Banner (not modal): "इसे अपने फ़ोन पर सेव करें — बिना इंटरनेट के भी काम करेगा।"
- Single-tap install using Web App Manifest + beforeinstallprompt event.
- Fallback instructions for iOS (share button → Add to Home Screen).

---

## 6. Official Dashboard Design

### 6.1 Layout

The dashboard uses a three-panel layout on desktop (min-width 1024px):

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | District Name | User Name | Role | Logout        │
│  SYSTEM HEALTH: ● API ● ML ● DB ● SMS  [all green/red dots]     │
├──────────┬───────────────────────────────────┬───────────────────┤
│          │                                   │                   │
│  LEFT    │        MAP PANEL                  │   RIGHT PANEL     │
│  NAV     │   (Leaflet.js full-height)        │   (Zone Detail /  │
│          │   Risk heat map overlay           │    Alert Feed)    │
│  Links   │   Zone markers (click to open)    │                   │
│  with    │   Active alert badges             │   Risk score      │
│  alert   │                                   │   Sensor status   │
│  counts  │                                   │   ML confidence   │
│          │                                   │   Alert controls  │
└──────────┴───────────────────────────────────┴───────────────────┘
│  FOOTER: Last refresh timestamp | Active alerts count            │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Map Panel

- **Leaflet.js** with OpenStreetMap tiles (cached).
- Zones rendered as filled polygons with opacity 0.6, colored by risk level.
- Zone centroid markers with risk badge (color + level abbreviation).
- Clicking a zone opens the right panel with zone detail.
- Active alerts shown as animated pulse rings on zone marker.
- Sensor icons at sensor locations; red icon = offline sensor.
- **Mini-legend** in bottom-right corner (always visible, not collapsible).

### 6.3 Right Panel — Zone Detail

When a zone is selected:
- Zone name, block, district.
- Current risk score (large number, colored) + sparkline chart (24-hour trend, Recharts).
- Current risk level badge.
- Last updated timestamp.
- Sensor readings table: Sensor ID | Saturation % | Vibration | Battery | Status.
- ML prediction detail: top 3 contributing features with bar chart (collapsible).
- **Action Bar:**
  - [🚨 Trigger Alert] — opens broadcast modal.
  - [🔕 Suppress Alerts] — with reason dropdown (maintenance, false positive, etc.) + duration.
  - [📋 View History] — opens alert history filtered to this zone.

### 6.4 Alert History Table

Columns: DateTime | Zone | Risk Level | Channel | Recipients | Delivered | Status | Triggered By (ML / Manual)  
Sortable by all columns. Filterable by date range, zone, and risk level.  
Export button: CSV and PDF.

### 6.5 Manual Broadcast Modal

```
┌─────────────────────────────────────────┐
│  मैनुअल अलर्ट भेजें                    │
│  Zone: [Dropdown]                       │
│  Template: [Dropdown — Hindi templates] │
│  Custom message: [Textarea, Hindi]      │
│  Channels: ☑ SMS  ☑ WhatsApp  ☐ IVR   │
│  Preview: [Shows formatted SMS text]    │
│  Recipients: 342 subscribers            │
│  [Cancel]              [भेजें — Send]  │
└─────────────────────────────────────────┘
```

Confirm step shows recipient count and estimated delivery time. Requires clicking "Send" twice (double-confirm) to prevent accidental broadcast.

### 6.6 Responsive Behavior

- **1024px+:** Three-panel layout as above.
- **768–1023px (tablet):** Left nav collapses to icon rail. Map full width. Right panel as slide-over drawer.
- **Below 768px:** Not officially supported for full dashboard. Redirect to a mobile-simplified "active alerts" view for field officials.

---

## 7. Alert Message UX

### 7.1 SMS Message Design (160-character constraint)

Template structure:
```
[🔴/⚠️] भूस्खलन खतरा | [ZONE_NAME] | [RISK_LEVEL]
तुरंत [SAFE_ZONE] जाएं।
हेल्पलाइन: [NUMBER]
-DDMO [DISTRICT]
```

**CRITICAL example:**
```
🔴 भूस्खलन खतरा | गौचर क्षेत्र | अभी निकलें!
तुरंत ग्राम पंचायत भवन जाएं।
हेल्पलाइन: 1070
-DDMO चमोली
```

Character count: ~140. Fits in single SMS.

### 7.2 WhatsApp Message Design

WhatsApp allows richer formatting. Structure:

```
🔴 *भूस्खलन चेतावनी — गौचर, चमोली*

⚠️ खतरा स्तर: *अभी निकलें (CRITICAL)*

📍 *आपको क्या करना है:*
• अभी घर छोड़ें
• ग्राम पंचायत भवन की ओर जाएं (1.2 km)
• पहाड़ की ढलान से दूर रहें

📞 *आपातकालीन नंबर:*
• SDRF: 1070
• जिला नियंत्रण: 01372-251437

_यह संदेश HH-LEWS द्वारा भेजा गया — DDMO चमोली_
```

### 7.3 IVR Voice Script

Hindi audio script (played on call):
> "यह चमोली जिला आपदा प्रबंधन कार्यालय से एक आपातकालीन संदेश है। गौचर क्षेत्र में भूस्खलन का खतरा है। कृपया तुरंत अपना घर छोड़ें और ग्राम पंचायत भवन की ओर जाएं। दोहराने के लिए एक दबाएं। SDRF से बात करने के लिए दो दबाएं।"

IVR calls include a callback option (press 2) to speak to SDRF dispatch.

---

## 8. Hindi Localization Strategy

### 8.1 Translation Approach

- **Professional translation, not machine translation.** All UI strings are translated by a Hindi-native speaker with disaster management communication context.
- **Local terminology first.** "भूस्खलन" (bhooskhalan) over transliterated "landslide."
- **Direct speech register.** Hindi labels use informal plural ("आप") for respectful but accessible tone.
- **Avoid Sanskritized Hindi** that is not used in Garhwali/Kumaoni everyday speech.

### 8.2 i18n Implementation

- React-i18next library for PWA and dashboard.
- Translation files: `public/locales/hi/translation.json` and `en/translation.json`.
- All UI strings externalized — no hardcoded text in components.
- Language persisted in localStorage; default detected from browser `navigator.language`.
- Hindi as default for the citizen PWA; English as default for the official dashboard with Hindi toggle.

### 8.3 Key Translation Table (Sample)

| Key | Hindi | English |
|-----|-------|---------|
| `risk.low` | सुरक्षित | Safe |
| `risk.moderate` | सावधान | Caution |
| `risk.high` | खतरा | Danger |
| `risk.critical` | अभी निकलें! | Evacuate Now! |
| `action.view_safe_zone` | सुरक्षित स्थान देखें | View Safe Zone |
| `emergency.sdrf` | आपदा राहत बल | SDRF |
| `alert.received` | चेतावनी मिली | Alert Received |
| `offline.notice` | आप ऑफलाइन हैं — पुरानी जानकारी दिख रही है | You are offline — showing cached data |

### 8.4 Number & Date Formatting

- Numbers in Devanagari digits for citizen PWA (१, २, ३...) — optional toggle.
- Distances: "१.२ किमी" format.
- Times: 12-hour IST format with AM/PM translated (पूर्वाह्न/अपराह्न).

---

## 9. Accessibility Considerations

### 9.1 Visual

- Minimum font size 16px (PWA), 14px (dashboard).
- All color usage supplemented by icon + text label.
- Focus indicators visible on all interactive elements (3px solid outline).
- No information conveyed by color alone.
- Night mode supported via CSS media query `prefers-color-scheme: dark` — critical for nighttime emergency use.

### 9.2 Motor

- Touch targets: minimum 48×48 dp.
- Swipe gestures have tap alternatives.
- No time-limited interactions.
- Emergency call buttons are large (min 64×64 dp), placed in thumb-reachable zones.

### 9.3 Cognitive

- Maximum reading level: Grade 5 Hindi equivalent.
- Single-task screens — one primary action per screen.
- Consistent navigation patterns across the app.
- Alert message read aloud on arrival via Web Speech API (if supported) at CRITICAL level.

### 9.4 Connectivity

- Service Worker caches all critical assets and last-known risk data.
- Offline banner displayed when connectivity lost: banner, not full-screen overlay.
- Map tiles pre-cached for the user's selected zone.

---

## 10. Wireframe Descriptions

### WF-01: Citizen PWA — Home (CRITICAL State)

```
┌────────────────────────────────┐
│ ████████████████████████████  │  ← Deep red full-width header bar
│ 🔴  अभी निकलें!   ● ● ● ●   │  ← Risk indicator, 4 dots filled
│ ████████████████████████████  │
│                                │
│ ┌────────────────────────────┐ │
│ │ ⚠️  भूस्खलन का तत्काल खतरा │ │  ← Action card
│ │                            │ │
│ │ अपना घर अभी छोड़ें और      │ │
│ │ सुरक्षित स्थान पर जाएं।    │ │
│ │                            │ │
│ │ ┌──────────────────────┐   │ │
│ │ │  सुरक्षित स्थान देखें →│   │ │  ← Primary CTA button
│ │ └──────────────────────┘   │ │
│ └────────────────────────────┘ │
│                                │
│ ┌──────┐  ┌──────┐  ┌──────┐  │
│ │ 📞   │  │  🏥  │  │ 📋   │  │  ← Emergency strip
│ │ SDRF │  │अस्पताल│  │ DDMO │  │
│ └──────┘  └──────┘  └──────┘  │
│                                │
│ अंतिम अपडेट: 2 मिनट पहले       │  ← Timestamp footer
└────────────────────────────────┘
```

### WF-02: Citizen PWA — Safe Zones Screen

```
┌────────────────────────────────┐
│ ← वापस        सुरक्षित स्थान  │
├────────────────────────────────┤
│ ┌──────────────────────────────┐│
│ │  [MAP — Leaflet, cached]     ││
│ │  📍 Your location            ││
│ │  🏛️ Safe Zone 1              ││
│ │  🏫 Safe Zone 2              ││
│ └──────────────────────────────┘│
├────────────────────────────────┤
│ 🏛️ ग्राम पंचायत भवन            │
│    1.2 km · ~15 मिनट पैदल       │
│    [मार्ग देखें →]              │
├────────────────────────────────┤
│ 🏫 सरकारी प्राथमिक विद्यालय    │
│    2.4 km · ~28 मिनट पैदल       │
│    [मार्ग देखें →]              │
└────────────────────────────────┘
```

### WF-03: Official Dashboard — Map View

```
┌─────┬──────────────────────────────┬──────────────────┐
│ 📊  │  🗺️  RISK MAP — CHAMOLI      │  Zone: गौचर      │
│ Map │  ┌────────────────────────┐  │  Risk: 🔴 0.87   │
│ ─── │  │ [Leaflet Map]          │  │  CRITICAL        │
│ 🚨  │  │                        │  │                  │
│ Zones│  │  🔴 गौचर (CRITICAL)   │  │  Soil: 89%       │
│ ─── │  │  🟠 पोखरी (HIGH)       │  │  Vibr: 2.1 m/s²  │
│ 📋  │  │  🟡 थराली (MODERATE)   │  │  Rain: 42mm/hr   │
│ Hist│  │  🟢 कर्णप्रयाग (LOW)   │  │                  │
│ ─── │  │                        │  │  [🚨 Alert]      │
│ 📤  │  └────────────────────────┘  │  [🔕 Suppress]   │
│ Send│                              │  [📋 History]    │
└─────┴──────────────────────────────┴──────────────────┘
```

---

## 11. Interaction States

### 11.1 Risk Indicator States

| State | Visual Behavior |
|-------|----------------|
| Loading | Skeleton pulse animation on indicator strip |
| LOW | Static green strip, shield icon |
| MODERATE | Static amber strip, warning triangle icon |
| HIGH | Static orange-red strip, alert icon |
| CRITICAL | Deep red strip + pulsing border on dot indicator |
| Offline | Grey strip + offline icon + "cached" badge |
| Error | Red outline, error icon, retry link |

### 11.2 Alert Trigger Button (Dashboard)

| State | Visual |
|-------|--------|
| Default | Red outlined button with bell icon |
| Hover | Red filled, white text |
| Click | Loading spinner, text "भेजा जा रहा है..." |
| Success | Green check, text "342 लोगों को भेजा गया" |
| Error | Red filled, error icon, "फिर से कोशिश करें" |

### 11.3 Map Zone States

| State | Visual |
|-------|--------|
| Idle | Filled polygon, opacity 0.5 |
| Hovered | Opacity 0.8, tooltip with zone name + risk |
| Selected | Opacity 0.9, white border 2px |
| Active Alert | Animated pulse ring on centroid marker |

---

## 12. Error Handling UI

### 12.1 Error Categories & Responses

| Error | Citizen PWA Response | Dashboard Response |
|-------|---------------------|-------------------|
| No internet | Grey offline banner at top; show cached data + timestamp | Alert banner: "डेटा अपडेट नहीं हो रहा — अंतिम अपडेट: [time]" |
| Location not found | "अपना गाँव चुनें" — village name picker fallback | N/A |
| API timeout | Silent retry × 3; then show cached + staleness warning | Red dot in system health bar; error detail in status modal |
| ML service down | Show last computed risk with "ML सेवा जाँच में" notice | Red ML dot in system health; auto-escalate if 5+ min down |
| SMS delivery fail | Log to DB; retry queue; no user-facing error in citizen PWA | Show failed count in alert history with retry option |
| Sensor offline | N/A (transparent to citizen) | Yellow sensor icon; tooltip "अंतिम डेटा: [time]" |
| Authentication fail | N/A (no auth in citizen PWA) | Redirect to login with "सत्र समाप्त हो गया" message |

### 12.2 Error Message Tone

- **Citizen PWA errors:** Always reassuring. Never blame the user. Provide an alternative action.
- **Dashboard errors:** Technical but concise. Include actionable next step.
- **Never show raw error codes or stack traces to any user.**

### 12.3 Fallback Hierarchy

1. Live data from API → 2. Redis cache (≤5 min old) → 3. Service Worker cache (≤24h old) → 4. Static "last known state" from localStorage → 5. Generic precautionary message: "डेटा उपलब्ध नहीं है — सावधानी बरतें और स्थानीय अधिकारियों से संपर्क करें।"

---

## 13. Design Tokens & System

### 13.1 Color Tokens

```css
:root {
  /* Risk Colors */
  --risk-low: #22C55E;
  --risk-low-text: #14532D;
  --risk-moderate: #F59E0B;
  --risk-moderate-text: #78350F;
  --risk-high: #EF4444;
  --risk-high-text: #FFFFFF;
  --risk-critical: #7F1D1D;
  --risk-critical-text: #FFFFFF;
  --risk-critical-border: #DC2626;

  /* Neutral */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --border: #E5E7EB;

  /* Brand */
  --brand: #1E40AF;
  --brand-light: #DBEAFE;
}
```

### 13.2 Typography Tokens

```css
:root {
  --font-display: 'Noto Sans Devanagari', sans-serif;
  --font-body: 'Noto Sans', sans-serif;

  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 28px;
  --text-4xl: 32px;

  --font-normal: 400;
  --font-medium: 500;
  --font-bold: 700;
  --font-black: 900;

  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### 13.3 Spacing Tokens

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### 13.4 Component Sizing

```css
:root {
  --touch-target-min: 48px;
  --border-radius-sm: 6px;
  --border-radius-md: 12px;
  --border-radius-lg: 16px;
  --border-radius-full: 9999px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
  --shadow-modal: 0 20px 60px rgba(0,0,0,0.2);
}
```

---

*Document controlled by HH-LEWS UX Team. Design decisions require team review before implementation changes.*
