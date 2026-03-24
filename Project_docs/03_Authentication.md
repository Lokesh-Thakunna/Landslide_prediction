# BHURAKSHAN Authentication

## 1. Overview

Authentication is required only for official dashboard operations. Citizen-facing risk views remain public, while subscriptions are protected through consent and anti-abuse controls rather than full account creation.

## 2. Roles

| Role | Access |
| --- | --- |
| `ADMIN` | full platform control |
| `DISTRICT_OFFICIAL` | district-scoped dashboard and alert controls |
| `ANALYST` | read-only analytics and forecast visibility |
| Citizen | public risk, shelters, routes, subscription |

## 3. JWT Model

- algorithm: `RS256`
- access token TTL: `15 minutes`
- refresh token TTL: `7 days`
- refresh token stored in `httpOnly`, `Secure`, `SameSite=Strict` cookie

### Access token claims

```json
{
  "sub": "usr_01",
  "role": "DISTRICT_OFFICIAL",
  "district_id": "dist_chamoli",
  "iss": "bhurakshan-api",
  "aud": "bhurakshan-dashboard"
}
```

## 4. Protected Routes

### Public

- `GET /api/health`
- `GET /api/districts`
- `GET /api/zones/risk`
- `GET /api/zones/:zone_id/forecast`
- `GET /api/hotspots`
- `GET /api/safe-shelters`
- `GET /api/evacuation-routes`
- `GET /api/weather/live`
- `POST /api/subscribe`

### Auth required

- `GET /api/alerts/logs` for expanded operational data
- `POST /api/alerts/trigger`
- future admin-only zone editing routes

## 5. Internal Service Authentication

The ML service must not be public.

Use:

- private network routing
- `X-Internal-API-Key`
- separate service secret from user JWT keys

## 6. Subscription Abuse Prevention

Citizens do not need accounts, but the system must still guard against spam.

Recommended controls:

- OTP verification before activation
- per-IP rate limiting
- per-phone hash deduplication
- explicit channel consent for SMS and WhatsApp

## 7. Alert Abuse Prevention

- manual trigger limited per user and per zone
- cooldown window after automated or manual dispatch
- audit log for every trigger attempt
- danger threshold validation on the backend

## 8. Secret Inventory

- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `PHONE_ENCRYPTION_KEY`
- `WEATHER_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `ML_INTERNAL_API_KEY`

## 9. Operational Notes

- do not expose Twilio or weather provider keys to the frontend
- do not store raw phone numbers in plaintext
- do not allow dashboard users outside their district scope unless they are admins

## 10. Out Of Scope For v1

The updated v1 does not require:

- MQTT broker authentication
- hardware sensor certificates
- IVR-specific access rules
