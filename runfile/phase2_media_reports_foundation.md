# Phase 2 Media Reports Foundation

## Task Source

Built from the **Crowdsourced Media Evidence System** improvement in `Task/Task_HH-LEWS_Improvements.md`.

## What Was Built

This task adds the first working foundation for citizen media reports and official review:

- shared media-report contracts
- API-side media report lifecycle
- citizen upload endpoint using real `multipart/form-data`
- citizen report status endpoint
- dashboard report listing endpoint
- dashboard report review endpoint
- lightweight verification heuristic
- citizen app upload/report-status UI
- dashboard zone detail panel for reviewing ground reports

This is the foundation slice of the media-evidence system. It creates a real end-to-end reporting workflow now, while leaving cloud storage, antivirus scanning, and full AI verification for follow-up work.

## What It Does

### Citizen side

- User can pick a photo or video file
- Current location from the location-guidance flow is used during upload
- Optional description can be attached
- Upload goes to the API as `multipart/form-data`
- User can see the resulting status message after upload

### API side

- API accepts uploaded media plus metadata
- API maps the report to the nearest active zone
- API computes a simple verification result using:
  - media type
  - description keywords
  - zone priority
  - duplicate hash check
- Report is stored in runtime state
- Citizen can fetch report status by ID
- Officials can list reports and manually review them

### Dashboard side

- Selected zone now shows a **Ground reports** panel
- Reports show metadata, verification state, labels, and notes
- Official can:
  - verify
  - flag fake
  - mark duplicate
- After review, the zone panel refreshes with updated status

## Files Changed

### Shared contracts

- `packages/contracts/src/index.ts`
  - Added media report enums and schemas
  - Added upload field schema
  - Added citizen upload/status response schemas
  - Added dashboard media-report response schema

### API backend

- `services/api/src/lib/media-reports.ts`
  - New helper module
  - Duplicate hash builder
  - Lightweight verification heuristic
  - Media status message builder

- `services/api/src/lib/state-store.ts`
  - Added `mediaReports` to persisted runtime state
  - Added create/get/list/update methods for media reports
  - Added backward-compatible normalization when persisted state is loaded

- `services/api/src/data/seed.ts`
  - Added seeded sample media reports

- `services/api/src/routes/public.routes.ts`
  - Added `POST /api/reports/upload`
  - Added `GET /api/reports/:reportId/status`
  - Added `multer`-based multipart parsing

- `services/api/src/routes/protected.routes.ts`
  - Added `GET /api/dashboard/reports`
  - Added `POST /api/dashboard/reports/:reportId/review`

- `services/api/db/schema.sql`
  - Added `media_reports` table
  - Added index for media reports by zone and receive time

### API dependencies

- `services/api/package.json`
  - Uses `multer` for multipart handling

- `package-lock.json`
  - Updated because of the new API dependency install

### Citizen app

- `citizen_app/src/types.ts`
  - Added media upload/request/status types

- `citizen_app/src/lib/i18n.ts`
  - Added upload/report-status copy across supported languages

- `citizen_app/src/data/mockCitizen.ts`
  - Added mock recent media report status

- `citizen_app/src/services/api.ts`
  - Added `uploadMediaReport`
  - Added `getMediaReportStatus`

- `citizen_app/src/components/MediaReportCard.tsx`
  - New citizen upload and status card

- `citizen_app/src/App.tsx`
  - Integrated the new media-report card into the citizen flow

### Dashboard

- `dashboard/src/types.ts`
  - Added media report and media-report response types

- `dashboard/src/data/mockDashboard.ts`
  - Added seeded dashboard media reports

- `dashboard/src/services/api.ts`
  - Added `getMediaReports`
  - Added `reviewMediaReport`
  - Added adapters for backend media-report data

- `dashboard/src/hooks/useDashboardData.ts`
  - Added selected zone media reports and media stats

- `dashboard/src/components/MediaReportsPanel.tsx`
  - New official review panel for ground reports

- `dashboard/src/components/ZoneDrawer.tsx`
  - Now renders the media reports panel inside zone detail

- `dashboard/src/App.tsx`
  - Passes zone media reports into zone detail

## API Endpoints Added

### `POST /api/reports/upload`

Form-data fields:

- `file`
- `lat`
- `lon`
- `accuracy_m` optional
- `description` optional
- `language` optional
- `phone_hash` optional
- `device_timestamp` optional

Behavior:

- validates file type and size
- maps report to nearest active zone
- computes verification heuristic
- stores report in runtime state
- returns report id and initial status

### `GET /api/reports/:reportId/status`

Returns:

- current verification status
- verification score
- zone name
- risk boost flag
- citizen-facing status message

### `GET /api/dashboard/reports`

Protected endpoint.

Optional query params:

- `zone_id`
- `status`
- `hours`

Returns:

- report list
- total count
- pending count
- verified count
- flagged count

### `POST /api/dashboard/reports/:reportId/review`

Protected endpoint.

Body:

```json
{
  "decision": "verified",
  "notes": "Verified by dashboard operator."
}
```

Updates the report verification state and review metadata.

## How It Works

1. Citizen uses the upload card in the citizen app.
2. App sends a real multipart request to `/api/reports/upload`.
3. API checks file type, size, location fields, and nearest zone.
4. API computes a lightweight verification result and duplicate hash.
5. Report is stored in runtime state.
6. Citizen fetches report status by id.
7. Dashboard loads reports for the selected zone.
8. Official can manually review and update report status.

## Verification Logic in This Foundation Slice

This version uses a simple deterministic heuristic instead of a full AI pipeline:

- keyword matches in the citizen description
- media type weighting
- zone priority weighting
- duplicate hash detection

This gives realistic behavior for the current scaffold and makes the full AI verification layer an incremental next step.

## What This Task Does Not Yet Include

- cloud file storage (S3)
- antivirus scanning
- EXIF freshness checks
- Google Vision / Rekognition integration
- perceptual image hashing
- presigned media URLs
- actual thumbnails
- websocket push for media-report events

Those are the next logical upgrades on top of this foundation.

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

## Verification Completed

- `npm run build` at repo root
- `npm run build` in `citizen_app`
- `npm run build` in `dashboard`

Note: dashboard still shows the existing Leaflet image warnings during build, but the build completes successfully.
