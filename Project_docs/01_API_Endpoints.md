# HH-LEWS — API Endpoints Documentation

**Version:** 1.0 | **Service:** Node.js Express Gateway (port 3000) + FastAPI ML (port 8000 — VPC only)  
**Base URL (Production):** `https://hhlews.in/api`  
**ML Internal Base:** `http://hhlews-ml:8000`  
**Classification:** Internal — Engineering

---

## Index

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1.1 | `POST` | `/auth/login` | No | Issue JWT access token + refresh cookie |
| 1.2 | `POST` | `/auth/refresh` | Cookie | Rotate access token |
| 1.3 | `POST` | `/auth/logout` | Bearer | Invalidate refresh token |
| 1.4 | `GET` | `/districts` | No | List all monitored districts |
| 1.5 | `GET` | `/zones/risk` | No | All zones with current risk scores |
| 1.6 | `GET` | `/risk/:district` | No | Zone risk filtered by district |
| 1.7 | `GET` | `/safe-zones` | No | Safe shelter locations |
| 1.8 | `GET` | `/weather/live` | No | Latest weather reading for a zone |
| 1.9 | `POST` | `/ml/predict` | API Key | ML inference (VPC internal only) |
| 1.10 | `POST` | `/alerts/trigger` | Bearer | Manual alert override |
| 1.11 | `POST` | `/alerts/suppress` | Bearer | Suppress auto-alerts for a zone |
| 1.12 | `POST` | `/subscribe` | OTP | Citizen phone subscription |
| 1.13 | `POST` | `/webhooks/twilio/status` | HMAC | Twilio delivery receipt |
| 1.14 | `WS` | `wss://hhlews.in/realtime-risk` | Bearer | Real-time risk updates |

---

## 1.1 POST /auth/login

**Description:** Authenticates a registered official (ADMIN, DISTRICT_OFFICIAL, VIEWER). Issues a short-lived RS256 access token and sets an httpOnly refresh token cookie. Citizens do not authenticate — all public risk endpoints are open.

**Auth Required:** No  
**Rate Limit:** 10 requests/min/IP (Nginx)

### Request Body

```json
{
  "email": "collector@chamoli.gov.in",
  "password": "SecureP@ss2025!"
}
```

### Response Schema

```json
{
  "access_token": "<JWT string>",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid-v4",
    "email": "collector@chamoli.gov.in",
    "role": "DISTRICT_OFFICIAL",
    "district_id": "uuid-v4"
  }
}
```

> Refresh token set as httpOnly cookie:  
> `Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Login successful. Returns access_token + sets httpOnly refresh cookie. |
| `400` | Validation error — missing or malformed email/password fields. |
| `401` | Invalid credentials — email not found or bcrypt mismatch. |
| `403` | Account deactivated (`is_active = false`). |
| `429` | Rate limited — max 10 login attempts per IP per minute. |

### Example cURL

```bash
curl -X POST https://hhlews.in/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.jar \
  -d '{"email":"collector@chamoli.gov.in","password":"SecureP@ss2025!"}'
```

### Example Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "collector@chamoli.gov.in",
    "role": "DISTRICT_OFFICIAL",
    "district_id": "8d3b2e10-9abc-4321-beef-fedbca123456"
  }
}
```

---

## 1.2 POST /auth/refresh

**Description:** Rotates the access token using the httpOnly refresh token cookie. No request body required. Old refresh token is immediately invalidated in Redis (single-use). New refresh token cookie is set on response.

**Auth Required:** httpOnly `refresh_token` cookie (no Bearer header)  
**Rate Limit:** Standard public limit

### Request Body

_None_

### Response Schema

```json
{
  "access_token": "<new JWT string>",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | New access token issued, new refresh token cookie set. |
| `401` | Refresh token missing, expired, or already invalidated (Redis lookup failed). |
| `403` | Refresh token valid but user account deactivated. |

### Example cURL

```bash
curl -X POST https://hhlews.in/api/auth/refresh \
  -b cookies.jar \
  -c cookies.jar
```

### Example Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

---

## 1.3 POST /auth/logout

**Description:** Invalidates the refresh token in Redis (blacklist delete). Clears the httpOnly cookie via `Set-Cookie: refresh_token=; Max-Age=0`. Access tokens are not revocable due to stateless JWT — they expire naturally after 15 minutes.

**Auth Required:** `Bearer <access_token>`  
**Rate Limit:** Standard

### Request Body

_None_

### Response Schema

```json
{
  "message": "Logged out successfully"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Logout successful. Refresh token blacklisted in Redis. |
| `401` | No valid access token provided. |

### Example cURL

```bash
curl -X POST https://hhlews.in/api/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -b cookies.jar
```

### Example Response

```json
{
  "message": "Logged out successfully"
}
```

---

## 1.4 GET /districts

**Description:** Returns list of all monitored Uttarakhand districts with metadata. Used by the Citizen PWA and Dashboard to populate dropdowns and map filters. Sourced from Redis cache; falls back to PostgreSQL on cache miss.

**Auth Required:** No  
**Rate Limit:** 100 requests/min/IP

### Request Body

_None_

### Response Schema

```json
{
  "districts": [
    {
      "id": "uuid",
      "name": "Chamoli",
      "helpline_number": "01372-251437",
      "zone_count": 14,
      "active_high_zones": 2
    }
  ],
  "total": 5
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Returns districts array. |
| `500` | Internal server error — DB unreachable. |

### Example cURL

```bash
curl https://hhlews.in/api/districts
```

### Example Response

```json
{
  "districts": [
    {
      "id": "8d3b2e10-9abc-4321-beef-fedbca123456",
      "name": "Chamoli",
      "helpline_number": "01372-251437",
      "zone_count": 14,
      "active_high_zones": 2
    },
    {
      "id": "9a1c3f20-bcde-5432-cafe-edcb87654321",
      "name": "Rudraprayag",
      "helpline_number": "01364-233437",
      "zone_count": 9,
      "active_high_zones": 0
    }
  ],
  "total": 5
}
```

---

## 1.5 GET /zones/risk

**Description:** Returns all active monitoring zones with their latest ML risk scores and levels. Primary data feed for the Citizen PWA map and Dashboard polygon rendering. Risk data sourced from Redis cache (`key: risk:{zone_id}`). Includes `is_stale` flag if last prediction is older than 10 minutes.

**Auth Required:** No  
**Rate Limit:** 100 requests/min/IP

### Request Body

_None_

### Response Schema

```json
{
  "zones": [
    {
      "id": "uuid",
      "name": "Joshimath Slope Zone",
      "district_id": "uuid",
      "risk_score": 0.88,
      "risk_level": "LOW | MODERATE | HIGH | CRITICAL",
      "confidence": 0.92,
      "is_stale": false,
      "predicted_at": "ISO8601",
      "centroid": {
        "lat": 30.5568,
        "lon": 79.5643
      }
    }
  ]
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Array of zones with current risk state. |
| `500` | DB/Redis failure. |

### Example cURL

```bash
curl https://hhlews.in/api/zones/risk
```

### Example Response

```json
{
  "zones": [
    {
      "id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
      "name": "Joshimath Slope Zone",
      "district_id": "8d3b2e10-9abc-4321-beef-fedbca123456",
      "risk_score": 0.88,
      "risk_level": "CRITICAL",
      "confidence": 0.92,
      "is_stale": false,
      "predicted_at": "2025-06-14T14:30:00Z",
      "centroid": { "lat": 30.5568, "lon": 79.5643 }
    }
  ]
}
```

---

## 1.6 GET /risk/:district

**Description:** Returns risk data scoped to a specific district, identified by name or UUID in the URL param. Includes a zone-level summary count by risk tier. Used by the DDMO dashboard to scope their operational view to jurisdiction. Extended sensor details returned only with valid JWT.

**Auth Required:** No (public fields); `Bearer` token for extended sensor overlay  
**Rate Limit:** 100 requests/min/IP

### Request Body

_None_

### Response Schema

```json
{
  "district": "Chamoli",
  "district_id": "uuid",
  "zones": [
    {
      "id": "uuid",
      "name": "string",
      "risk_score": 0.0,
      "risk_level": "LOW | MODERATE | HIGH | CRITICAL",
      "top_features": ["rainfall_mm_hr", "soil_saturation_pct"],
      "predicted_at": "ISO8601"
    }
  ],
  "summary": {
    "critical": 1,
    "high": 2,
    "moderate": 4,
    "low": 7
  }
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | District zones with risk summary. |
| `404` | District name or ID not found. |
| `500` | DB error. |

### Example cURL

```bash
curl https://hhlews.in/api/risk/Chamoli

# Or by UUID:
curl https://hhlews.in/api/risk/8d3b2e10-9abc-4321-beef-fedbca123456
```

### Example Response

```json
{
  "district": "Chamoli",
  "district_id": "8d3b2e10-9abc-4321-beef-fedbca123456",
  "zones": [
    {
      "id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
      "name": "Joshimath Slope Zone",
      "risk_score": 0.88,
      "risk_level": "CRITICAL",
      "top_features": ["rainfall_mm_hr", "soil_saturation_pct"],
      "predicted_at": "2025-06-14T14:30:00Z"
    }
  ],
  "summary": { "critical": 1, "high": 2, "moderate": 4, "low": 7 }
}
```

---

## 1.7 GET /safe-zones

**Description:** Returns all mapped safe shelter locations for Citizen PWA navigation. Supports optional filtering via query params `?zone_id=<uuid>` or `?district=<name>`. Returns Hindi landmark directions for zero-literacy navigation. No auth required.

**Auth Required:** No  
**Rate Limit:** 100 requests/min/IP

### Request Body

_None_

### Response Schema

```json
{
  "safe_zones": [
    {
      "id": "uuid",
      "zone_id": "uuid",
      "name": "Gram Panchayat Bhawan, Joshimath",
      "location": {
        "lat": 30.5571,
        "lon": 79.5651
      },
      "capacity": 250,
      "landmark_directions_hi": "बाजार से 200 मीटर उत्तर, पंचायत भवन"
    }
  ]
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Safe zone list returned. |
| `500` | DB error. |

### Example cURL

```bash
curl "https://hhlews.in/api/safe-zones?district=Chamoli"

# By zone:
curl "https://hhlews.in/api/safe-zones?zone_id=93a6c230-0114-4f82-a9c3-1234abcd5678"
```

### Example Response

```json
{
  "safe_zones": [
    {
      "id": "b2c3d4e5-f678-90ab-cdef-1234567890ab",
      "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
      "name": "Gram Panchayat Bhawan, Joshimath",
      "location": { "lat": 30.5571, "lon": 79.5651 },
      "capacity": 250,
      "landmark_directions_hi": "बाजार से 200 मीटर उत्तर, पंचायत भवन"
    }
  ]
}
```

---

## 1.8 GET /weather/live

**Description:** Returns the latest ingested weather reading for a given zone. Sourced from Redis cache (`key: weather:{lat}:{lon}`). Includes `is_stale: true` flag if data is older than 10 minutes or sourced from cache fallback. Requires `?zone_id=<uuid>` query param.

**Auth Required:** No  
**Rate Limit:** 100 requests/min/IP

### Request Body

_None_

### Response Schema

```json
{
  "zone_id": "uuid",
  "rainfall_mm_hr": 35.4,
  "rainfall_72h_mm": 180.2,
  "humidity_pct": 94,
  "pressure_hpa": 998,
  "temperature_c": 18.2,
  "wind_speed_ms": 3.1,
  "source": "openweathermap | openmeteo | cached",
  "is_stale": false,
  "recorded_at": "ISO8601"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Latest weather reading for zone. |
| `400` | Missing `zone_id` query param. |
| `404` | Zone not found. |
| `503` | Weather data unavailable for zone (all sources failed, no cache). |

### Example cURL

```bash
curl "https://hhlews.in/api/weather/live?zone_id=93a6c230-0114-4f82-a9c3-1234abcd5678"
```

### Example Response

```json
{
  "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
  "rainfall_mm_hr": 35.4,
  "rainfall_72h_mm": 180.2,
  "humidity_pct": 94,
  "pressure_hpa": 998,
  "temperature_c": 18.2,
  "wind_speed_ms": 3.1,
  "source": "openweathermap",
  "is_stale": false,
  "recorded_at": "2025-06-14T14:30:00Z"
}
```

---

## 1.9 POST /ml/predict _(FastAPI — Internal VPC Only)_

**Description:** Core ML inference endpoint. Accepts an assembled feature vector from the Celery inference worker. Runs RF + XGBoost ensemble pipeline, returns risk score, risk level, SHAP top features, and class probabilities. Protected by `X-Internal-API-Key` header. Port 8000 is **never** exposed externally — Nginx blocks `/ml/*` paths at the edge. Consumed exclusively by Celery `inference_queue` workers.

**Auth Required:** `X-Internal-API-Key` header (`ML_INTERNAL_API_KEY` env var)  
**Rate Limit:** 200 requests/min/key

### Request Body

```json
{
  "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
  "rainfall_mm_hr": 35.4,
  "rainfall_72h_mm": 180.2,
  "slope_degrees": 44.5,
  "aspect_avg": 220.0,
  "curvature": -0.12,
  "soil_saturation_pct": 89.2,
  "vibration_mps2": 1.2,
  "soil_type_code": 2,
  "historical_landslide_proximity_km": 1.5,
  "antecedent_rainfall_index": 145.6,
  "slope_x_rainfall": 1571.3,
  "saturation_velocity": 0.4
}
```

### Response Schema

```json
{
  "zone_id": "uuid",
  "risk_score": 0.88,
  "risk_level": "CRITICAL",
  "confidence": 0.92,
  "model_version": "v1.2.0",
  "top_features": [
    { "feature": "rainfall_mm_hr", "shap_value": 0.31 },
    { "feature": "soil_saturation_pct", "shap_value": 0.27 },
    { "feature": "slope_x_rainfall", "shap_value": 0.19 }
  ],
  "rf_class_probabilities": {
    "LOW": 0.02,
    "MODERATE": 0.06,
    "HIGH": 0.10,
    "CRITICAL": 0.82
  },
  "xgb_continuous_score": 0.91,
  "predicted_at": "ISO8601"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Inference successful. Full prediction response returned. |
| `401` | Missing or invalid `X-Internal-API-Key` header. |
| `422` | Pydantic validation failed — field out of range or missing required feature. |
| `500` | Model load failure or inference exception. |
| `503` | ML service unavailable — models not yet loaded. |

### Example cURL

```bash
# Internal call from Celery worker (VPC only):
curl -X POST http://hhlews-ml:8000/ml/predict \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: $ML_INTERNAL_API_KEY" \
  -d '{
    "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
    "rainfall_mm_hr": 35.4,
    "rainfall_72h_mm": 180.2,
    "slope_degrees": 44.5,
    "soil_saturation_pct": 89.2,
    "vibration_mps2": 1.2,
    "soil_type_code": 2,
    "historical_landslide_proximity_km": 1.5,
    "antecedent_rainfall_index": 145.6,
    "slope_x_rainfall": 1571.3,
    "saturation_velocity": 0.4
  }'
```

### Example Response

```json
{
  "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
  "risk_score": 0.88,
  "risk_level": "CRITICAL",
  "confidence": 0.92,
  "model_version": "v1.2.0",
  "top_features": [
    { "feature": "rainfall_mm_hr", "shap_value": 0.31 },
    { "feature": "soil_saturation_pct", "shap_value": 0.27 },
    { "feature": "slope_x_rainfall", "shap_value": 0.19 }
  ],
  "rf_class_probabilities": {
    "LOW": 0.02, "MODERATE": 0.06, "HIGH": 0.10, "CRITICAL": 0.82
  },
  "xgb_continuous_score": 0.91,
  "predicted_at": "2025-06-14T14:30:00Z"
}
```

---

## 1.10 POST /alerts/trigger

**Description:** Manual alert override by `DISTRICT_OFFICIAL` or `ADMIN`. Bypasses ML pipeline entirely. Validates district scope of the acting user — a DISTRICT_OFFICIAL can only trigger alerts in their assigned district. Immediately enqueues a Celery `dispatch_sms_batch` task. All triggers are immutably written to `audit_logs`. Enforces a 10/min per-user Redis rate limit to prevent accidental broadcast storms.

**Auth Required:** `Bearer <access_token>` — Role: `DISTRICT_OFFICIAL` or `ADMIN`  
**Rate Limit:** 10 requests/min/user (Redis-backed, per `user_id`)

### Request Body

```json
{
  "zone_id": "uuid",
  "risk_level": "HIGH | CRITICAL",
  "message_override_hi": "optional — custom Hindi message string",
  "channels": ["SMS", "WhatsApp", "IVR"]
}
```

### Response Schema

```json
{
  "alert_event_id": "uuid",
  "zone_id": "uuid",
  "risk_level": "CRITICAL",
  "triggered_by": "manual",
  "user_id": "uuid",
  "recipient_count": 342,
  "channels": ["SMS", "WhatsApp"],
  "celery_task_id": "task-uuid",
  "created_at": "ISO8601"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `201` | Alert triggered. Celery task enqueued. Returns `alert_event` record. |
| `400` | Invalid `risk_level` or missing `zone_id`. |
| `401` | No valid JWT. |
| `403` | Insufficient role or district mismatch. |
| `409` | Active cooldown in effect for this zone (within 30 min). Not returned if escalating to CRITICAL. |
| `429` | Rate limit exceeded — 10 manual triggers per user per minute. |

### Example cURL

```bash
curl -X POST https://hhlews.in/api/alerts/trigger \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
    "risk_level": "CRITICAL",
    "channels": ["SMS", "WhatsApp"]
  }'
```

### Example Response

```json
{
  "alert_event_id": "d4e5f6a7-b890-12cd-ef34-567890abcdef",
  "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
  "risk_level": "CRITICAL",
  "triggered_by": "manual",
  "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recipient_count": 342,
  "channels": ["SMS", "WhatsApp"],
  "celery_task_id": "4c2d1f9e-3b8a-4d7e-a2c1-9b6f5e4d3c2b",
  "created_at": "2025-06-14T14:35:00Z"
}
```

---

## 1.11 POST /alerts/suppress

**Description:** Suppresses ML-triggered alert dispatch for a specific zone. Sets Redis key `alert_suppress:{zone_id}` with a configurable TTL. Used by DDMO when a sensor is known-faulty and generating noise. All suppression actions are immutably logged to `audit_logs` — including the reason string.

**Auth Required:** `Bearer <access_token>` — Role: `DISTRICT_OFFICIAL` or `ADMIN`  
**Rate Limit:** 20 requests/min/user

### Request Body

```json
{
  "zone_id": "uuid",
  "reason": "Sensor fault — piezometer P003 offline",
  "duration_minutes": 60
}
```

> `duration_minutes` max: `1440` (24 hours). Default: `60`.

### Response Schema

```json
{
  "suppressed": true,
  "zone_id": "uuid",
  "suppressed_until": "ISO8601",
  "audit_log_id": "uuid"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Suppression applied. Auto-dispatch skipped until TTL expires. |
| `400` | Missing `zone_id`. |
| `401` | Unauthenticated. |
| `403` | Insufficient role or district mismatch. |

### Example cURL

```bash
curl -X POST https://hhlews.in/api/alerts/suppress \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
    "reason": "Sensor fault — piezometer P003 offline",
    "duration_minutes": 60
  }'
```

### Example Response

```json
{
  "suppressed": true,
  "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
  "suppressed_until": "2025-06-14T15:35:00Z",
  "audit_log_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

## 1.12 POST /subscribe

**Description:** Two-step citizen phone subscription flow. Step 1 sends OTP via SMS (6-digit, 10-min TTL). Step 2 verifies OTP and persists an AES-256 encrypted phone number against the zone. Phone numbers are never stored in plaintext. Deduplication via SHA-256 hash with unique constraint `(phone_hash, zone_id)`.

**Auth Required:** No (OTP-verified)  
**Rate Limit:** 5 requests/min/IP (Nginx hard gate)

### Request Body

```json
// Step 1 — Request OTP:
{
  "phone": "+919876543210",
  "zone_id": "uuid",
  "action": "request_otp"
}

// Step 2 — Verify OTP and subscribe:
{
  "phone": "+919876543210",
  "zone_id": "uuid",
  "otp": "482917",
  "action": "verify_otp"
}
```

### Response Schema

```json
// Step 1 response:
{ "otp_sent": true, "expires_in_seconds": 600 }

// Step 2 response:
{
  "subscribed": true,
  "zone_id": "uuid",
  "message": "आपको भूस्खलन चेतावनी मिलेगी।"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | OTP sent (step 1) or subscription confirmed (step 2). |
| `400` | Invalid phone format or missing required fields. |
| `401` | OTP verification failed — incorrect code. |
| `409` | Phone already subscribed to this zone. |
| `410` | OTP expired (> 10 minutes since issue). |
| `429` | Rate limit — 5 requests per minute per IP. |

### Example cURL

```bash
# Step 1 — Request OTP:
curl -X POST https://hhlews.in/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","zone_id":"93a6c230...","action":"request_otp"}'

# Step 2 — Verify and subscribe:
curl -X POST https://hhlews.in/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","zone_id":"93a6c230...","otp":"482917","action":"verify_otp"}'
```

### Example Response

```json
{
  "subscribed": true,
  "zone_id": "93a6c230-0114-4f82-a9c3-1234abcd5678",
  "message": "आपको भूस्खलन चेतावनी मिलेगी।"
}
```

---

## 1.13 POST /webhooks/twilio/status

**Description:** Twilio delivery receipt callback. Updates `alert_events.delivered_count` on confirmed SMS delivery. Validates the `X-Twilio-Signature` HMAC-SHA1 header on every request — invalid signatures return `400` immediately. Idempotent — duplicate `MessageSid` events are safely ignored via upsert logic.

**Auth Required:** `X-Twilio-Signature` (Twilio HMAC-SHA1 — not user auth)  
**Rate Limit:** None (Twilio-sourced traffic only)

### Request Body

```
// Twilio-formatted form body (application/x-www-form-urlencoded):
MessageSid=SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
&MessageStatus=delivered
&To=%2B919876543210
&From=HHLEWS
```

### Response Schema

```
// HTTP 204 No Content on success
// No response body
```

### Status Codes

| Code | Meaning |
|------|---------|
| `204` | Receipt processed. `delivered_count` updated. |
| `400` | Invalid Twilio HMAC signature — request not from Twilio. |
| `500` | DB update failed. |

### Example cURL

```bash
# Called by Twilio infrastructure — not manually invoked.
# Register webhook URL at: https://console.twilio.com → Messaging → Webhooks
# URL: https://hhlews.in/api/webhooks/twilio/status
```

### Example Response

```
HTTP 204 — No Content
```

---

## 1.14 WebSocket — wss://hhlews.in/realtime-risk

**Description:** Persistent WebSocket connection via Socket.io for sub-second dashboard updates. JWT passed as `auth.token` on connection. Clients join zone-specific or district-specific rooms to receive scoped events. Used exclusively by the Official Dashboard — Citizen PWA uses REST polling.

**Auth Required:** `Bearer <access_token>` passed in Socket.io `auth` option  
**Protocol:** Socket.io over WSS

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://hhlews.in', {
  path: '/realtime-risk',
  auth: { token: accessToken }  // JWT validated on connection handshake
});

// Join a specific zone room:
socket.emit('subscribe_zone', { zone_id: 'uuid' });

// Join all zones in a district (ADMIN / DISTRICT_OFFICIAL):
socket.emit('subscribe_district', { district_id: 'uuid' });
```

### Server → Client Events

| Event Name | Payload Example | Purpose |
|------------|-----------------|---------|
| `zone_risk_updated` | `{ zone_id, score: 0.88, level: "CRITICAL", predicted_at }` | Risk score changed — repaint map polygon |
| `alert_dispatched` | `{ zone_id, count: 342, channel: "SMS", level: "CRITICAL" }` | Alert sent — push toast notification |
| `sensor_offline` | `{ sensor_id, zone_id, time: "14:30Z" }` | Sensor LWT received — show hardware error icon |
| `system_health` | `{ db: "ok", ml: "ok", redis: "ok", stale_zones: 2 }` | 60-second system heartbeat |

### Client → Server Events

| Event Name | Payload | Action |
|------------|---------|--------|
| `subscribe_zone` | `{ zone_id: "uuid" }` | Join zone-specific room |
| `unsubscribe_zone` | `{ zone_id: "uuid" }` | Leave zone room |
| `subscribe_district` | `{ district_id: "uuid" }` | Join all zones in district |

> **Note:** Access tokens expire in 15 min. Client must implement silent refresh and Socket.io auto-reconnect with fresh token. Expired JWT on connection returns a `connect_error` event.

---

_HH-LEWS API Endpoints Documentation — v1.0 — Internal Engineering_
