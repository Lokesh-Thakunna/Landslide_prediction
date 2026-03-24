# BHURAKSHAN Deployment Strategy

## 1. Runtime Components

- frontend dashboard
- frontend citizen interface
- Node.js API gateway
- Python ML service
- Python worker
- PostgreSQL with PostGIS
- Redis

## 2. Local Development

Recommended local stack:

- Docker Compose for database, Redis, API, ML, and worker
- Vite dev servers for dashboard and citizen interface

## 3. Hosting Split

| Surface | Suggested host |
| --- | --- |
| Dashboard and citizen UI | Vercel or Netlify |
| API gateway | Render, Railway, or Fly.io |
| ML service | Render worker, Railway, or container host |
| Postgres | managed Postgres with PostGIS |
| Redis | managed Redis |

## 4. Environment Variables

Required categories:

- database and Redis connection strings
- JWT signing keys
- weather API credentials
- Twilio SMS and WhatsApp credentials
- ML internal API key

## 5. Monitoring

Track:

- rainfall polling success rate
- prediction latency
- number of danger zones
- alert queue size
- dispatch success and failure counts
- stale weather percentage

## 6. Backup Strategy

Back up:

- zones
- shelters
- evacuation routes
- subscribers
- alert history

Prediction and rainfall history can use a shorter retention window in the pilot phase if cost becomes a concern.
