# Phase 2 Media Verification And Risk Boost Foundation

## What I built

This task adds the next major Phase 2 foundation for crowdsourced media reports:

- explainable media verification scoring
- time-limited risk boost expiry for verified reports
- decaying media boost integration into zone risk and forecast responses
- dashboard visibility into why a report scored the way it did
- citizen visibility into report confidence and active boost timing

This turns media reports from a simple uploaded artifact into a scored ground-truth signal that can temporarily raise zone risk for operational awareness.

## Files changed

### 1. `packages/contracts/src/index.ts`

Added shared schemas and types for:

- media verification components
- verification breakdown summary
- report risk boost expiry
- report status breakdown payloads

These fields now travel consistently between API and frontends.

### 2. `services/api/src/lib/media-reports.ts`

Upgraded the media verifier.

What it now does:

- computes separate evidence, freshness, and location scores
- builds a weighted total verification score
- returns a structured verification breakdown
- sets a 2-hour risk boost expiry for verified reports
- keeps duplicate uploads from contributing to risk

The scoring is still local/simulated, but now matches the intended architecture much more closely.

### 3. `services/api/src/lib/state-store.ts`

Added media boost decay logic in the API state layer.

What it now does:

- finds active verified reports for a zone
- calculates decayed risk contribution based on time remaining before expiry
- applies that contribution to current zone risk and forecast risk
- injects media-related top features into forecast output when a live boost is active

This is the main foundation for the spec’s “verified reports boost the zone risk temporarily” behavior.

### 4. `services/api/src/routes/public.routes.ts`

Updated the public media routes.

Changes:

- upload flow now passes upload coordinates into verification scoring
- stored reports now include verification breakdown and boost expiry
- report status responses now expose verification breakdown and boost expiry

### 5. `services/api/src/routes/protected.routes.ts`

Updated dashboard review handling.

Behavior:

- when an operator verifies a report, a new 2-hour boost expiry is assigned
- when a report is marked fake / duplicate / unverified, the active boost is cleared
- verification breakdown summary is updated to reflect manual review outcome

### 6. `services/api/src/data/seed.ts`

Updated seed media reports to include:

- verification breakdown examples
- active expiry for verified sample reports

This keeps demo and local persisted state compatible with the new schema.

### 7. `dashboard/src/types.ts`

Added dashboard-side media verification component and breakdown types, plus optional fields for:

- `risk_boost_expires_at`
- `verification_breakdown`

### 8. `dashboard/src/services/api.ts`

Updated dashboard media report adapters so backend verification breakdown and expiry fields are mapped into dashboard types.

Also updated local review mode so verifying a report locally sets a fresh 2-hour boost expiry.

### 9. `dashboard/src/components/MediaReportsPanel.tsx`

Enhanced the dashboard report review panel.

Operators can now see:

- verification total score
- score-by-score breakdown for evidence, freshness, and location
- explanation notes for each score component
- active boost expiry time when a verified report is still influencing risk

### 10. `citizen_app/src/types.ts`

Added citizen-side media verification breakdown typing for report status responses.

### 11. `citizen_app/src/components/MediaReportCard.tsx`

Enhanced the citizen report status card.

Citizens can now see:

- report confidence percentage
- whether the report affected risk
- when the temporary boost remains active until
- a readable verification summary
- simple score bars for evidence, freshness, and location

## How it works

1. A citizen uploads a geotagged photo or video.
2. The backend scores the upload across three dimensions:
   - landslide evidence
   - freshness
   - location match
3. The weighted score determines whether the report is verified automatically or held for review.
4. If verified, the report receives a temporary risk boost with a 2-hour expiry.
5. The state layer decays that boost over time and adds it into current zone and forecast risk values.
6. The dashboard and citizen app both surface the reasoning and active boost timing.

## How to run

From the project root:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run build
```

To run the citizen app:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\citizen_app"
npm run dev
```

To run the dashboard:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\dashboard"
npm run dev
```

## Verification

Verified successfully with:

- `npm run build` from the project root
- `npm run build` inside `citizen_app`
- `npm run build` inside `dashboard`

Dashboard still shows the same existing Leaflet image asset warnings during build, but the build completes successfully.
