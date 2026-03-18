# HH-LEWS — Deployment & Infrastructure Strategy

## 1. Docker Strategy & Containerization

The core methodology for deploying HH-LEWS is containerization to guarantee environment matching during the ML python compilation step. 
- **`hhlews-api`:** Node.js 20 base. Slim image containing Express.
- **`hhlews-ml`:** Python 3.11-slim. Strict versioning for NumPy, Scikit-learn, XGBoost. 
- **`hhlews-worker`:** Python 3.11-slim wrapped around Celery. Uses exact same dependencies and codebase as the ML service to ensure feature-computation logic parity.

All Dockerfiles follow security enforcement guidelines:
```dockerfile
# Dropping root
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser
```

## 2. CI/CD Structure via GitHub Actions

```text
git push origin main
│
├── 1. Testing & Linting
│      (pytest, npm audit)
├── 2. Build Docker Images
│      (docker build)
├── 3. Push to Registry
│      (AWS ECR / Docker Hub)
└── 4. Deployment Trigger
       (AWS ECS Deploy or SSH docker-compose pull)
```

## 3. Deployment Topology

### Vercel Frontend Deploy
Both the **Citizen PWA** and **Official Dashboard** are Vite React applications deployed seamlessly to Vercel global edge networks. 
*   This grants free global CDNs and offline Service Worker caching.
*   The `.env.production` files within Vercel contain the public pointers pointing back to the Backend API domain (`hhlews.in/api`).

### Backend Deploy (Render / Railway)
For Phase 1 / Hackathon setups, Render or Railway supplies instant Docker-compose equivalents without manual VPC AWS orchestration.
*   **Web Services:** Bound to port 3000 (Node API).
*   **Private Services:** FastAPI ML bound internally to port 8000, unexposed to the public web.
*   **Worker Services:** `Celery Beat` and `Celery Worker` instances launched via the `python -m celery` commands under background worker instances.

### Stateful Services (Managed DB)
*   Render PostgreSQL automatically supplies PostGIS extensions.
*   Render Redis provides internal URIs mapped directly into the Node/Python `.env` pipelines.

## 4. Environment Variable Management

Local development relies on `.env.development` synced via secure team platforms (like 1Password Vault). Production relies strictly on injected Secrets tools (e.g. AWS Secrets Manager or Render Environment panels).

**Critical Env Keys:**
*   `DATABASE_URL`: Postgres complete URI
*   `REDIS_URL`: Redis complete URI
*   `JWT_PRIVATE_KEY`: RS256 token issuer
*   `PHONE_ENCRYPTION_KEY`: 32-byte Fernet key. **Crucial:** DB is useless if this is lost, keep backed up.
*   `OPENWEATHERMAP_API_KEY`: Weather endpoint ingestion.
*   `TWILIO_ACCOUNT_SID` / `WHASTAPP_API_TOKEN`
*   `ML_INTERNAL_API_KEY`: X-Header internal auth validation.

## 5. Monitoring & Logging
*   **Application APM:** Integrations with Datadog or AWS CloudWatch tracking `/predict` inference times (aiming for sub 500ms).
*   **Health endpoints:** Node and FastAPI both expose a `/health` unauthenticated block for `UptimeRobot` pings.
*   **Log Sanitization:** All Node.js `console.logs` or Python `logging.info` utilizing regex filters ensuring Phone numbers `+91XXXX` are scrubbed before reaching stdout for data privacy (DPDP compliance). 

## 6. Backup Strategy
*   **Database Incremental:** AWS RDS / Render automatic Point-In-Time recovery (PITR) extending back 7 days.
*   **Daily Snapshots:** Nightly Cron dumps backing up to secure AWS S3 buckets off-site.
*   **Loss Risk:** Due to the real-time nature of risk forecasting, complete database loss is acceptable for `sensor_readings` older than 72 hours (except for ML retraining data partitions), but `users` and `zones` tables must be rigidly guarded via backups.
