# Phase 2 Live Weather Feed Foundation

## What I built

This slice fixes the live weather feed path so OpenWeather-backed rainfall can surface reliably in both operator and citizen views.

The work includes:

- stronger worker-side OpenWeather handling with provider normalization and trimmed API key support
- fallback ordering between OpenWeather, Open-Meteo, and deterministic simulated weather
- dashboard live weather fetching and display for the selected zone
- citizen app live weather fetching and display in the hero card
- safe frontend fallback behavior if the live weather endpoint is temporarily unavailable

## Files changed

### Worker

#### `services/worker/src/config/env.ts`
- Added normalized weather provider env support.
- Added fallback provider env support.
- Trimmed `WEATHER_API_KEY` so accidental leading or trailing spaces in `.env` do not break the OpenWeather request.

#### `services/worker/src/clients/weather-client.ts`
- Reworked provider selection.
- Added explicit OpenWeather current weather and forecast calls.
- Added helper logic to extract rainfall from OpenWeather payloads.
- Added clearer `source` values and fallback behavior.

### Operator dashboard

#### `dashboard/src/types.ts`
- Added a shared `LiveWeather` type.
- Added `live_weather` to the dashboard snapshot contract.

#### `dashboard/src/data/mockDashboard.ts`
- Added mock live weather entries so local/demo mode still shows weather context.

#### `dashboard/src/services/api.ts`
- Added live weather response adaptation.
- Added `getLiveWeather(zoneId)`.
- Wired fallback behavior to local snapshot data when API data is unavailable.

#### `dashboard/src/hooks/useDashboardData.ts`
- Added `selectedLiveWeather` to dashboard state.
- Loaded live weather together with forecast, shelters, roads, and other zone detail data.

#### `dashboard/src/App.tsx`
- Passed live weather into the zone detail drawer.

#### `dashboard/src/components/ZoneDrawer.tsx`
- Rainfall now prefers live weather feed data over the older zone summary rainfall field.
- Shows feed source and freshness so operators can tell whether the value is live or fallback.

### Citizen app

#### `citizen_app/src/types.ts`
- Added a shared `LiveWeather` type.
- Added `liveWeather` to the citizen snapshot contract.

#### `citizen_app/src/data/mockCitizen.ts`
- Added demo live weather entries for local/demo mode.

#### `citizen_app/src/services/api.ts`
- Added live weather response adaptation.
- Added `getLiveWeather(zoneId)`.
- Uses the same safe fallback pattern as the dashboard if the live weather endpoint fails.

#### `citizen_app/src/hooks/useCitizenData.ts`
- Added `liveWeather` state.
- Loaded live weather together with the selected zone’s forecast and routing context.

#### `citizen_app/src/App.tsx`
- Passed live weather into the hero card.

#### `citizen_app/src/components/HeroCard.tsx`
- Hero rainfall now prefers live weather feed data.
- Shows whether the card is using a live feed or fallback feed.

## How it works

1. The worker reads `WEATHER_PROVIDER`, `WEATHER_FALLBACK_PROVIDER`, and `WEATHER_API_KEY`.
2. It tries the configured provider order, starting with OpenWeather when available.
3. The worker stores current rainfall plus near-horizon forecast rainfall in backend state.
4. The public weather endpoint serves the current live weather snapshot for a zone.
5. The dashboard and citizen app request that weather snapshot and show:
   - rainfall
   - observation time
   - source
   - freshness
6. If the live API call fails, the apps fall back to local/demo weather so the UI stays usable.

## Why this fixes the issue

Your `.env` currently uses:

- `WEATHER_PROVIDER=OpenWeather`
- `WEATHER_API_KEY= faa5d16256b4c7f7231e64d5aef3afc4`

That setup is sensitive to capitalization and accidental spaces. This slice now:

- normalizes provider names like `OpenWeather` into the supported internal value
- trims the API key before requests are made
- falls back cleanly if OpenWeather is unavailable

## How to run

1. Keep these root `.env` values set:

```env
WEATHER_PROVIDER=OpenWeather
WEATHER_API_KEY=your_openweather_key
WEATHER_FALLBACK_PROVIDER=open-meteo
WEATHER_POLL_INTERVAL_MINUTES=5
```

2. Start backend services in order:

```powershell
npm run start:api
npm run start:worker
```

3. Start the apps:

```powershell
cd citizen_app
npm run dev
```

```powershell
cd dashboard
npm run preview
```

4. Verify:
- worker logs should no longer fail because of provider casing or key whitespace
- operator dashboard zone detail should show live rainfall feed info
- citizen app hero card should show rainfall and live/fallback feed status

## Verification

- `npm run build` at repo root: passed
- `npm run build` in `dashboard`: passed
- `npm run build` in `citizen_app`: passed

Dashboard build still shows the existing Leaflet image asset warnings, but the build succeeds.
