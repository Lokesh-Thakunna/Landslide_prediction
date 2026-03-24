# Phase 1 Multilanguage Support

## Task Source

Built from Phase 1 of `Task/Task_HH-LEWS_Improvements.md`, specifically the **Multilanguage Support** improvement.

## What Was Built

This task adds the first end-to-end multilingual slice across the platform:

- shared language contracts for `Hindi`, `English`, `Garhwali`, and `Kumaoni`
- language-aware subscriber persistence in the API
- localized SMS and WhatsApp alert composition on the backend
- dashboard alert preview showing message variants and subscriber counts by language
- citizen app first-open language selection
- citizen app live language switching without restart
- separate **app language** and **alert language** settings in the citizen app

## What It Does

### Citizen app

- On first open, the user sees a language selection screen before the main app.
- The suggested language is based on the selected district/zone default.
- The user can switch app language instantly from the top chip and the language settings card.
- App language and alert language can be different.
- When subscribing, the selected app and alert language are sent to the API.

### Backend

- Subscriber records now store `appLanguage` and `alertLanguage`.
- Alert generation creates localized message bundles for all 4 languages.
- Actual dispatch uses each subscriber's saved alert language.
- A protected preview endpoint returns per-language message text and recipient counts for the dashboard.

### Dashboard

- Manual alert form now loads a multilingual preview for the selected zone.
- Operators can review SMS and WhatsApp content for each language group before dispatch.
- Preview includes subscriber counts per language and a note that Garhwali/Kumaoni copy still needs native-speaker review before production.

## Files Changed

### Shared contracts

- `packages/contracts/src/index.ts`
  - Added `LanguageCode`
  - Added language fields to subscription contracts
  - Added localized alert message and alert preview contracts
  - Added localized messages to alert logs

### API backend

- `services/api/src/lib/localization.ts`
  - New localization helper
  - District default language mapping
  - Helpline mapping
  - SMS and WhatsApp templates for all 4 languages
  - Alert preview builder

- `services/api/src/data/seed.ts`
  - Added district default languages
  - Added multilingual seed subscribers for preview/testing

- `services/api/src/lib/state-store.ts`
  - Normalizes old persisted state to include missing language fields
  - Updates saved subscriptions with app and alert language
  - Preserves localized alert message arrays in stored alerts

- `services/api/src/lib/subscription-repository.ts`
  - Persists `app_language` and `alert_language`
  - Persists district `default_language`

- `services/api/src/lib/alert-dispatcher.ts`
  - Sends localized SMS/WhatsApp body per subscriber language

- `services/api/src/routes/public.routes.ts`
  - Accepts `appLanguage` and `alertLanguage` on subscription
  - Returns the saved language data in the subscription response

- `services/api/src/routes/protected.routes.ts`
  - Added `GET /api/alerts/preview?zone_id=...`
  - Manual trigger now stores localized message bundles in the alert log

- `services/api/db/schema.sql`
  - Added `default_language` to `districts`
  - Added `app_language` and `alert_language` to `subscribers`
  - Included `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for existing local DBs

- `services/api/src/types/bcryptjs.d.ts`
  - Added local declaration so API TypeScript build succeeds cleanly

### Frontend: citizen app

- `citizen_app/src/types.ts`
  - Added `LanguageCode`
  - Added app and alert language to subscription payload

- `citizen_app/src/lib/i18n.ts`
  - New citizen localization dictionary
  - Language metadata
  - District default mapping
  - Localized timestamp formatting

- `citizen_app/src/lib/risk.ts`
  - Simplified to keep styling only; copy now comes from i18n

- `citizen_app/src/App.tsx`
  - Added first-open language selection screen
  - Added live language chip
  - Added app/alert language settings section
  - Wired translated text through the page

- `citizen_app/src/components/HeroCard.tsx`
  - Localized hero labels, risk labels, and copy

- `citizen_app/src/components/ForecastStrip.tsx`
  - Localized forecast labels and timestamps

- `citizen_app/src/components/ShelterCard.tsx`
  - Localized shelter labels

- `citizen_app/src/components/RouteCard.tsx`
  - Localized route labels and numeric formatting

- `citizen_app/src/components/EmergencyContactsCard.tsx`
  - Localized section heading

- `citizen_app/src/components/ZonePicker.tsx`
  - Localized zone picker labels

- `citizen_app/src/components/InstallPrompt.tsx`
  - Localized install/offline shell copy

- `citizen_app/src/components/SubscriptionCard.tsx`
  - Localized form labels and errors
  - Shows selected app and alert language
  - Sends language preferences during subscription

- `citizen_app/src/services/api.ts`
  - Sends `appLanguage` and `alertLanguage` to backend subscribe endpoint

### Frontend: dashboard

- `dashboard/src/types.ts`
  - Added alert preview and localized alert message types

- `dashboard/src/services/api.ts`
  - Added alert preview fetcher
  - Added adapters for localized alert messages
  - Added local preview fallback data

- `dashboard/src/components/ManualAlertForm.tsx`
  - Added multilingual alert preview panel
  - Shows SMS and WhatsApp preview text by language group

- `dashboard/src/App.tsx`
  - Wires dashboard alert preview API into manual alert form

### Build configuration

- `tsconfig.base.json`
  - Added path mapping to the built contracts package so root workspace builds pass

## How It Works

1. Citizen selects a language.
2. App language is stored locally in browser storage.
3. Alert language is also stored locally and can be changed separately.
4. When the user subscribes, both language preferences are posted to `/api/subscribe`.
5. API stores the language preferences in memory state and DB persistence layer.
6. Dashboard requests `/api/alerts/preview?zone_id=...`.
7. API builds 4 localized variants and returns them with subscriber counts.
8. When an alert is actually sent, the dispatcher picks the correct localized body for each subscriber.

## Run / Verify

### Root workspace build

```bash
npm run build
```

### Citizen app

```bash
cd citizen_app
npm run build
npm run dev
```

### Dashboard

```bash
cd dashboard
npm run build
npm run dev
```

### API

```bash
npm run dev:api
```

### Worker

```bash
npm run dev:worker
```

## Verification Completed

- `npm run build` at repo root
- `npm run build` in `citizen_app`
- `npm run build` in `dashboard`

Note: dashboard build still prints existing Leaflet image asset resolution warnings, but the build completes successfully.

## Known Follow-Ups

- Garhwali and Kumaoni alert text is implemented as draft operational copy and still needs native-speaker review before production use.
- Dashboard-wide Hindi/English UI toggling is not part of this slice yet.
- Route and shelter dynamic content is still mostly source-data text, not fully translated end-to-end.
