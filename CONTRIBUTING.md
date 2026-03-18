# HH-LEWS — Contributing Guide & Team Workflow

> This document is the single source of truth for how the four-person team works together on this repo.  
> Read it before writing a single line of code.

---

## 👥 Team & Ownership

| Handle | Role | Branch | Owns |
|--------|------|--------|------|
| **Person 1** | Frontend Lead | `feat/dashboard` | Official Dashboard, Leaflet map, WebSocket UI, Alert trigger form |
| **Person 2** | PWA Dev | `feat/citizen-pwa` | Citizen PWA, Hindi i18n, Offline Service Worker, Subscribe flow |
| **Person 3** | Backend Lead | `feat/backend-api` | Node.js API, PostgreSQL, Celery workers, MQTT, Twilio, Docker |
| **Person 4** | ML Lead | `feat/ml-service` | FastAPI ML service, RF+XGBoost model, Celery inference task, Integration |

---

## 🌿 Branch Strategy

```
main
 └── dev                    ← integration branch (all features merge here first)
      ├── feat/dashboard     ← Person 1
      ├── feat/citizen-pwa   ← Person 2
      ├── feat/backend-api   ← Person 3
      └── feat/ml-service    ← Person 4
```

### Rules

- `main` is **protected** — no direct push ever. Only merges from `dev` after demo-ready milestone.
- `dev` is the integration branch — all four feature branches merge here via PR.
- Each person works exclusively on their own feature branch.
- Never push to another person's branch without asking first.
- Commit often. Push to your remote branch at least every 2 hours during the hackathon.

### First-time setup

```bash
# Clone the repo
git clone https://github.com/<org>/hhlews.git
cd hhlews

# Create your feature branch off dev
git checkout dev
git pull origin dev
git checkout -b feat/dashboard        # Person 1
# or
git checkout -b feat/citizen-pwa      # Person 2
# or
git checkout -b feat/backend-api      # Person 3
# or
git checkout -b feat/ml-service       # Person 4

# Push your branch to remote immediately
git push -u origin feat/dashboard     # (or your branch name)
```

---

## 🔀 PR Merge Checkpoints

There are **4 fixed PR checkpoints** during the 46-hour build. Everyone must hit these.

### PR-01 — Hour 10 (Backend + ML foundation)
- **P3 merges** `feat/backend-api` → `dev`
  - ✅ docker-compose.yml running all services
  - ✅ PostgreSQL + PostGIS up with zones seeded
  - ✅ Express API running on port 3000
  - ✅ GET /health returns 200
  - ✅ POST /auth/login issues JWT
- **P4 merges** `feat/ml-service` → `dev`
  - ✅ FastAPI running on port 8000 (internal)
  - ✅ POST /ml/predict returns a valid risk score
  - ✅ RF + XGBoost models trained and loaded

### PR-02 — Hour 18 (Full backend + frontend scaffolds)
- **P3 merges** `feat/backend-api` → `dev`
  - ✅ All public API endpoints working
  - ✅ Celery weather polling running every 5 min
  - ✅ Sensor simulator publishing to MQTT
  - ✅ WebSocket /realtime-risk accepting connections
- **P4 merges** `feat/ml-service` → `dev`
  - ✅ Celery inference task calling /ml/predict
  - ✅ risk:{zone_id} written to Redis after each cycle
- **P1 merges** `feat/dashboard` → `dev`
  - ✅ React app running on port 5173
  - ✅ Leaflet map loads zone polygons (even if static)
  - ✅ Login page functional
- **P2 merges** `feat/citizen-pwa` → `dev`
  - ✅ PWA running on port 5174
  - ✅ Main risk screen renders with Hindi text
  - ✅ Subscribe screen renders

### PR-03 — Hour 26 (Full end-to-end integration)
- **All four branches merge** `→ dev`
  - ✅ Weather poll → ML inference → Redis → Dashboard map updates live
  - ✅ Risk threshold breach → SMS/WhatsApp dispatched via Twilio
  - ✅ WebSocket zone_risk_updated received by Dashboard in real-time
  - ✅ Citizen PWA shows correct zone risk pulled from API
  - ✅ Manual alert trigger from Dashboard fires SMS

### PR-04 — Hour 34 (Demo-ready → main)
- **All four branches merge** `dev → main`
  - ✅ Hindi translations complete on PWA
  - ✅ Offline Service Worker caching zones + safe zones
  - ✅ Demo spike button working (CRITICAL alert trigger)
  - ✅ Mobile PWA installable on Android
  - ✅ Dashboard loads in < 3 seconds

---

## 📝 Commit Message Format

Use this format for every commit. Keep it short and honest.

```
<type>(<scope>): <short description>

Types:
  feat      — new feature
  fix       — bug fix
  chore     — setup, config, deps
  docs      — documentation only
  refactor  — code change without feature/fix
  test      — adding tests

Scopes (use your service name):
  dashboard, pwa, api, ml, worker, db, infra, docs

Examples:
  feat(api): add POST /auth/login with RS256 JWT
  feat(ml): train RF+XGBoost ensemble, save v1.0 pkl
  fix(worker): handle MQTT LWT sensor offline event
  chore(infra): add docker-compose with all 6 services
  feat(pwa): add Hindi translations for risk screen
  feat(dashboard): Leaflet polygon color update on WebSocket event
```

---

## 🔑 Environment Variables

**Never commit `.env` files.** The `.gitignore` already blocks them.

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

### Required keys (get these in Hour 0–3)

| Key | Who gets it | Where |
|-----|------------|-------|
| `OPENWEATHERMAP_API_KEY` | Person 3 | openweathermap.org → free tier |
| `TWILIO_ACCOUNT_SID` | Person 3 | console.twilio.com |
| `TWILIO_AUTH_TOKEN` | Person 3 | console.twilio.com |
| `WHATSAPP_API_TOKEN` | Person 3 | Twilio WhatsApp Sandbox |
| `DATABASE_URL` | Person 3 | auto from docker-compose |
| `REDIS_URL` | Person 3 | auto from docker-compose |
| `JWT_PRIVATE_KEY` | Person 3 | generate with `openssl genrsa 4096` |
| `JWT_PUBLIC_KEY` | Person 3 | `openssl rsa -pubout` from above |
| `ML_INTERNAL_API_KEY` | Person 4 | generate: `openssl rand -hex 32` |
| `PHONE_ENCRYPTION_KEY` | Person 3 | generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |

Share keys with team via a **secure channel only** (WhatsApp DM, not in chat or commits).

---

## 🐳 Running Locally

### Prerequisites
- Docker Desktop installed and running
- Node.js 20+ installed
- Python 3.11+ installed
- Git

### Start all backend services

```bash
# From repo root:
docker-compose up -d

# Verify services are up:
docker-compose ps

# Check logs:
docker-compose logs -f hhlews-api
docker-compose logs -f hhlews-ml
docker-compose logs -f hhlews-worker
```

### Run frontend apps (separate terminals)

```bash
# Terminal 1 — Dashboard (Person 1)
cd apps/dashboard
npm install
npm run dev
# Runs on http://localhost:5173

# Terminal 2 — Citizen PWA (Person 2)
cd apps/citizen-pwa
npm install
npm run dev
# Runs on http://localhost:5174
```

### Run database migrations

```bash
# From services/api:
npx prisma migrate deploy
npx prisma db seed

# Run spatial indexes (one-time):
psql $DATABASE_URL -f scripts/spatial_indexes.sql
psql $DATABASE_URL -f scripts/seed_zones.sql
```

### Run SRTM data loader (Person 4, one-time)

```bash
cd scripts
pip install rasterio numpy psycopg2-binary
python load_srtm.py
```

---

## 🚫 What NOT to do

- ❌ Never `git push origin main` directly
- ❌ Never store API keys, `.pkl` model files, or `.tif` raster files in git
- ❌ Never merge your own PR — ask one other team member to review
- ❌ Never run `DROP TABLE` or `DELETE FROM zones` without telling the team
- ❌ Never change the Prisma schema without telling Person 3
- ❌ Never change the `PredictionRequest` Pydantic schema without telling Person 4
- ❌ Never commit `node_modules/`, `__pycache__/`, `*.pkl`, `*.tif`, `.env`

---

## ✅ PR Review Checklist

Before opening a PR to `dev`, confirm:

- [ ] Code runs locally without errors
- [ ] No `.env` values hardcoded anywhere
- [ ] No `console.log` with phone numbers or personal data
- [ ] `docker-compose up` still works after your changes
- [ ] If you changed a shared API contract (endpoint schema, DB field), you told the relevant person
- [ ] Commit messages follow the format above
- [ ] PR title describes what changed: `feat(api): add POST /alerts/trigger endpoint`

---

## 📞 Sync Points During Build

| Hour | What happens |
|------|-------------|
| 0–3 | Everyone: repo setup, API keys, docker-compose runs, tasks divided |
| 3 | Quick call: confirm everyone's local env works |
| 10 | **PR-01** — P3 + P4 merge. Full team reviews /predict working |
| 18 | **PR-02** — All merge. Test end-to-end: weather → ML → Redis → WS |
| 26 | **PR-03** — All merge. Demo script run end-to-end live |
| 34 | **PR-04** — Polish merged to main. Demo rehearsal begins |
| 42–46 | Rest + final rehearsal + buffer |

---

*Document Version: 1.0 — HH-LEWS Hackathon Build — Team HH-LEWS*
