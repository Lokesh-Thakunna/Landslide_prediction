# HH-LEWS — Security Architecture Document

**Document Version:** 1.0.0  
**Last Updated:** 2025-06-14  
**Status:** Active  
**Owner:** HH-LEWS Security Lead  
**Classification:** Internal — Engineering

---

## Table of Contents

1. [Threat Model](#1-threat-model)
2. [Authentication Model](#2-authentication-model)
3. [Authorization & RBAC](#3-authorization--rbac)
4. [API Security](#4-api-security)
5. [Rate Limiting](#5-rate-limiting)
6. [Data Privacy — Phone Numbers](#6-data-privacy--phone-numbers)
7. [Secure Weather API Handling](#7-secure-weather-api-handling)
8. [Input Validation & Injection Prevention](#8-input-validation--injection-prevention)
9. [Alert Spam Prevention](#9-alert-spam-prevention)
10. [Deployment Security Hardening](#10-deployment-security-hardening)
11. [Secrets Management](#11-secrets-management)
12. [Incident Response](#12-incident-response)
13. [Compliance Considerations](#13-compliance-considerations)
14. [Security Checklist](#14-security-checklist)

---

## 1. Threat Model

### 1.1 STRIDE Analysis

| Threat Category | Attack Vector | Asset at Risk | Likelihood | Impact | Mitigation |
|----------------|---------------|---------------|------------|--------|------------|
| **Spoofing** | Forged JWT token | Official dashboard access | Medium | Critical | Token signing, short expiry, refresh rotation |
| **Spoofing** | Fake MQTT sensor payload | False risk scores → missed alerts or false alarms | Medium | High | MQTT authentication + payload schema validation |
| **Tampering** | SQL injection via API | Database corruption, data exfiltration | Low | Critical | Parameterized queries, ORM, input validation |
| **Tampering** | Malicious SRTM data file | Incorrect slope features → wrong ML output | Low | High | File checksum validation at ingest |
| **Repudiation** | Official triggers false alert then denies | Legal/accountability issues | Low | High | Full audit log with user ID, timestamp, IP |
| **Information Disclosure** | Phone number exposure | Privacy of 100,000+ subscribers | Medium | Critical | AES-256 encryption at rest, no PII in logs |
| **Information Disclosure** | API key leakage | Weather API cost run-up | Medium | Medium | Env vars, secret rotation, server-side only |
| **Denial of Service** | Flood `/predict` endpoint | ML service unresponsive, missed alerts | Medium | Critical | Rate limiting, auth on ML endpoints, queue protection |
| **Denial of Service** | SMS flood via alert API | Financial cost, carrier blocking | Low | High | Alert cooldown, manual trigger auth, rate limiting |
| **Elevation of Privilege** | VIEWER role accessing admin endpoints | Unauthorized alert suppression | Low | High | RBAC middleware on all routes |

### 1.2 High-Priority Threat Scenarios

**Scenario A: SMS Bombing via Unauthenticated Alert Endpoint**  
An attacker discovers the internal alert dispatch endpoint and triggers bulk SMS to all 100,000 subscribers. Cost: ~₹35,000–50,000 per broadcast. Mitigation: Alert dispatch endpoints require JWT with `DISTRICT_OFFICIAL` or `ADMIN` role. Internal Celery tasks are not exposed externally. Nginx blocks all non-`/api/` paths.

**Scenario B: MQTT Sensor Impersonation**  
An attacker publishes fake sensor readings with high vibration and saturation values to force a CRITICAL alert. Mitigation: MQTT client certificates + username/password authentication. Schema validation rejects readings outside physical plausible ranges (e.g., `vibration > 50 m/s²` flagged as anomalous).

**Scenario C: Mass Phone Number Exfiltration**  
A SQL injection or authenticated user with DB access exports subscriber phone numbers. Mitigation: Phone numbers encrypted at rest (AES-256). Even with raw DB access, phone numbers are unreadable without the encryption key, which is stored in AWS Secrets Manager, not in the database.

**Scenario D: ML Model Poisoning**  
An attacker with write access to the model directory replaces the ML model with one that always outputs LOW risk. Mitigation: Model files include SHA-256 checksums verified on load. Model directory is not writable by application user. Hot-swap endpoint requires `ADMIN` JWT.

---

## 2. Authentication Model

### 2.1 Citizen PWA — No Authentication Required

The citizen-facing PWA is intentionally **unauthenticated** for risk viewing. Requiring login before showing a risk level creates a barrier that could cost lives. Citizens can:
- View current risk for any zone (public data).
- Subscribe their phone number (simple form with phone verification via OTP).
- View safe zones and emergency contacts.

Phone number subscription uses **OTP verification** (6-digit SMS code, 10-minute TTL) to prevent bulk fake registrations.

### 2.2 Official Dashboard — JWT Authentication

```
┌─────────────────────────────────────────────────────────────┐
│                  JWT AUTH FLOW                               │
│                                                             │
│  POST /auth/login                                           │
│  {email, password} ──────▶ Verify bcrypt hash in DB        │
│                            │                               │
│                            ▼                               │
│                     Issue JWT (access_token)               │
│                     + Refresh Token (httpOnly cookie)       │
│                            │                               │
│  access_token              │                               │
│  ← 15 minute expiry        │                               │
│  ← Signed with RS256        │                               │
│  ← Payload: {user_id,      │                               │
│    role, district, iat,    │                               │
│    exp}                    │                               │
│                                                             │
│  POST /auth/refresh                                         │
│  (httpOnly cookie) ────▶ Validate refresh token (Redis)    │
│                          Issue new access_token             │
│                                                             │
│  POST /auth/logout                                          │
│  ────────────────▶ Blacklist refresh token in Redis        │
└─────────────────────────────────────────────────────────────┘
```

**JWT Configuration:**
```javascript
const JWT_CONFIG = {
  algorithm: 'RS256',           // Asymmetric — private key signs, public key verifies
  accessTokenExpiry: '15m',     // Short-lived; reduces stolen token window
  refreshTokenExpiry: '7d',     // Stored in httpOnly cookie (CSRF-resistant)
  issuer: 'hhlews-api',
  audience: 'hhlews-dashboard',
};
```

**Password Requirements:**
- Minimum 12 characters.
- Must include uppercase, lowercase, number, special character.
- bcrypt hashing with cost factor 12.
- Password reset via email link (24-hour TTL token).

### 2.3 Service-to-Service Authentication

Internal service communication (Node.js API → FastAPI ML service) uses a shared API key:
- `ML_INTERNAL_API_KEY` — 256-bit random string.
- Passed as `X-Internal-API-Key` header.
- ML service validates on every request.
- FastAPI ML service binds to `0.0.0.0:8000` inside Docker network only — not exposed externally.

### 2.4 MQTT Authentication

```
# mosquitto.conf
allow_anonymous false
password_file /mosquitto/config/passwd
require_certificate true
cafile /mosquitto/certs/ca.crt
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key
```

Each sensor has a unique MQTT username/password. Client certificates issued per sensor for Phase 2 hardware.

---

## 3. Authorization & RBAC

### 3.1 Role Definitions

| Role | Scope | Permissions |
|------|-------|-------------|
| `ADMIN` | System-wide | All operations: user management, model swap, zone config, alert trigger/suppress, data export |
| `DISTRICT_OFFICIAL` | Assigned district | View all zones in district; trigger/suppress alerts in district; view subscriber counts; export district reports |
| `VIEWER` | System-wide | Read-only: view risk map, alert history, sensor status; no write operations |
| `SENSOR_SERVICE` | Internal | MQTT publish; no HTTP API access |
| `ML_SERVICE` | Internal | POST /predict only; no data access |

### 3.2 RBAC Middleware (Node.js)

```javascript
// middleware/rbac.js
const requireRole = (...allowedRoles) => (req, res, next) => {
  const { role, district } = req.user; // Decoded from JWT
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireDistrictAccess = (req, res, next) => {
  const { role, district } = req.user;
  const targetDistrict = req.params.district || req.body.district;
  if (role === 'ADMIN') return next(); // Admin has cross-district access
  if (district !== targetDistrict) {
    return res.status(403).json({ error: 'District access denied' });
  }
  next();
};

// Usage
router.post('/alerts/trigger', requireAuth, requireRole('DISTRICT_OFFICIAL', 'ADMIN'), requireDistrictAccess, triggerAlert);
router.post('/models/swap', requireAuth, requireRole('ADMIN'), swapModel);
router.get('/zones', requireAuth, requireRole('VIEWER', 'DISTRICT_OFFICIAL', 'ADMIN'), getZones);
```

---

## 4. API Security

### 4.1 Endpoint Security Matrix

| Endpoint | Auth Required | Role Required | Rate Limit |
|----------|--------------|---------------|------------|
| `GET /api/zones/risk` | No | None | 100/min/IP |
| `GET /api/zones/:id` | No | None | 100/min/IP |
| `POST /api/subscribe` | No (OTP) | None | 5/min/IP |
| `POST /auth/login` | No | None | 10/min/IP |
| `GET /api/dashboard/*` | JWT | VIEWER+ | 500/min/user |
| `POST /api/alerts/trigger` | JWT | DISTRICT_OFFICIAL+ | 10/min/user |
| `POST /api/alerts/suppress` | JWT | DISTRICT_OFFICIAL+ | 20/min/user |
| `POST /api/models/swap` | JWT | ADMIN | 5/min/user |
| `POST /api/users` | JWT | ADMIN | 20/min/user |
| `POST /ml/predict` | API Key | ML_SERVICE | 200/min/key |

### 4.2 HTTPS Enforcement

```nginx
# nginx.conf
server {
    listen 80;
    return 301 https://$host$request_uri;  # Force HTTPS redirect
}

server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/hhlews.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hhlews.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.openstreetmap.org;";
}
```

### 4.3 CORS Configuration

```javascript
// Node.js API CORS
const corsOptions = {
  origin: [
    'https://hhlews.in',
    'https://dashboard.hhlews.in',
    process.env.NODE_ENV === 'development' && 'http://localhost:3001',
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-API-Key'],
  credentials: true,  // For httpOnly refresh token cookie
  maxAge: 86400,
};
```

---

## 5. Rate Limiting

### 5.1 Nginx-Level Rate Limiting

```nginx
# Rate limit zones
limit_req_zone $binary_remote_addr zone=public_api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=subscribe:10m rate=5r/m;

# Apply
location /api/ {
    limit_req zone=public_api burst=20 nodelay;
    limit_req_status 429;
}
location /auth/login {
    limit_req zone=auth burst=5 nodelay;
}
location /api/subscribe {
    limit_req zone=subscribe burst=2 nodelay;
}
```

### 5.2 Application-Level Rate Limiting (Express)

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Alert trigger rate limit — prevents accidental or malicious burst
const alertLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,
  store: new RedisStore({ client: redisClient }),
  keyGenerator: (req) => req.user.id,  // Per user, not per IP
  message: { error: 'Too many alert triggers. Please wait before trying again.' },
});

router.post('/alerts/trigger', requireAuth, alertLimiter, triggerAlert);
```

### 5.3 Celery Alert Dispatch Rate Limiting

Alert tasks include a Redis-based deduplication check before enqueueing:
```python
def should_dispatch_alert(zone_id: str, risk_level: str) -> bool:
    cooldown_key = f"alert_suppress:{zone_id}"
    existing = redis_client.get(cooldown_key)
    if existing:
        current_level = existing.decode()
        # Allow immediate re-alert only if level escalates
        level_order = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']
        if level_order.index(risk_level) <= level_order.index(current_level):
            return False  # Within cooldown, same or lower level — skip
    return True
```

---

## 6. Data Privacy — Phone Numbers

### 6.1 Encryption at Rest

Phone numbers are the most sensitive PII in the system. Every stored phone number is encrypted:

```python
from cryptography.fernet import Fernet
import os

ENCRYPTION_KEY = os.environ['PHONE_ENCRYPTION_KEY']  # 32-byte base64 from AWS Secrets Manager
cipher = Fernet(ENCRYPTION_KEY)

def encrypt_phone(phone: str) -> bytes:
    return cipher.encrypt(phone.encode())

def decrypt_phone(encrypted: bytes) -> str:
    return cipher.decrypt(encrypted).decode()
```

- Encryption key stored in **AWS Secrets Manager** — never in environment files, never in code.
- Database column type: `BYTEA` — no plaintext representation in DB.
- DB backups contain encrypted phone data only.

### 6.2 PII Data Handling Rules

- Phone numbers are **never logged** in application logs (Celery task args, API request logs, error traces).
- Phone numbers are **never included** in JWT payloads or API responses except in the subscriber management endpoints (admin only, over HTTPS).
- Alert delivery logs store **recipient count** only, not individual phone numbers.
- Log sanitization middleware strips phone number patterns from all log output:

```javascript
// middleware/logSanitizer.js
const sanitizeLogs = (obj) => {
  const str = JSON.stringify(obj);
  return str.replace(/(\+91|0)?[6-9]\d{9}/g, '[PHONE_REDACTED]');
};
```

### 6.3 Data Retention

- Subscriber phone numbers: Retained until explicit unsubscription or system decommission.
- OTP codes: Deleted after use or expiry (10 minutes).
- Alert delivery receipts: 1 year (for audit), then anonymized (recipient count retained, IDs removed).
- Raw sensor readings: 90-day rolling window.
- Prediction audit log: 2 years (disaster management regulatory requirement).

### 6.4 Subscriber Consent

- Registration form includes explicit consent statement: "आपका मोबाइल नंबर केवल भूस्खलन चेतावनी के लिए उपयोग किया जाएगा।"
- Unsubscribe via SMS reply "STOP" or via PWA settings.
- Unsubscribe immediately deactivates the record (`is_active = false`); physical deletion after 30 days.

---

## 7. Secure Weather API Handling

### 7.1 API Key Protection

```
# .env (never committed to version control)
OPENWEATHERMAP_API_KEY=<key>
OPENWEATHERMAP_BACKUP_API_KEY=<backup_key>

# Production: loaded from AWS Secrets Manager at runtime
# Never in Docker image; never in docker-compose.yml committed to repo
```

**Key rotation policy:** API keys rotated every 90 days. Rotation via AWS Secrets Manager with Lambda rotation function triggers Celery config reload without restart.

### 7.2 Server-Side Only

Weather API keys are **only used server-side** (Celery polling worker). They are never:
- Sent to frontend (PWA or dashboard).
- Included in API responses.
- Logged in any form.

The frontend never calls weather APIs directly — it reads risk scores from the HH-LEWS API, which abstracts the weather data source.

### 7.3 API Response Caching

```python
WEATHER_CACHE_TTL = 300  # 5 minutes

def get_weather(lat: float, lon: float) -> dict:
    cache_key = f"weather:{lat:.4f}:{lon:.4f}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    response = requests.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"lat": lat, "lon": lon, "appid": API_KEY, "units": "metric"},
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    redis_client.setex(cache_key, WEATHER_CACHE_TTL, json.dumps(data))
    return data
```

Caching reduces API call volume (protecting quota) and limits the exposure window if the key is compromised.

---

## 8. Input Validation & Injection Prevention

### 8.1 SQL Injection

All database queries use parameterized statements via `asyncpg` (Python) and `pg` (Node.js). No raw string concatenation in SQL.

```python
# CORRECT — parameterized
await conn.fetchrow(
    "SELECT * FROM zones WHERE id = $1 AND district = $2",
    zone_id, district
)

# NEVER — string concatenation
await conn.fetchrow(f"SELECT * FROM zones WHERE id = '{zone_id}'")  # ← PROHIBITED
```

ORM usage (SQLAlchemy in Python, Sequelize in Node.js) as additional layer — ORM queries are inherently parameterized.

### 8.2 NoSQL Injection (Redis)

Redis key construction uses whitelisted characters only:
```python
SAFE_KEY_PATTERN = re.compile(r'^[a-zA-Z0-9_:\-\.]+$')

def safe_redis_key(*parts: str) -> str:
    key = ':'.join(parts)
    if not SAFE_KEY_PATTERN.match(key):
        raise ValueError(f"Unsafe Redis key: {key}")
    return key
```

### 8.3 MQTT Payload Injection

All MQTT payloads validated against JSON schema before processing:
```python
SENSOR_SCHEMA = {
    "type": "object",
    "required": ["sensor_id", "zone_id", "ts", "soil_saturation_pct", "vibration_mps2"],
    "properties": {
        "sensor_id": {"type": "string", "maxLength": 50, "pattern": "^[A-Z0-9\\-]+$"},
        "zone_id": {"type": "string", "maxLength": 50},
        "ts": {"type": "integer", "minimum": 1700000000},
        "soil_saturation_pct": {"type": "number", "minimum": 0, "maximum": 100},
        "vibration_mps2": {"type": "number", "minimum": 0, "maximum": 20},
        "battery_pct": {"type": "number", "minimum": 0, "maximum": 100}
    },
    "additionalProperties": False
}
```

Values outside physical plausible ranges are flagged as anomalous, logged, and not used for inference.

### 8.4 XSS Prevention

- React's default JSX rendering escapes all dynamic content.
- `dangerouslySetInnerHTML` is prohibited in codebase (ESLint rule).
- Content Security Policy header (see Section 4.2) blocks inline scripts.
- Hindi alert message text sanitized via `DOMPurify` before display.

---

## 9. Alert Spam Prevention

### 9.1 Multi-Layer Spam Prevention

**Layer 1 — Authentication gate:** Only `DISTRICT_OFFICIAL` and `ADMIN` JWT holders can trigger manual alerts.

**Layer 2 — Rate limit per user:** 10 manual alert triggers per minute per user ID (Redis-backed rate limit).

**Layer 3 — Zone cooldown:** 30-minute cooldown per zone after any HIGH+ alert. Enforced by Redis TTL key.

**Layer 4 — Escalation-only override:** Cooldown bypassed only if risk level escalates (HIGH → CRITICAL). Same-level or de-escalating re-alerts are blocked.

**Layer 5 — Double-confirm UI:** Dashboard manual broadcast requires two sequential confirm clicks with a preview showing recipient count.

**Layer 6 — Audit log:** Every alert dispatch (manual or automatic) is logged with `triggered_by_user` and reviewed in daily dashboard health report.

### 9.2 OTP Subscription Anti-Spam

Phone number subscription:
- OTP rate limit: max 3 OTP requests per phone number per hour.
- OTP expiry: 10 minutes.
- Failed OTP attempts: max 5 before 1-hour lockout on that phone number.
- Duplicate phone numbers: silently update existing record (no duplicate subscribers).

---

## 10. Deployment Security Hardening

### 10.1 Docker Security

```dockerfile
# Use non-root user in all containers
FROM python:3.11-slim
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

# Read-only filesystem where possible
# No secrets in Dockerfile or image layers
# Multi-stage build to exclude dev dependencies
```

```yaml
# docker-compose.yml security settings
services:
  api:
    security_opt:
      - no-new-privileges:true
    read_only: true  # Where possible
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if needed
```

### 10.2 Network Segmentation

```
External Internet
      │
      ▼
   [Nginx] ← Only container with external port 80/443
      │
      ▼ Internal Docker Network (172.20.0.0/16)
  ┌───────────────────────────────────┐
  │  [Node API]  [FastAPI ML]         │
  │      │           │               │
  │   [Redis]   [PostgreSQL]          │
  │      │                           │
  │  [Celery Workers]                 │
  │      │                           │
  │   [MQTT Broker]                  │
  └───────────────────────────────────┘
```

- FastAPI ML service has no external port — only accessible from Node.js via internal Docker network.
- PostgreSQL and Redis have no external ports.
- MQTT broker: TLS port 8883 only (no plain 1883 in production).

### 10.3 OS-Level Hardening (EC2/Droplet)

```bash
# Disable root SSH login
PasswordAuthentication no
PermitRootLogin no

# Firewall (UFW)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH (restrict to team IPs in production)
ufw allow 80/tcp    # HTTP (redirect only)
ufw allow 443/tcp   # HTTPS
ufw allow 8883/tcp  # MQTT TLS
ufw enable

# Automatic security updates
apt install unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades

# Fail2ban for SSH brute force
apt install fail2ban
```

### 10.4 Dependency Security

- `npm audit` and `pip-audit` run in CI/CD pipeline on every PR.
- GitHub Dependabot configured for automated dependency update PRs.
- Docker image base layers updated monthly.
- Production builds use pinned dependency versions (no `^` or `~` in package.json for critical deps).

---

## 11. Secrets Management

### 11.1 Secrets Inventory

| Secret | Type | Storage | Rotation |
|--------|------|---------|----------|
| `JWT_PRIVATE_KEY` | RSA-4096 private key | AWS Secrets Manager | Annually |
| `JWT_PUBLIC_KEY` | RSA-4096 public key | Environment variable | With private key |
| `DATABASE_URL` | Connection string (includes password) | AWS Secrets Manager | Quarterly |
| `REDIS_PASSWORD` | String | AWS Secrets Manager | Quarterly |
| `PHONE_ENCRYPTION_KEY` | Fernet key (32 bytes) | AWS Secrets Manager | Annually |
| `OPENWEATHERMAP_API_KEY` | String | AWS Secrets Manager | 90 days |
| `TWILIO_ACCOUNT_SID` | String | AWS Secrets Manager | On compromise |
| `TWILIO_AUTH_TOKEN` | String | AWS Secrets Manager | Quarterly |
| `WHATSAPP_API_TOKEN` | String | AWS Secrets Manager | 90 days |
| `ML_INTERNAL_API_KEY` | String | AWS Secrets Manager | Quarterly |
| `MQTT_PASSWORDS` | File | AWS Secrets Manager | Quarterly |

### 11.2 Secret Access in Production

```python
import boto3

def get_secret(secret_name: str) -> str:
    client = boto3.client('secretsmanager', region_name='ap-south-1')
    response = client.get_secret_value(SecretId=secret_name)
    return response['SecretString']

# Loaded at application startup, not stored in environment files
DATABASE_PASSWORD = get_secret('hhlews/prod/database_password')
```

### 11.3 Local Development

`.env` file used for local development:
- `.env` is in `.gitignore` — never committed.
- `.env.example` committed with placeholder values.
- Team members generate their own `.env` from shared 1Password vault.

---

## 12. Incident Response

### 12.1 Security Incident Classification

| Severity | Definition | Response SLA |
|----------|------------|-------------|
| P0 | Active data breach, alert system compromised, SMS bombing in progress | Immediate — 15 min |
| P1 | Suspected credential compromise, unusual alert pattern | 1 hour |
| P2 | Rate limit breach, failed injection attempts, anomalous API usage | 4 hours |
| P3 | Dependency vulnerability (CVE), minor config issue | 48 hours |

### 12.2 Response Procedures

**P0 — Active Breach:**
1. Kill switch: `docker-compose stop` on application servers.
2. Rotate all secrets immediately (AWS Secrets Manager).
3. Disable all official user accounts in DB.
4. Preserve logs to S3 before any instance changes.
5. Notify NDMA and district officials via alternative channel.
6. Post-incident root cause analysis within 48 hours.

**SMS Bombing in Progress:**
1. Set `SMS_PROVIDER=disabled` in environment and restart Celery alert workers.
2. Contact Twilio support to pause account.
3. Identify triggering user or automation and revoke JWT/credentials.
4. Review all alerts in last 2 hours for unauthorized dispatches.

---

## 13. Compliance Considerations

### 13.1 India-Specific Regulatory Requirements

**TRAI DLT (Distributed Ledger Technology) Compliance:**
- All transactional SMS (alert messages) require pre-registration of message templates on TRAI DLT portal.
- Principal Entity (PE) registration required for HH-LEWS operator.
- Sender ID (Header) registration: e.g., `HHLEWS`.
- Non-compliance results in carrier-level blocking of messages.
- Action required: Complete DLT registration before production SMS launch.

**PDPB (Personal Data Protection Bill) / DPDP Act 2023:**
- Phone numbers constitute personal data under DPDP Act.
- Requires explicit consent for collection and processing.
- Right to erasure must be implemented (unsubscribe → deletion within 30 days).
- Data processing for "public interest" (disaster management) provides legitimate basis under DPDP Act Section 7.
- Data Fiduciary registration may be required depending on scale.

**NDMA Guidelines:**
- NDMA's "Guidelines on Warning Dissemination" (2019) recommend multi-channel delivery for critical alerts — satisfied by SMS + WhatsApp + IVR.
- EWS systems should be registered with State Emergency Operations Centre (SEOC).

---

## 14. Security Checklist

### Pre-Deployment

- [ ] All secrets removed from codebase and Docker images
- [ ] AWS Secrets Manager configured for all production secrets
- [ ] HTTPS configured with valid TLS certificate (Let's Encrypt)
- [ ] HSTS header enabled
- [ ] Security headers configured in Nginx (CSP, X-Frame-Options, etc.)
- [ ] Firewall rules configured — only 443, 80 (redirect), 22 (restricted IPs), 8883 open
- [ ] SSH root login disabled, key-based auth only
- [ ] Docker containers running as non-root
- [ ] Internal services (DB, Redis, ML) not exposed externally
- [ ] Rate limiting configured at Nginx and application level
- [ ] RBAC tested for all role/endpoint combinations
- [ ] Phone number encryption verified (test encrypt/decrypt cycle)
- [ ] MQTT authentication enabled (no anonymous connections)
- [ ] SQL injection test suite passed
- [ ] TRAI DLT registration completed
- [ ] `npm audit` and `pip-audit` — zero high/critical vulnerabilities
- [ ] Fail2ban configured on all SSH-accessible hosts
- [ ] Automatic security updates enabled

### Post-Deployment (Monthly)

- [ ] Review access logs for anomalous patterns
- [ ] Verify alert audit log completeness
- [ ] Check Dependabot PRs and merge security updates
- [ ] Review rate limit breach logs
- [ ] Verify backup encryption and restoration test
- [ ] Rotate API keys per rotation schedule

---

*Document controlled by HH-LEWS Security Lead. All security configuration changes require PR review with security lead sign-off.*
