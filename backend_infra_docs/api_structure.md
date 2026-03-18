# HH-LEWS — API Structure & Endpoints

## 1. REST Endpoint Grouping & Contract Overview

The API is segmented fundamentally between the **Internal ML Service (FastAPI)** and the **External Orchestration Gateway (Node.js)**. 

### Node.js Gateway Endpoints
*   **/api/zones/** (`GET`) - Retrieves geometric features and latest risk scores for PWA maps.
*   **/api/subscribe/** (`POST`) - Mobile citizen OTP subscriber hook for phone numbers.
*   **/api/alerts/trigger** (`POST`) - Manual DDMO override to broadcast SMS.
*   **/auth/** (`POST`) - `/login`, `/refresh`, `/logout` issuing RS256 JWTs.

### FastAPI Microservice Endpoints
*   **/predict** (`POST`) - Synchronous ML evaluation.
*   **/models/swap** (`POST`) - Dynamic memory hot-reload mapping a new `.pkl` object.

---

## 2. Public vs Private APIs

### Public Endpoints (Citizen Facing)
*No Auth Headers Required. Used strictly by the PWA and anonymous visitors.*
*   `GET /api/zones/risk` (Provides standard JSON objects of active zones with `risk_level` coloring)
*   `GET /api/safe-zones` 
*   `POST /api/subscribe`

### Private Endpoints (Admin / Official Facing)
*Requires `Authorization: Bearer <JWT>` containing `VIEWER`, `DISTRICT_OFFICIAL`, or `ADMIN` roles.*
*   `GET /api/dashboard/stats` 
*   `POST /api/alerts/trigger`
*   `POST /api/alerts/suppress` (For muting faulty sensors)

### Internal Only (VPC Access)
*Protected via Docker networking and `X-Internal-API-Key`. Never exposed to port 80/443.*
*   `POST /ml/predict`
*   `GET /ml/health` 

---

## 3. `/predict` Endpoint Contract

The `/predict` boundary represents the core integration between traditional Node/Relational logic and Data Science inference models.

**Method:** `POST /predict`
**Request Payload (JSON):**
```json
{
  "zone_id": "93a6c230-0114...",
  "rainfall_mm_hr": 35.4,
  "rainfall_72h_mm": 180.2,
  "slope_degrees": 44.5,
  "soil_saturation_pct": 89.2,
  "vibration_mps2": 1.2,
  "soil_type_code": 2,
  "historical_landslide_proximity_km": 1.5
}
```

**Response Payload (JSON):**
```json
{
  "zone_id": "93a6c230-0114...",
  "risk_score": 0.88,
  "risk_level": "CRITICAL",
  "confidence": 0.92,
  "model_version": "v1.2.0",
  "top_features": ["rainfall_mm_hr", "soil_saturation_pct"],
  "predicted_at": "2025-06-14T14:30:00Z"
}
```

---

## 4. Alert Trigger Flow

When a trigger fires (`risk_score >= 0.65` for two consecutive intervals), or a manual API push validates:
1.  Node.js intercepts the boundary logic and checks Redis TTL keys `alert_cooldown:{zone_id}`.
2.  If cleared, Node issues query to Postgres `SELECT phone_encrypted FROM subscribers WHERE zone_id = ?`.
3.  Payload strings constructed utilizing Hindi templates (e.g. `⚠️ भूस्खलन खतरा...`).
4.  Tasks injected into Celery via Redis broker (`dispatch_sms_batch`).
5.  WebHooks from Twilio hit `POST /api/webhooks/twilio/status` updating DB `alert_events.delivered_count`.

---

## 5. WebSocket Channels Design

To maintain sub-second state on the Admin Dashboard Leaflet Maps without heavy REST polling:

| Event Name | Direction | Payload Example | Purpose |
| :--- | :--- | :--- | :--- |
| `subscribe_zone` | Client -> Server | `{ zone_id: 'uuid' }` | Joins unique Socket room |
| `zone_risk_updated` | Server -> Client | `{ zone_id: 'uuid', score: 0.88, level: 'CRITICAL' }` | Paints map polygon red |
| `alert_dispatched` | Server -> Client | `{ zone_id: 'uuid', count: 342, channel: 'SMS' }` | Pushes toast notification |
| `sensor_offline` | Server -> Client | `{ sensor_id: 'xyz', time: '14:30' }` | Highlights map hardware anomaly |

---

## 6. Rate Limits & Throttling
Protects upstream cloud costs (OpenWeather API / Twilio SMS Credits).

**Nginx Rate Limit Groups:**
*   **Public API Limit:** `100 requests / minute` per IP address. Ensures PWA anonymous users do not spam basic `.json` fetching.
*   **OTP & Subscription:** `5 requests / minute` per IP. Strict DDoS gate on the Twilio SMS verifier.
*   **Official Triggers limit:** Express limits manual API triggers to `10 per minute per User` stored in Redis `express-rate-limit`. Prevents accidental double-clicks broadcasting thousands of duplicate SMS warnings.
