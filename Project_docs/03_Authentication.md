# HH-LEWS — Authentication Requirements Document

**Version:** 1.0 | **Algorithm:** RS256 JWT | **Session Store:** Redis 7  
**Classification:** Internal — Engineering / Security

---

## Index

1. [Authentication Model Overview](#1-authentication-model-overview)
2. [Role Definitions](#2-role-definitions)
3. [JWT Structure](#3-jwt-structure)
4. [Access Control Matrix](#4-access-control-matrix)
5. [Refresh Token Flow](#5-refresh-token-flow)
6. [Token Expiry Reference](#6-token-expiry-reference)
7. [API Key Handling](#7-api-key-handling)
8. [SMS Abuse Prevention Logic](#8-sms-abuse-prevention-logic)
9. [RBAC Middleware Implementation](#9-rbac-middleware-implementation)
10. [Password Policy](#10-password-policy)
11. [MQTT Authentication](#11-mqtt-authentication)

---

## 1. Authentication Model Overview

HH-LEWS uses a **two-tier authentication model**:

| Tier | Who | Method | Why |
|------|-----|--------|-----|
| **Unauthenticated (Public)** | Citizens, anonymous PWA users | None | Requiring login before showing risk level creates a barrier that could cost lives |
| **JWT-Authenticated (Officials)** | ADMIN, DISTRICT_OFFICIAL, VIEWER | RS256 JWT + httpOnly refresh cookie | Full dashboard access, alert control, audit accountability |

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTH DECISION TREE                            │
│                                                                  │
│  Request hits /api/*                                             │
│         │                                                        │
│         ├── /zones/risk, /districts, /safe-zones, /weather/live  │
│         │   /risk/:district, /subscribe, /auth/*                 │
│         │   → PUBLIC — no auth check, proceed                    │
│         │                                                        │
│         ├── /dashboard/*, /alerts/trigger, /alerts/suppress      │
│         │   /models/swap, /users                                 │
│         │   → requireAuth middleware                             │
│         │   → JWT validation (RS256, issuer, audience, expiry)   │
│         │   → requireRole(...allowedRoles)                       │
│         │   → requireDistrictAccess (for DISTRICT_OFFICIAL)      │
│         │   → proceed to handler                                 │
│         │                                                        │
│         └── /ml/* (VPC internal)                                 │
│             → X-Internal-API-Key header validation               │
│             → Nginx blocks this path from public internet        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Role Definitions

### 2.1 User-Facing Roles

| Role | Scope | Description |
|------|-------|-------------|
| `ADMIN` | System-wide | Full system access. No district restriction. Can manage users, swap ML models, trigger/suppress alerts in any district, export data, read audit logs. |
| `DISTRICT_OFFICIAL` | Assigned district only | Can trigger and suppress alerts only within `district_id` matching their JWT claim. Cannot manage users or swap models. |
| `VIEWER` | System-wide | Read-only access to dashboard, risk history, sensor status. No write operations of any kind. |

### 2.2 Internal Service Roles (Not JWT-based)

| Role | Auth Method | Access |
|------|-------------|--------|
| `ML_SERVICE` | `X-Internal-API-Key` header | `POST /ml/predict` only. No HTTP API access beyond this. Port 8000 is VPC-internal only. |
| `SENSOR_SERVICE` | MQTT username/password + client cert | Publish to `sensors/#` topics only. No HTTP API access. |

### 2.3 Citizen (No Role)

Citizens are not registered in the `users` table. They:
- Access all public `GET` endpoints without any token.
- Subscribe via OTP-verified phone number (no account created).
- Cannot access any dashboard endpoint.

---

## 3. JWT Structure

### 3.1 Algorithm & Configuration

```javascript
// config/jwt.js
const JWT_CONFIG = {
  algorithm:          'RS256',          // Asymmetric — private key signs, public key verifies
  accessTokenExpiry:  '15m',            // Short window reduces stolen-token blast radius
  refreshTokenExpiry: '7d',             // Stored only in httpOnly Secure cookie
  issuer:             'hhlews-api',
  audience:           'hhlews-dashboard',
  privateKey:         process.env.JWT_PRIVATE_KEY,   // RSA-4096 PEM — from AWS Secrets Manager
  publicKey:          process.env.JWT_PUBLIC_KEY,    // RSA-4096 PEM — can be distributed
};
```

**Why RS256 over HS256:**  
RS256 allows multiple services (e.g., FastAPI ML, future microservices) to verify tokens using only the public key — they never hold the signing secret.

### 3.2 Token Header

```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

### 3.3 Access Token Payload

```json
{
  "sub":         "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email":       "collector@chamoli.gov.in",
  "role":        "DISTRICT_OFFICIAL",
  "district_id": "8d3b2e10-9abc-4321-beef-fedbca123456",
  "iss":         "hhlews-api",
  "aud":         "hhlews-dashboard",
  "iat":         1718372400,
  "exp":         1718373300
}
```

> `exp = iat + 900` (15 minutes). No sensitive PII beyond email. Phone numbers are **never** in JWT.

### 3.4 Token Issuance

```javascript
// services/auth.service.js
const jwt = require('jsonwebtoken');

function issueAccessToken(user) {
  return jwt.sign(
    {
      sub:         user.id,
      email:       user.email,
      role:        user.role,
      district_id: user.district_id ?? null,
    },
    JWT_CONFIG.privateKey,
    {
      algorithm: JWT_CONFIG.algorithm,
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer:    JWT_CONFIG.issuer,
      audience:  JWT_CONFIG.audience,
    }
  );
}

function issueRefreshToken(user) {
  const token = crypto.randomBytes(64).toString('hex');
  const hash  = crypto.createHash('sha256').update(token).digest('hex');

  // Store hash in Redis with user context:
  redis.setex(
    `refresh:${hash}`,
    7 * 24 * 60 * 60,  // 7 days TTL
    JSON.stringify({ user_id: user.id, role: user.role, district_id: user.district_id })
  );

  return token;  // Raw token sent as httpOnly cookie
}
```

### 3.5 Token Verification

```javascript
// middleware/auth.js
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.publicKey, {
      algorithms: [JWT_CONFIG.algorithm],
      issuer:     JWT_CONFIG.issuer,
      audience:   JWT_CONFIG.audience,
    });
    req.user = decoded;  // { sub, email, role, district_id, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 4. Access Control Matrix

| Endpoint | ADMIN | DISTRICT_OFFICIAL | VIEWER | Public (No Auth) |
|----------|-------|-------------------|--------|------------------|
| `GET /zones/risk` | ✓ | ✓ | ✓ | ✓ |
| `GET /districts` | ✓ | ✓ | ✓ | ✓ |
| `GET /risk/:district` | ✓ | Own district | ✓ | ✓ |
| `GET /safe-zones` | ✓ | ✓ | ✓ | ✓ |
| `GET /weather/live` | ✓ | ✓ | ✓ | ✓ |
| `POST /subscribe` | ✓ | ✓ | ✓ | ✓ (OTP) |
| `POST /auth/login` | ✓ | ✓ | ✓ | ✓ |
| `POST /auth/refresh` | ✓ | ✓ | ✓ | Cookie only |
| `POST /auth/logout` | ✓ | ✓ | ✓ | ✗ |
| `GET /dashboard/stats` | ✓ | ✓ | ✓ | ✗ |
| `POST /alerts/trigger` | ✓ | Own district only | ✗ | ✗ |
| `POST /alerts/suppress` | ✓ | Own district only | ✗ | ✗ |
| `POST /ml/predict` (VPC) | ✗ | ✗ | ✗ | API Key only |
| `POST /models/swap` | ✓ | ✗ | ✗ | ✗ |
| `POST /users` (create) | ✓ | ✗ | ✗ | ✗ |
| `GET /audit-logs` | ✓ | ✗ | ✗ | ✗ |
| `WS /realtime-risk` | All zones | Own district | All (read-only) | ✗ |

> **District access rule:** `DISTRICT_OFFICIAL` middleware validates `req.user.district_id === target_zone.district_id`. A mismatch returns `403` regardless of other checks.

---

## 5. Refresh Token Flow

### 5.1 Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        JWT AUTH FLOW                                  │
│                                                                      │
│  1. POST /auth/login                                                 │
│     { email, password }                                              │
│         │                                                            │
│         ▼                                                            │
│     bcrypt.compare(password, user.password_hash)                    │
│         │                                                            │
│         ├── FAIL → 401                                               │
│         │                                                            │
│         └── PASS                                                     │
│             ├── Issue access_token (RS256, 15m)                      │
│             ├── Issue refresh_token (random 64-byte hex)             │
│             ├── Store SHA-256(refresh_token) in Redis (7d TTL)       │
│             └── Set httpOnly Secure SameSite=Strict cookie           │
│                                                                      │
│  2. Client uses access_token in Authorization: Bearer header         │
│                                                                      │
│  3. access_token expires → client receives 401 { code: TOKEN_EXPIRED}│
│                                                                      │
│  4. Client silently POSTs /auth/refresh (with cookie)                │
│         │                                                            │
│         ▼                                                            │
│     hash = SHA-256(cookie_value)                                     │
│     redis.get(`refresh:${hash}`)                                     │
│         │                                                            │
│         ├── NOT FOUND / expired → 401 → redirect to login           │
│         │                                                            │
│         └── FOUND                                                    │
│             ├── DELETE old `refresh:${hash}` (one-time-use)          │
│             ├── Issue new access_token                               │
│             ├── Issue new refresh_token                              │
│             ├── Store new hash in Redis                              │
│             └── Set new cookie                                       │
│                                                                      │
│  5. POST /auth/logout                                                │
│     ├── DELETE `refresh:${hash}` from Redis                         │
│     └── Set-Cookie: refresh_token=; Max-Age=0 (clear cookie)        │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Redis Key Structure

```
Key:   refresh:{sha256_of_raw_token}
Value: JSON string — { user_id, role, district_id, issued_at }
TTL:   604800 seconds (7 days)

Example:
  Key:   refresh:a3f8e2c1d4b5...
  Value: {"user_id":"3fa85f64...","role":"DISTRICT_OFFICIAL","district_id":"8d3b2e10...","issued_at":1718372400}
  TTL:   604800
```

### 5.3 Logout Implementation

```javascript
// controllers/auth.controller.js
async function logout(req, res) {
  const refreshToken = req.cookies['refresh_token'];

  if (refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await redis.del(`refresh:${hash}`);
  }

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict'
  });

  // Write audit log:
  await prisma.auditLog.create({
    data: {
      entity:     'USER',
      entity_id:  req.user.sub,
      action:     'LOGOUT',
      user_id:    req.user.sub,
      ip_address: req.ip,
    }
  });

  return res.status(200).json({ message: 'Logged out successfully' });
}
```

---

## 6. Token Expiry Reference

| Token Type | Expiry | Storage Location | Revocation Method |
|------------|--------|-----------------|-------------------|
| Access Token (JWT) | 15 minutes | Client memory (React state) — NOT localStorage | Not revocable. Natural expiry. |
| Refresh Token | 7 days | httpOnly; Secure; SameSite=Strict cookie | Redis `DEL` on logout or rotation |
| OTP (subscriber) | 10 minutes | Redis `otp:{sha256_of_phone}` | Auto-expire TTL + single-use delete on verify |
| ML Internal API Key | Static (no expiry) | AWS Secrets Manager | Manual rotation; Celery worker restart required |
| Password Reset Token | 24 hours | Redis `pwd_reset:{token_hash}` | Auto-expire TTL + delete on use |

> **Security note:** Access tokens are intentionally non-revocable to avoid the distributed state problem. The 15-minute window is short enough to be acceptable. In a P0 incident, disable the user account (`is_active = false`) — the next access token verification returns `403`, and the refresh token is deleted from Redis on the next refresh attempt.

---

## 7. API Key Handling

### 7.1 ML Internal API Key

```javascript
// FastAPI middleware (Python):
from fastapi import Request, HTTPException
import os

ML_INTERNAL_API_KEY = os.environ['ML_INTERNAL_API_KEY']  # Loaded from AWS Secrets Manager

async def verify_internal_key(request: Request):
    key = request.headers.get('X-Internal-API-Key')
    if not key or key != ML_INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail='Invalid internal API key')
```

**Key properties:**
- 256-bit random string (32 bytes → 64 hex chars)
- Stored in AWS Secrets Manager (`hhlews/prod/ml_internal_api_key`)
- Injected at container startup via environment — never in code or Docker image
- Rotated quarterly; Celery workers restart after rotation (no downtime — rolling restart)
- Nginx hard-blocks `/ml/*` path from public internet — key is last-resort defense

### 7.2 Weather API Key (OpenWeatherMap)

```python
# Celery polling worker — server-side only:
OPENWEATHERMAP_API_KEY = os.environ['OPENWEATHERMAP_API_KEY']  # From AWS Secrets Manager

# Usage:
url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHERMAP_API_KEY}"
```

- **Never** sent to frontend or included in API responses
- **Never** in Node.js API layer — only in Celery Python workers
- Rotated every 90 days
- Backup key (`OPENWEATHERMAP_BACKUP_API_KEY`) used on failover automatically

### 7.3 Twilio Credentials

```python
# Celery alert worker — server-side only:
TWILIO_ACCOUNT_SID = os.environ['TWILIO_ACCOUNT_SID']
TWILIO_AUTH_TOKEN  = os.environ['TWILIO_AUTH_TOKEN']

from twilio.rest import Client
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
```

**Webhook validation** (for Twilio delivery callbacks):

```javascript
// middleware/twilioWebhook.js
const twilio = require('twilio');

function validateTwilioSignature(req, res, next) {
  const signature = req.headers['x-twilio-signature'];
  const url       = `https://hhlews.in${req.originalUrl}`;
  const params    = req.body;

  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    params
  );

  if (!valid) {
    return res.status(400).json({ error: 'Invalid Twilio signature' });
  }
  next();
}
```

### 7.4 Secrets Inventory

| Secret | Storage | Rotation Frequency |
|--------|---------|-------------------|
| `JWT_PRIVATE_KEY` (RSA-4096) | AWS Secrets Manager | Annually |
| `JWT_PUBLIC_KEY` (RSA-4096) | Environment variable | With private key |
| `DATABASE_URL` | AWS Secrets Manager | Quarterly |
| `REDIS_PASSWORD` | AWS Secrets Manager | Quarterly |
| `PHONE_ENCRYPTION_KEY` (Fernet 32-byte) | AWS Secrets Manager | Annually — **back up separately** |
| `OPENWEATHERMAP_API_KEY` | AWS Secrets Manager | 90 days |
| `TWILIO_ACCOUNT_SID` | AWS Secrets Manager | On compromise |
| `TWILIO_AUTH_TOKEN` | AWS Secrets Manager | Quarterly |
| `ML_INTERNAL_API_KEY` | AWS Secrets Manager | Quarterly |
| `MQTT_PASSWORDS` | AWS Secrets Manager | Quarterly |

> `PHONE_ENCRYPTION_KEY` loss renders all stored subscriber phone numbers permanently unrecoverable. Store a physical backup in a secure offline location.

---

## 8. SMS Abuse Prevention Logic

Seven independent layers prevent SMS bombing, API cost exploitation, and subscriber spam.

### Layer 1 — Nginx Rate Limit on `/subscribe`

```nginx
limit_req_zone $binary_remote_addr zone=subscribe:10m rate=5r/m;

location /api/subscribe {
    limit_req zone=subscribe burst=2 nodelay;
    limit_req_status 429;
}
```

Hard gate: 5 requests per minute per IP. Burst of 2 then immediate 429.

### Layer 2 — OTP Verification Required

No subscription without OTP verification. Every phone number receives an OTP before any record is written. This means:
- Mass-registering fake numbers requires SMS delivery to each number.
- Attackers cannot subscribe arbitrary numbers without receiving the OTP.

```javascript
// OTP storage in Redis:
const otp        = Math.floor(100000 + Math.random() * 900000).toString();
const phone_hash = crypto.createHash('sha256').update(phone).digest('hex');

await redis.setex(`otp:${phone_hash}`, 600, otp);  // 10-minute TTL

// OTP verification:
const stored = await redis.get(`otp:${phone_hash}`);
if (!stored || stored !== req.body.otp) {
  return res.status(401).json({ error: 'Invalid or expired OTP' });
}
await redis.del(`otp:${phone_hash}`);  // Single-use: delete on verify
```

### Layer 3 — Phone Deduplication via SHA-256 Hash

```javascript
// Before writing subscriber record:
const phone_hash = crypto.createHash('sha256').update(phone).digest('hex');

// DB unique constraint: (phone_hash, zone_id)
// Prevents same number subscribing to same zone multiple times.
// Returns 409 Conflict if duplicate detected.
```

### Layer 4 — Alert Cooldown per Zone (30 minutes)

```python
# Redis key: alert_cooldown:{zone_id}
# Set after every dispatch. TTL = 1800s (30 minutes)
# ML auto-dispatch checks this before enqueueing Celery task.

cooldown_key = f"alert_cooldown:{zone_id}"
if redis.exists(cooldown_key):
    return  # Skip dispatch — within cooldown window
```

### Layer 5 — Manual Trigger Rate Limit (per user, Redis-backed)

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const alertLimiter = rateLimit({
  windowMs:  60 * 1000,          // 1-minute window
  max:       10,                 // Max 10 triggers per user per minute
  store:     new RedisStore({ client: redisClient }),
  keyGenerator: (req) => req.user.sub,  // Per user_id, not per IP
  message:   { error: 'Too many alert triggers. Please wait.' },
});

router.post('/alerts/trigger', requireAuth, alertLimiter, triggerAlert);
```

### Layer 6 — Alert Suppression Flag

```python
# DISTRICT_OFFICIAL sets suppression for faulty sensors:
# Redis key: alert_suppress:{zone_id}
# TTL: duration_minutes (max 1440 = 24 hours)

suppress_key = f"alert_suppress:{zone_id}"
if redis.exists(suppress_key):
    log_suppressed_alert(zone_id, risk_score)
    return  # Do not dispatch
```

### Layer 7 — Celery Pre-Dispatch Deduplication

```python
def should_dispatch_alert(zone_id: str, risk_level: str) -> bool:
    """
    Final gate before Celery task enqueues SMS dispatch.
    Checks both cooldown AND level escalation logic.
    """
    cooldown_key = f"alert_cooldown:{zone_id}"
    suppress_key = f"alert_suppress:{zone_id}"

    # Suppression check (faulty sensor — hard block)
    if redis.exists(suppress_key):
        return False

    # Cooldown check with escalation exception
    existing = redis.get(cooldown_key)
    if existing:
        current_level = existing.decode()
        level_order = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']
        # Only dispatch if escalating (e.g., HIGH → CRITICAL)
        if level_order.index(risk_level) <= level_order.index(current_level):
            return False  # Same or lower level within cooldown — skip

    return True  # Dispatch approved
```

### Abuse Prevention Summary Table

| Layer | Mechanism | Limits |
|-------|-----------|--------|
| 1 | Nginx rate limit on `/subscribe` | 5 req/min/IP |
| 2 | OTP verification before subscription | Manual step required per phone |
| 3 | SHA-256 dedup, DB unique constraint | 1 subscription per phone per zone |
| 4 | Zone alert cooldown (Redis TTL) | 1 alert per zone per 30 min (auto) |
| 5 | Manual trigger rate limit (Redis) | 10 triggers/min/user |
| 6 | Alert suppression flag (DDMO) | Up to 24 hours per zone |
| 7 | Celery pre-dispatch dedup | Level-aware escalation gate |

---

## 9. RBAC Middleware Implementation

### 9.1 requireRole

```javascript
// middleware/rbac.js

const requireRole = (...allowedRoles) => (req, res, next) => {
  const { role } = req.user;  // Decoded from verified JWT

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      required: allowedRoles,
      actual: role,
    });
  }
  next();
};
```

### 9.2 requireDistrictAccess

```javascript
const requireDistrictAccess = async (req, res, next) => {
  const { role, district_id } = req.user;

  // ADMIN bypasses all district checks
  if (role === 'ADMIN') return next();

  // Determine target district from request
  const zone_id = req.params.zone_id || req.body.zone_id;

  if (!zone_id) {
    return res.status(400).json({ error: 'zone_id required for district access check' });
  }

  const zone = await prisma.zone.findUnique({
    where:  { id: zone_id },
    select: { district_id: true }
  });

  if (!zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  if (zone.district_id !== district_id) {
    return res.status(403).json({ error: 'District access denied' });
  }

  next();
};
```

### 9.3 Route-Level Application

```javascript
// routes/alerts.js
router.post(
  '/trigger',
  requireAuth,
  requireRole('DISTRICT_OFFICIAL', 'ADMIN'),
  requireDistrictAccess,
  alertLimiter,
  triggerAlert
);

router.post(
  '/suppress',
  requireAuth,
  requireRole('DISTRICT_OFFICIAL', 'ADMIN'),
  requireDistrictAccess,
  suppressAlert
);

// routes/models.js
router.post(
  '/swap',
  requireAuth,
  requireRole('ADMIN'),     // ADMIN only — no district check needed
  swapModel
);

// routes/zones.js
router.get(
  '/risk',
  // No middleware — public endpoint
  getZonesRisk
);
```

---

## 10. Password Policy

| Requirement | Specification |
|-------------|--------------|
| Minimum length | 12 characters |
| Required character types | Uppercase, lowercase, digit, special character |
| Hashing algorithm | bcrypt, cost factor 12 |
| Reset mechanism | Email link (24-hour TTL token, stored as SHA-256 hash in Redis) |
| Failed login tracking | Soft lock after 10 failures within 5 minutes (Redis counter) |
| Plaintext storage | Never — `password_hash` column only |

```javascript
// Password hash on creation:
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

const password_hash = await bcrypt.hash(req.body.password, SALT_ROUNDS);

// Verification on login:
const valid = await bcrypt.compare(req.body.password, user.password_hash);
if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
```

---

## 11. MQTT Authentication

Sensor clients (real hardware in Phase 2, simulator script in Phase 1) connect to the Mosquitto broker. Anonymous connections are rejected.

### 11.1 Broker Config

```conf
# /mosquitto/config/mosquitto.conf
allow_anonymous false
password_file   /mosquitto/config/passwd

# TLS (Phase 2 hardware):
require_certificate true
cafile  /mosquitto/certs/ca.crt
certfile /mosquitto/certs/server.crt
keyfile  /mosquitto/certs/server.key
tls_version tlsv1.3
```

### 11.2 Sensor Credentials

Each sensor is provisioned with a unique MQTT username/password:

```bash
# Add sensor credential to broker password file:
mosquitto_passwd -b /mosquitto/config/passwd sensor_p003_zone_93a6 <generated_password>

# Phase 2: additionally issue per-sensor client certificate signed by CA
```

### 11.3 Topic ACL

```conf
# /mosquitto/config/acl.conf
# Sensors can only publish to their own topic namespace:
user sensor_p003_zone_93a6
topic write sensors/93a6c230-0114-4f82-a9c3-1234abcd5678/sensor_p003/readings
topic write sensors/93a6c230-0114-4f82-a9c3-1234abcd5678/sensor_p003/status

# Celery subscriber worker can read all sensor topics:
user celery_mqtt_worker
topic read sensors/#
```

### 11.4 LWT (Last Will and Testament)

When a sensor disconnects without a clean DISCONNECT packet (e.g., hardware failure, network cut):

```python
# MQTT client configuration (sensor simulator):
mqtt_client.will_set(
    topic   = f"sensors/{zone_id}/{sensor_id}/status",
    payload = json.dumps({ "status": "offline", "ts": int(time.time()) }),
    qos     = 1,
    retain  = False
)
```

The Celery MQTT subscriber worker handles this:

```python
# Celery MQTT worker on status message:
def on_message(client, userdata, msg):
    payload = json.loads(msg.payload)
    if payload.get("status") == "offline":
        # Update sensor status in DB
        update_sensor_status(sensor_id, "offline")
        # Emit WebSocket event to dashboard
        socketio.emit("sensor_offline", { "sensor_id": sensor_id, "zone_id": zone_id })
```

---

_HH-LEWS Authentication Requirements Document — v1.0 — Internal Engineering / Security_
