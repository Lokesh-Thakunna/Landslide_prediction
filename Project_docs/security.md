# BHURAKSHAN Security Architecture

## 1. Threat Model

Highest-priority security concerns for v1:

- unauthorized manual alert dispatch
- leakage of subscriber phone numbers
- abuse of public subscription endpoints
- exposure of weather or Twilio credentials
- false public confidence caused by stale or degraded data without disclosure

## 2. Authentication Model

### Citizen-facing endpoints

Public read access for risk, shelter, route, and weather views.

### Official dashboard

- JWT access token
- refresh token in `httpOnly` cookie
- role-based access control

### Service-to-service

- internal ML endpoint protected by API key and private network placement

## 3. Authorization

Recommended roles:

- `ADMIN`
- `DISTRICT_OFFICIAL`
- `ANALYST`

District officials should be scoped to their assigned district for dashboard writes.

## 4. API Security

- enforce HTTPS in production
- keep CORS restricted to approved frontends
- rate-limit public endpoints
- require stricter rate limits on `POST /api/subscribe`
- require auth and auditing on `POST /api/alerts/trigger`

## 5. PII Protection

Subscriber phone numbers must be:

- encrypted at rest
- hashed for deduplication
- never logged in plaintext
- never returned in public APIs

## 6. Secret Management

Keep these outside source control:

- JWT keys
- weather provider key
- Twilio credentials
- ML internal API key
- phone encryption key

## 7. Data Integrity

- label stale weather data explicitly
- record `predicted_at` and `forecast_for`
- write every alert trigger to `audit_logs`
- preserve immutable alert history once sent

## 8. Abuse Prevention

### Subscription

- OTP verification
- IP throttling
- per-phone dedupe

### Manual alerts

- per-user and per-zone throttles
- justification required
- admin audit review

## 9. Deployment Hardening

- private networking between API, worker, ML, Postgres, and Redis
- non-root containers where possible
- managed backups for durable data
- dependency scanning before deployment

## 10. Removed From The Old Design

The updated v1 security scope does not need MQTT broker security or sensor certificate handling because hardware sensors are no longer part of the required base architecture.
