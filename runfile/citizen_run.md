# Citizen App Run Guide

## What I built

I created the Person 2 citizen interface as a new frontend app inside the `citizen_app/` folder using:

- React
- Vite
- Tailwind CSS
- TypeScript

The citizen app covers the Person 2 goals from `Task/TASKS.md`:

- mobile-first citizen app scaffold
- main risk screen with simple level, score, and rainfall context
- current zone plus `+1h` and `+2h` forecast cards
- nearby shelter section with distance and capacity
- evacuation-route screen section with step-by-step directions
- subscription flow for SMS and WhatsApp alerts
- emergency contacts view
- basic installability/offline-ready shell through a web manifest
- plain-language warning copy focused on next action

Because the repo was documentation-first and did not contain an existing citizen app, I built this as a standalone frontend that:

- runs immediately with mock data
- follows the same backend contracts already described in the project docs
- stays compatible with the Person 1 dashboard work
- can be connected to the future backend by environment variables

## Files I created

### App scaffold and tooling

- `citizen_app/package.json`
  Defines dependencies and scripts for development, build, and preview.

- `citizen_app/tsconfig.json`
  Root TypeScript project reference file.

- `citizen_app/tsconfig.app.json`
  TypeScript config for the React app source code.

- `citizen_app/tsconfig.node.json`
  TypeScript config for Vite config files.

- `citizen_app/vite.config.ts`
  Vite configuration for the citizen app dev server and build.

- `citizen_app/postcss.config.js`
  PostCSS setup for Tailwind.

- `citizen_app/index.html`
  Root HTML shell used by the Vite app.

- `citizen_app/.env.example`
  Example environment variable file for backend integration.

- `citizen_app/public/manifest.webmanifest`
  Basic manifest so the app is ready for installability and offline-shell polish later.

### Entry and global styling

- `citizen_app/src/main.tsx`
  React entry point that mounts the app.

- `citizen_app/src/index.css`
  Global styles and mobile-first visual theme.

- `citizen_app/src/vite-env.d.ts`
  Vite environment type support.

### Shared types and helpers

- `citizen_app/src/types.ts`
  Shared interfaces for citizen zone risk, forecasts, shelters, routes, contacts, and subscriptions.

- `citizen_app/src/lib/risk.ts`
  Risk-theme helpers and plain-language action copy.

- `citizen_app/src/lib/format.ts`
  Timestamp formatting helper.

### Mock data and API layer

- `citizen_app/src/data/mockCitizen.ts`
  Mock citizen-facing data for zones, forecasts, shelters, routes, and emergency contacts.

- `citizen_app/src/services/api.ts`
  API-ready service layer. Uses backend endpoints if configured, otherwise falls back to mock data.

### Data hook

- `citizen_app/src/hooks/useCitizenData.ts`
  Loads initial zone data, selected-zone details, shelters, route information, and emergency contacts.

### UI components

- `citizen_app/src/components/HeroCard.tsx`
  Main citizen risk card with simple status, score, rainfall, and warning text.

- `citizen_app/src/components/ZonePicker.tsx`
  Area selector for switching between monitored zones.

- `citizen_app/src/components/ForecastStrip.tsx`
  Forecast cards for `Now`, `+1h`, and `+2h`.

- `citizen_app/src/components/ShelterCard.tsx`
  Nearby shelter view with distance, capacity, and contact number.

- `citizen_app/src/components/RouteCard.tsx`
  Evacuation route summary plus step-by-step guidance.

- `citizen_app/src/components/SubscriptionCard.tsx`
  SMS/WhatsApp subscription form for citizen alerts.

- `citizen_app/src/components/EmergencyContactsCard.tsx`
  Emergency contact directory for quick help access.

- `citizen_app/src/components/InstallPrompt.tsx`
  Small section showing that the app already includes a basic installable shell foundation.

- `citizen_app/src/App.tsx`
  Main citizen interface composition and page layout.

## How the citizen app works

### Default mode

The app runs in mock/demo mode by default, so it works immediately without waiting for the backend.

### Backend-ready mode

If you later connect a backend, set:

- `VITE_API_BASE_URL`

The app service layer will then use:

- `GET /api/zones/risk`
- `GET /api/zones/:zone_id/forecast`
- `GET /api/safe-shelters?zone_id=...`
- `GET /api/evacuation-routes?zone_id=...`
- `POST /api/subscribe`

## How to run the citizen app

From the repo root:

```powershell
cd citizen_app
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5174
```

## How to run with backend integration

1. Create a `.env` file inside `citizen_app/`.
2. Set `VITE_API_BASE_URL` to the backend base URL.
3. Run:

```powershell
cd citizen_app
npm install
npm run dev
```

## Production build

To build the app:

```powershell
cd citizen_app
npm run build
```

To preview the built version:

```powershell
npm run preview
```

## Verification completed

I verified the app with:

```powershell
npm run build
```

The production build completed successfully.

## Handoff notes for Person 1, Person 3, and Person 4

### Handoff to Person 1

Person 1 should know this citizen app is already aligned with the dashboard in the following ways:

- same risk labels: `SAFE`, `WATCH`, `DANGER`
- same forecast structure: `current`, `+1h`, `+2h`
- same zone-based shelter and evacuation-route model
- same backend endpoint assumptions for shared data

Useful coordination points for Person 1:

- keep zone ids and district ids consistent across both apps
- if dashboard fields change, the citizen app should not be given different names for the same backend concept
- both apps should stay aligned on warning escalation language and forecast timing

### Handoff to Person 3

Person 3 should know this citizen app expects the following backend behavior:

- current zone risk feed from `GET /api/zones/risk`
- forecast from `GET /api/zones/:zone_id/forecast`
- shelter lookup from `GET /api/safe-shelters`
- route lookup from `GET /api/evacuation-routes`
- citizen alert opt-in through `POST /api/subscribe`

Important notes for Person 3:

- the service layer is in `citizen_app/src/services/api.ts`
- this app is currently mock-backed, so backend hookup should mainly require returning the documented response shapes
- the subscription flow already supports `SMS` and `WHATSAPP`
- public read access is assumed for citizen-facing data, while subscription is the main citizen write action

### Handoff to Person 4

Person 4 should know the citizen app uses a simplified presentation of the same ML output that the dashboard uses.

The citizen app currently expects:

- `risk_score`
- `risk_level`
- rainfall context
- current prediction
- `+1h` and `+2h` forecast values

Important notes for Person 4:

- the citizen UI intentionally hides model jargon and explanation-heavy proxy details
- forecast reliability matters here because the UI tells people what to do next based on near-future risk
- if ML output adds confidence or degraded-state information later, the citizen app can present that carefully, but the base current-plus-two-hour flow should remain stable

## Overall team handoff summary

What is ready for the rest of the team:

- citizen frontend scaffold is complete
- mock mode allows backend and ML work to continue independently
- subscription flow, shelter guidance, and route guidance all have frontend placeholders tied to real contract shapes
- the app is mobile-first and demo-ready

What teammates should avoid changing without coordination:

- risk-level names
- forecast horizon structure
- subscription channel names
- shared zone and district identifiers
- shelter and route field names used by both frontend apps

## Notes and assumptions

- This repo did not include an existing citizen UI, so I created a fresh app under `citizen_app/`.
- I used mock data because the backend endpoints are still documentation-stage in this repository.
- The app is designed to match the same source-of-truth contracts already used in the dashboard work so the team can integrate without rewriting the frontends later.
