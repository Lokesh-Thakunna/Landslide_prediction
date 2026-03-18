# HH-LEWS — User Flow Document

**Document Version:** 1.0.0  
**Last Updated:** 2025-06-14  
**Status:** Active  
**Owner:** HH-LEWS Product Team

---

## Table of Contents

1. [Citizen Flow](#1-citizen-flow)
2. [Official Flow](#2-official-flow)
3. [Admin Flow](#3-admin-flow)
4. [ML Prediction Lifecycle](#4-ml-prediction-lifecycle)
5. [Alert Lifecycle](#5-alert-lifecycle)
6. [Edge Cases & Failure Flows](#6-edge-cases--failure-flows)

---

## 1. Citizen Flow

### 1.1 Flow A: Receiving WhatsApp Alert (Primary Channel)

This is the highest-frequency citizen interaction — the system sends an alert to the citizen; the citizen receives it and acts. No app required.

```
╔══════════════════════════════════════════════════════════════════════╗
║           CITIZEN FLOW A — WHATSAPP ALERT RECEIVED                   ║
╚══════════════════════════════════════════════════════════════════════╝

SYSTEM                              KAMLA DEVI (Citizen)
──────                              ────────────────────

Risk score crosses HIGH threshold
on two consecutive cycles
│
▼
Alert dispatch triggered
│
▼
WhatsApp message composed (Hindi)  →   📲 WhatsApp notification arrives
"🔴 भूस्खलन खतरा | गौचर | अभी निकलें!"   on Kamla's phone
                                         │
                                         ▼
                                    Kamla opens WhatsApp message
                                    Reads:
                                    "🔴 भूस्खलन चेतावनी — गौचर, चमोली
                                    ⚠️ खतरा स्तर: अभी निकलें (CRITICAL)
                                    📍 आपको क्या करना है:
                                    • अभी घर छोड़ें
                                    • ग्राम पंचायत भवन जाएं (1.2 km)
                                    📞 SDRF: 1070"
                                         │
                                         ▼
                                    Kamla shows phone to husband
                                    (PWA link in message tapped)
                                         │
                                         ▼
                                    PWA opens in Chrome browser
                                    Shows: 🔴 CRITICAL risk screen
                                    "अभी घर छोड़ें" button prominent
                                         │
                                         ▼
                                    Taps "सुरक्षित स्थान देखें →"
                                         │
                                         ▼
                                    Safe Zones screen opens
                                    Map shows: Home location (📍)
                                              Safe zone (🏛️)
                                    Text: "ग्राम पंचायत भवन — 1.2 km
                                           मुख्य सड़क से दाएं, मंदिर के पास"
                                         │
                                         ▼
                                    Family evacuates to safe zone
                                         │
                                         ▼
System: score drops below LOW      Kamla receives WhatsApp:
after 6 hours (event resolved)     "✅ गौचर क्षेत्र — खतरा समाप्त
                                    आप सुरक्षित रूप से घर लौट सकते हैं।"
                                         │
                                         ▼
                                    Family returns home safely
```

**Key UX principles at work:**
- No login required at any step.
- WhatsApp is the entry point — Kamla doesn't need to know about the PWA beforehand.
- PWA link in the WhatsApp message opens a mobile-optimized view directly.
- Safe zone described in landmark language, not GPS.

---

### 1.2 Flow B: IVR Voice Call (Literacy Support Channel)

For subscribers flagged `literacy_support=true` or village pradhans who may not read Hindi fluently.

```
╔══════════════════════════════════════════════════════════════════════╗
║             CITIZEN FLOW B — IVR VOICE CALL                          ║
╚══════════════════════════════════════════════════════════════════════╝

SYSTEM                              MOHAN PRASAD (Village Pradhan, 61)
──────                              ──────────────────────────────────

Alert triggered for zone             📞 Mohan's phone rings
(HIGH/CRITICAL risk)                 Unknown number (HHLEWS / SDRF)
│                                         │
▼                                         ▼
IVR call initiated (Exotel)          Mohan answers
│
▼
Pre-recorded Hindi audio plays: →   "यह चमोली जिला आपदा प्रबंधन
"[Intro]..."                        कार्यालय से है। गौचर में
                                    भूस्खलन खतरा है। अभी घर छोड़ें।"
                                         │
                                         ▼
                                    Mohan listens to full message
                                    (20 seconds)
                                         │
                                         ▼
IVR: "दोहराने के लिए 1 दबाएं।   →  Mohan presses 1 (repeat)
SDRF से बात करने के लिए          Message plays again
2 दबाएं।"                              │
                                         ▼
                                    Mohan presses 2 (connect to SDRF)
                                         │
                                         ▼
IVR transfer to SDRF dispatch   →   Mohan speaks with SDRF operator
hotline                             Confirms location, status
                                         │
                                         ▼
                                    Mohan walks through village
                                    calling residents to evacuate
```

---

### 1.3 Flow C: Citizen Subscribes via PWA

```
╔══════════════════════════════════════════════════════════════════════╗
║           CITIZEN FLOW C — PHONE NUMBER SUBSCRIPTION                 ║
╚══════════════════════════════════════════════════════════════════════╝

Citizen visits PWA (URL shared by pradhan/NGO/government flyer)
│
▼
Home screen loads
Risk level shown for default zone (Geolocated or statewide default)
│
▼
Citizen taps "अलर्ट पाएं" (Get Alerts) button
│
▼
Subscribe form opens:
┌────────────────────────────────────────────┐
│  अलर्ट पाने के लिए रजिस्टर करें           │
│                                            │
│  अपना मोबाइल नंबर:                         │
│  [+91 ___________] ← Large input, Hindi   │
│                                            │
│  अपना गाँव/क्षेत्र चुनें:                   │
│  [Village Picker Dropdown — Hindi names]   │
│                                            │
│  ☑ WhatsApp पर भेजें (यदि उपलब्ध हो)       │
│  ☐ कॉल पर संदेश (बड़े/बुजुर्ग के लिए)       │
│                                            │
│  [OTP भेजें →]                             │
└────────────────────────────────────────────┘
│
▼
OTP sent via SMS to entered phone number
│
▼
OTP input screen:
┌────────────────────────────────────────────┐
│  OTP दर्ज करें                              │
│  आपके नंबर पर 6 अंकों का कोड भेजा गया      │
│                                            │
│  [_ _ _ _ _ _] ← Large digit inputs       │
│                                            │
│  [पुष्टि करें →]                            │
│  दोबारा OTP भेजें (2:30 बचे हैं)            │
└────────────────────────────────────────────┘
│
▼ OTP verified
│
▼
Success screen:
"✅ रजिस्टर हो गए!
गौचर क्षेत्र के लिए अलर्ट मिलने शुरू हो जाएंगे।
खतरे में: SMS + WhatsApp पर सूचना मिलेगी।"
│
▼
Citizen returned to Home screen
Risk indicator shown for their registered zone
```

---

### 1.4 Flow D: Citizen PWA in Offline Mode

```
Citizen is in a landslide zone during rainfall
Network: 1-2 bars, intermittent
│
▼
Citizen opens PWA (previously loaded)
│
▼
Service Worker intercepts fetch requests
│
Network available?
├── YES → Load fresh data from API → Display current risk
└── NO  → Serve from cache
            │
            ▼
        Cached risk data loaded
        Offline banner shown at top:
        "📶 आप ऑफलाइन हैं — जानकारी पुरानी हो सकती है
         अंतिम अपडेट: 47 मिनट पहले"
            │
            ▼
        CRITICAL risk was cached from last load
        Screen shows CRITICAL risk (cached)
        Safe zone info available (cached)
        Emergency numbers visible
            │
            ▼
        Citizen follows cached safe zone directions
            │
            ▼
        Network restored at safe zone location
            │
            ▼
        PWA auto-refreshes in background
        Updated risk level shown
        "✅ डेटा अपडेट हो गया"
```

---

## 2. Official Flow

### 2.1 Flow A: Daily Monitoring Routine

```
╔══════════════════════════════════════════════════════════════════════╗
║           OFFICIAL FLOW A — DAILY MONITORING (DDMO)                  ║
╚══════════════════════════════════════════════════════════════════════╝

RAJEEV NEGI (DDMO, Chamoli)
──────────────────────────────────────────────────────────────

08:00 AM — Morning check
│
▼
Opens dashboard URL on laptop (Chrome)
JWT expired (overnight) → Redirect to login
│
▼
Login screen:
Email: [rajeev.negi@chamoli.uk.gov.in]
Password: [••••••••••••]
[लॉगिन करें]
│
▼ Successful
│
▼
Dashboard loads: Map view
All zones visible in Chamoli district
Current status: all GREEN (LOW risk) - normal morning
│
▼
Rajeev scans the zone list in left nav:
"गौचर — 🟢 LOW (0.18)"
"थराली — 🟢 LOW (0.22)"
"नारायणबगड़ — 🟢 LOW (0.31)"
... all low risk
│
▼
Rajeev checks System Health bar:
"● API ✓  ● ML ✓  ● DB ✓  ● SMS ✓  ● 3 sensors offline"
│
▼
Rajeev clicks "3 sensors offline" alert
Opens sensor detail modal:
"CHM-THARALI-003 — last seen: 14 hours ago (battery: 0%)"
"CHM-GAUCHAR-001 — last seen: 2 hours ago"
"CHM-NANDA-002 — last seen: 6 hours ago"
│
▼
Rajeev adds maintenance note for CHM-THARALI-003
(battery dead — schedule replacement)
│
▼
10:30 AM — Weather warning received from IMD
Heavy rainfall warning for Chamoli district (Tuesday)
│
▼
Rajeev opens dashboard
Sees "गौचर — 🟡 MODERATE (0.52)" — risk risen in 2.5 hours
│
▼
Clicks गौचर zone on map
Right panel opens:
Risk score: 0.52 (↑ from 0.18 this morning)
Trend chart: steady rise over last 3 hours
Rainfall: 18mm/hr (ongoing)
Soil saturation: 67%
ML Confidence: 0.82
Top features: rainfall_mm_hr (weight: 0.34), saturation (0.28), slope (0.19)
│
▼
Rajeev decides to issue a precautionary advisory
(Not a full alert — just a "be aware" message)
│
▼
Clicks "Alert भेजें →"
Manual broadcast modal opens
Selects template: "सावधानी - मध्यम खतरा"
Previews Hindi message
Channel: ☑ WhatsApp ☐ SMS (advisory, not emergency)
Recipients: 342 subscribers
│
▼
Clicks "भेजें" → Confirmation dialog:
"342 लोगों को WhatsApp अलर्ट भेजा जाएगा।
पुष्टि करें?"
[रद्द करें]  [हाँ, भेजें]
│
▼ Confirmed
│
▼
Alert dispatched
Dashboard shows: "✓ 342 अलर्ट भेजे गए — 1:47 PM"
Alert logged in history: "Manual | WhatsApp | Rajeev Negi | 342 recipients"
```

---

### 2.2 Flow B: Responding to ML-Triggered CRITICAL Alert

```
╔══════════════════════════════════════════════════════════════════════╗
║       OFFICIAL FLOW B — ML ALERT RECEIVED, VERIFY & ACT             ║
╚══════════════════════════════════════════════════════════════════════╝

02:15 AM — Rajeev's phone buzzes
SYSTEM → SMS to DDMO:
"[HHLEWS SYSTEM] CRITICAL alert triggered for गौचर zone.
Risk score: 0.89. Automated SMS sent to 342 subscribers.
Login: dashboard.hhlews.in"
│
▼
Rajeev opens dashboard on phone (responsive mobile view)
Sees: 🔴 गौचर — CRITICAL (0.89) | ● Alert Dispatched
│
▼
Rajeev reviews the evidence:
Rainfall: 61mm/hr ← extreme cloudburst
Soil saturation: 94%
Vibration: 2.4 m/s² ← elevated
ML Confidence: 0.91
Top feature: rainfall_mm_hr (0.41 weight)
│
▼
Decision: Confirm the alert (ML is correct)
Rajeev calls Block Development Officer (BDO) — Gauchar
Confirms SDRF pre-positioning at safe zone
│
▼
Rajeev adds official note in dashboard:
"Alert confirmed by DDMO at 02:19 AM.
SDRF team dispatched to Gauchar safe zone.
BDO Gauchar informed."
│
▼
03:45 AM — Risk score drops to 0.61 (HIGH)
System still in alert (cooldown active)
│
▼
04:30 AM — Risk score drops to 0.34 (LOW)
System triggers: "Risk Resolved" check
Two consecutive LOW cycles confirmed
│
▼
Automated "all clear" message dispatched:
"✅ गौचर क्षेत्र — खतरा समाप्त। आप घर लौट सकते हैं।"
│
▼
Rajeev reviews alert event in history
Generates incident report (PDF export)
Submits to SEOC (State Emergency Operations Centre)
```

---

### 2.3 Flow C: Official Suppresses a False-Positive Alert

```
Automated ML alert fires for नारायणबगड़ zone
Risk score: 0.71 (HIGH)
Alert dispatched to 187 subscribers
│
▼
Rajeev reviews:
Rainfall: 14mm/hr (moderate)
Soil saturation: 81%
Vibration: 0.09 m/s² ← LOW (not concerning)
ML Confidence: 0.61 ← below normal
Top feature: soil_saturation (0.47 weight) ← sensor anomaly suspected
│
▼
Rajeev checks sensor CHM-NARAYAN-002
Last calibrated: 6 months ago
Recent readings: saturation fluctuating 79–94% unrealistically
Conclusion: Sensor fault → false positive
│
▼
Rajeev clicks "Alert दबाएं (Suppress)"
Suppress modal:
Reason: [Dropdown] "सेंसर खराब (Sensor Fault)"
Duration: [4 hours] ← Suppression window
Note: "CHM-NARAYAN-002 saturation readings unreliable. Sensor to be replaced."
[दबाएं (Suppress)]
│
▼
System:
- Sets alert_suppress:{zone_id} in Redis (TTL: 4 hours)
- Logs suppression with user, reason, timestamp
- Sends "false alarm" follow-up WhatsApp to subscribers:
  "ℹ️ सुधार: नारायणबगड़ — पहले भेजा गया अलर्ट रद्द किया गया।
   क्षेत्र सुरक्षित है। क्षमा करें।"
│
▼
Rajeev creates maintenance ticket for CHM-NARAYAN-002
(via Admin panel → Sensor maintenance log)
```

---

## 3. Admin Flow

### 3.1 Flow A: Onboarding a New Monitoring Zone

```
╔══════════════════════════════════════════════════════════════════════╗
║              ADMIN FLOW A — NEW ZONE ONBOARDING                      ║
╚══════════════════════════════════════════════════════════════════════╝

Admin (System Administrator)
│
▼
Login with ADMIN role credentials
│
▼
Navigate: Admin → Zones → "नया क्षेत्र जोड़ें"
│
▼
Zone Configuration Form:
┌──────────────────────────────────────────────────┐
│  Zone Name (Hindi):     [___________________]    │
│  Zone Name (English):   [___________________]    │
│  District:              [Dropdown]               │
│  Block:                 [Dropdown]               │
│  Coordinates (centroid): Lat [__] Lng [__]       │
│  Draw Polygon on Map:   [Map Interface]          │
│  Slope Data Source:     ● SRTM Pre-loaded        │
│                         ○ Manual Entry            │
│  Alert Threshold HIGH:  [0.65] (editable)        │
│  Alert Threshold CRIT:  [0.85] (editable)        │
│  Safe Zone 1:           [___] Distance: [__km]   │
│  Safe Zone 2:           [___] (optional)         │
│  District Helpline:     [___________________]    │
└──────────────────────────────────────────────────┘
│
▼
Click "SRTM डेटा लोड करें"
│
▼
System runs SRTM extraction job for polygon
Returns: slope_avg, slope_max, aspect_avg, curvature
Admin reviews values, confirms
│
▼
Click "Zone सेव करें"
│
▼
System:
- Creates zone record in PostgreSQL
- Generates zone_id UUID
- Creates spatial index for polygon
- Initializes risk cache key: risk:{zone_id} = {level: LOW, score: 0.0}
- Adds zone to Celery polling schedule
│
▼
Admin navigates to: Admin → Subscribers → Bulk Import
Uploads CSV:
phone_number, whatsapp_opted, ivr_opted, literacy_support
+919876543210, true, false, false
+917654321098, true, true, true
...
│
▼
System processes CSV:
- Validates phone format (India: +91XXXXXXXXXX)
- Encrypts all phone numbers (AES-256)
- Inserts subscriber records linked to new zone_id
- Reports: "347 सदस्य सफलतापूर्वक जोड़े गए | 3 अमान्य नंबर छोड़े गए"
│
▼
Zone is live — polling begins on next 5-minute cycle
```

---

### 3.2 Flow B: Model Version Upgrade

```
Admin receives notification: ML Lead has trained model v1.3.0
Model files: rf_v1.3.0.pkl, xgb_v1.3.0.pkl, pipeline_v1.3.0.pkl
Performance metrics: F1=0.91 (up from 0.88 in v1.2.0)
│
▼
Admin places model files on server:
$ scp models/v1.3.0/* ubuntu@hhlews-server:/home/claude/models/
│
▼
Admin verifies checksums:
$ sha256sum /home/claude/models/*.pkl
(matches expected values from ML Lead)
│
▼
Admin calls: POST /ml/models/v1.3.0/load
(via Dashboard: Admin → ML Models → "v1.3.0 लोड करें")
│
▼
FastAPI ML service:
- Loads new model files
- Runs validation inference on 10 test vectors
- Compares output format with expected schema
- If validation passes: updates symlink current → v1.3.0
- Returns: {"status": "loaded", "version": "v1.3.0", "validation": "passed"}
│
▼
Dashboard shows: "ML Model: v1.3.0 ✓ (loaded 2:34 PM)"
│
▼
Admin monitors next 5 inference cycles
Reviews predictions for any unexpected behavior
│
▼
If issues detected: POST /ml/models/v1.2.0/load
(Instant rollback to previous version)
```

---

### 3.3 Flow C: User Access Management

```
New District Official joins — needs dashboard access
│
▼
Admin: Admin → Users → "नया उपयोगकर्ता जोड़ें"
│
▼
User creation form:
Name: [_________________]
Email: [_________________]
Role: [DISTRICT_OFFICIAL ▼]
District: [Pithoragarh ▼]
│
▼
System creates user record
Sends welcome email with temporary password + login URL
│
▼
User logs in, forced to change password on first login
│
▼
User now sees Pithoragarh district zones only
(RBAC district filter applied automatically)
```

---

## 4. ML Prediction Lifecycle

```
╔══════════════════════════════════════════════════════════════════════╗
║                  ML PREDICTION LIFECYCLE                              ║
╚══════════════════════════════════════════════════════════════════════╝

T+0:00  Celery Beat fires: batch_inference task
        │
T+0:02  Celery Inference Worker wakes
        Fetches list of active zones from Redis (or DB)
        Currently: 50 zones in pilot
        │
T+0:03  For each zone — feature assembly:
        │
        ├── Static features (from Redis zone_features:{zone_id}, TTL 1h):
        │   slope_avg=32.4°, aspect=185°, curvature=-0.12,
        │   soil_type=1 (clay), hist_proximity=2.3km
        │
        ├── Dynamic weather (from Redis weather:{lat}:{lon}, TTL 5min):
        │   rainfall_mm_hr=28.5, rainfall_72h=142.0,
        │   humidity=91, pressure=994
        │
        ├── Sensor data (from Redis sensor_last:{sensor_id}, TTL 10min):
        │   saturation_pct=78.4, vibration_mps2=0.34
        │   [If sensor offline: use zone_avg from last 24h]
        │
        └── Engineered features (computed inline):
            antecedent_rainfall_index = EWM(72h_window) = 134.2
            slope_x_rainfall = 32.4 × 28.5 = 923.4
            saturation_velocity = (78.4 - 71.2) / 30 = +0.24/min
        │
T+0:04  POST /predict to FastAPI ML service (internal HTTP)
        Payload: PredictionRequest JSON
        │
T+0:04  FastAPI receives request
        Pydantic validation: PASS
        │
T+0:04  Pipeline.predict(features):
        ├── SimpleImputer: no NaN values (all features present)
        ├── StandardScaler: normalize all features
        ├── PolynomialFeatures: add interaction terms (degree=2)
        └── SelectKBest: select top 20 features
        │
T+0:04  Random Forest inference:
        predict_proba → [0.05, 0.18, 0.52, 0.25]
        Classes: [LOW, MOD, HIGH, CRIT]
        RF_HIGH_PROBA = 0.52 + 0.25 = 0.77
        │
T+0:04  XGBoost inference:
        predict → 0.71
        XGB_SCORE = 0.71
        │
T+0:04  Ensemble:
        risk_score = 0.4 × 0.77 + 0.6 × 0.71 = 0.308 + 0.426 = 0.734
        │
T+0:04  Classification:
        0.734 → HIGH (0.65–0.84 range)
        │
T+0:04  SHAP computation:
        Top 3 features:
        1. rainfall_mm_hr: +0.34 (most contributory)
        2. soil_saturation_pct: +0.28
        3. antecedent_rainfall_index: +0.19
        │
T+0:04  Response returned to Celery Worker:
        {risk_score: 0.734, risk_level: "HIGH",
         confidence: 0.84, model_version: "v1.2.0",
         top_features: [...], predicted_at: "..."}
        │
T+0:05  Celery Worker:
        ├── Writes to predictions table (full audit record)
        ├── Updates Redis: risk:{zone_id} = {score: 0.734, level: HIGH}
        ├── Publishes WebSocket event: zone_risk_updated to dashboard
        └── Evaluates alert threshold:
            score (0.734) ≥ HIGH_THRESHOLD (0.65) → YES
            Previous cycle score: 0.703 (also HIGH) → Two consecutive HIGH
            → ALERT CHECK → proceeds to Alert Lifecycle
        │
T+0:05  All 50 zones processed (parallel async)
        Total elapsed: ~3 seconds for batch
        Redis updated for all zones
        Dashboard clients receive real-time push updates
        │
T+05:00 Next inference cycle triggered by Celery Beat
```

---

## 5. Alert Lifecycle

```
╔══════════════════════════════════════════════════════════════════════╗
║                      ALERT LIFECYCLE                                  ║
╚══════════════════════════════════════════════════════════════════════╝

TRIGGER PHASE
─────────────
T+0:00  Alert threshold check fires for zone गौचर
        risk_score = 0.734 (HIGH) — second consecutive HIGH cycle
        │
        ▼
T+0:00  Check Redis: alert_suppress:{zone_gauchar}
        Result: NOT SET (no active suppression)
        │
        ▼
T+0:00  Check Redis: alert_cooldown:{zone_gauchar}
        Result: NOT SET (no active cooldown)
        │
        ▼
T+0:00  Alert dispatch authorized
        Fetch subscribers: SELECT * FROM subscribers WHERE zone_id = ? AND is_active = TRUE
        Result: 342 subscribers
        │
        ▼
T+0:01  Compose alert message:
        SMS: "⚠️ भूस्खलन खतरा | गौचर | खतरा\nतुरंत ग्राम पंचायत भवन जाएं।\nहेल्पलाइन: 01372-251437\n-DDMO चमोली"
        WhatsApp: Full formatted message (see alert message UX doc)
        │
        ▼
T+0:01  Set Redis: alert_cooldown:{zone_gauchar} (TTL: 1800 seconds / 30 min)
        Set Redis: alert_suppress_level:{zone_gauchar} = "HIGH" (for escalation check)
        │
        ▼
T+0:01  Enqueue Celery tasks:
        ├── dispatch_sms_batch(zone_id, message, [342 subscriber IDs])
        └── dispatch_whatsapp_batch(zone_id, message, [whatsapp_opted subscribers])

DISPATCH PHASE
──────────────
T+0:02  SMS Worker picks up task
        Decrypt phone numbers (AES-256)
        Chunk into batches of 100
        │
        ▼
T+0:02  Batch 1 (subscribers 1–100):
        Twilio API: messages.create(to=phone, from_=sender_id, body=msg)
        Twilio response: 200 OK (100 messages queued)
        │
        ▼
T+0:03  Batch 2 (101–200), Batch 3 (201–300), Batch 4 (301–342)
        All batches dispatched
        │
        ▼
T+0:04  WhatsApp Worker:
        213 opted-in subscribers
        WhatsApp Business API calls (in batches)
        │
        ▼
T+0:12  Twilio delivery status webhooks arrive:
        338 delivered ✓
        4 failed (network error / phone off)
        Failed numbers queued for retry (Celery countdown=300s)
        │
        ▼
T+0:13  Write to alert_events table:
        {zone_id, risk_level=HIGH, triggered_by=ml_auto,
         channels=[sms, whatsapp], recipient_count=342,
         delivered_count=338, created_at=NOW()}
        │
        ▼
T+0:13  WebSocket event to dashboard:
        alert_dispatched: {zone_id: gauchar, level: HIGH, count: 342}

DASHBOARD DISPLAY
─────────────────
T+0:13  Rajeev Negi's dashboard updates:
        गौचर zone: 🔴 HIGH (0.734)
        Active alert badge on zone marker
        Alert feed: "2:47 AM | गौचर | HIGH | 342 alerts sent"
        System status: "1 active alert"

RESOLUTION PHASE
────────────────
T+2:30  Risk score drops: 0.512 (MODERATE) — one cycle
T+2:35  Risk score drops: 0.38 (LOW) — two consecutive LOW cycles
        │
        ▼
        Alert engine detects: previous state was HIGH, now two consecutive LOW
        → Trigger "risk resolved" notification
        │
        ▼
        Resolution message composed (Hindi):
        SMS + WhatsApp: "✅ गौचर क्षेत्र — खतरा समाप्त
        आप सुरक्षित रूप से घर लौट सकते हैं।
        -DDMO चमोली"
        │
        ▼
        Dispatch to same 342 subscribers
        Clear Redis: alert_cooldown:{zone_gauchar}
        Clear Redis: alert_suppress_level:{zone_gauchar}
        │
        ▼
        Update alert_events record: resolved_at = NOW()
        WebSocket event: alert_resolved
        Dashboard: गौचर zone returns to 🟢 LOW
```

---

## 6. Edge Cases & Failure Flows

### 6.1 Edge Case: Sensor Goes Offline During Active Alert

```
Active CRITICAL alert for गौचर
T+0:00  CHM-GAUCHAR-001 sensor stops transmitting
        MQTT LWT published: sensors/gauchar/001/status → {"status": "offline"}
        │
        ▼
T+0:01  Celery sensor worker receives LWT
        Updates sensor record: status=offline, last_seen=NOW()
        │
        ▼
T+0:05  Next inference cycle runs
        Feature assembly: soil_saturation_pct — SENSOR OFFLINE
        Fallback: use zone_avg_saturation from last 24h = 82%
        Alert in prediction metadata: "sensor_fallback=true"
        │
        ▼
        Inference continues with fallback value
        risk_score: 0.82 (still CRITICAL)
        Alert remains active
        Dashboard shows: sensor icon 🔴 + "Fallback data"
        │
        ▼
        ML confidence downgraded: 0.91 → 0.78 (sensor offline penalty)
        Dashboard tooltip: "Low confidence — sensor CHM-GAUCHAR-001 offline"
        │
        ▼
        DDMO can see the sensor is offline and confidence is degraded
        DDMO makes judgment call on alert status
```

### 6.2 Edge Case: Weather API Returns Stale/Invalid Data

```
T+0:00  Celery polling worker calls OpenWeatherMap for गौचर coordinates
        Response: 200 OK, but rainfall_mm_hr = -999 (invalid sensor reading from OWM)
        │
        ▼
        Validation check: rainfall_mm_hr < 0 → INVALID
        Log: "Invalid weather data for gauchar at [timestamp]"
        │
        ▼
        Fallback 1: Try cached value (Redis TTL check)
        Cache hit: 4.5 minutes old (within 5-min TTL)
        Use cached value, flag as "cache_used=true"
        │
        ▼ OR Cache miss / cache also stale:
        │
        Fallback 2: Call Open-Meteo backup API
        Response: 200 OK, valid data
        Use backup data, flag as "source=openmeteo"
        │
        ▼ OR Backup API also fails:
        │
        Fallback 3: Use last-known valid value from DB (weather_readings table)
        Flag as "source=historical, stale=true"
        ML confidence penalty: -0.15
        Dashboard alert: "⚠️ मौसम डेटा पुराना है — गौचर"
```

### 6.3 Edge Case: Simultaneous CRITICAL Alerts in Multiple Zones

```
T+0:00  Unusual cloudburst — THREE zones simultaneously hit CRITICAL
        गौचर: 0.88
        थराली: 0.91
        नारायणबगड़: 0.87
        │
        ▼
        Alert engine runs zone by zone
        Three separate alert dispatch tasks enqueued
        │
        ▼
        SMS Workers (4 parallel):
        गौचर: 342 recipients
        थराली: 187 recipients
        नारायणबगड़: 289 recipients
        Total: 818 SMS + WhatsApp
        │
        ▼
        Twilio rate limit: 1 SMS/second per sender ID on trial accounts
        → Queue backup on trial; no issue on production DLT sender
        │
        ▼
        Production DLT sender: ~100 SMS/sec throughput
        818 SMS delivered in < 10 seconds
        │
        ▼
        Dashboard shows 3 active alerts simultaneously
        DDMO receives 3 system notifications
        Rajeev escalates to NDMA operations center
        │
        ▼
        NDMA dashboard (national view):
        Chamoli district — 3 active CRITICAL alerts
        Analyst triggers national-level response protocol
```

### 6.4 Edge Case: Official Accidentally Triggers Wrong Zone Alert

```
Rajeev intends to alert गौचर zone
Accidentally selects थराली in the dropdown
│
▼
Manual broadcast modal shows:
"Zone: थराली | Recipients: 187"
│
▼
Rajeev clicks "भेजें" (first confirm)
│
▼
Second confirm dialog appears:
"⚠️ पुष्टि करें:
थराली के 187 लोगों को HIGH अलर्ट भेजें?"
[रद्द करें]  [हाँ, भेजें]
│
▼ Rajeev realizes the mistake
Clicks "रद्द करें"
Alert not sent
│
▼ OR — Rajeev confirms accidentally:
Alert sent to थराली (wrong zone)
│
▼
Rajeev immediately opens Alert History
Finds: थराली manual alert (2:31 PM)
Clicks "Recall" (available within 5 minutes of dispatch)
│
▼
System action on "Recall":
├── Sends follow-up message to थराली subscribers:
│   "ℹ️ सुधार: पिछला अलर्ट गलती से भेजा गया था। थराली क्षेत्र सुरक्षित है।"
└── Logs recall event with user ID and reason
```

### 6.5 Edge Case: New Subscriber Registers During Active Alert

```
Active CRITICAL alert for गौचर
│
▼
New resident in Gauchar opens PWA (link shared by pradhan)
Taps "अलर्ट पाएं" → registers phone number → OTP verified
│
▼
Subscriber added to gauchar zone
is_active = true
│
▼
System checks: Is there an active alert for this zone?
Query: alert_events WHERE zone_id = gauchar AND resolved_at IS NULL
Result: YES — active CRITICAL alert
│
▼
Immediate alert dispatch to new subscriber only:
"🔴 आपके क्षेत्र में अभी भूस्खलन का खतरा है। तुरंत घर छोड़ें।"
(Not to all 342 — only the new subscriber)
│
▼
New subscriber receives alert within 30 seconds of registration
```

### 6.6 Edge Case: ML Model Returns Confidence Below Threshold

```
T+0:00  Inference for नंदप्रयाग zone
        risk_score: 0.68 (HIGH) — crosses threshold
        confidence: 0.51 ← LOW confidence
        │
        ▼
        Confidence check: 0.51 < 0.60 (minimum confidence threshold)
        │
        ▼
        Alert engine: DO NOT auto-trigger
        Instead: flag as "LOW_CONFIDENCE_HIGH_RISK"
        │
        ▼
        System action:
        ├── Send notification to DDMO dashboard (not subscribers)
        │   "⚠️ नंदप्रयाग: HIGH risk (0.68) but LOW confidence (0.51)
        │    Manual review recommended"
        ├── Write to predictions table with confidence flag
        └── Dashboard zone color: amber border (vs. full red) — "needs review" state
        │
        ▼
        DDMO reviews:
        - Checks sensor status: all online
        - Checks weather: 22mm/hr rainfall (moderate)
        - Reviews trend: rising slowly over 90 min
        Decision: Issue precautionary MODERATE alert manually
        │
        ▼
        DDMO issues manual alert with MODERATE template
        (More careful language: "सावधान रहें, तैयार रहें")
```

---

*Document controlled by HH-LEWS Product Team. User flow changes must be reviewed by UX Lead and tested against accessibility requirements.*
