# Phase 2 Dashboard Face Blur Review Foundation

## What I built

This task implements the dashboard-side privacy review foundation for crowdsourced media reports.

The system now:

- stores explicit privacy status on media reports
- marks new uploads as `blur_recommended` when AI flags suggest face/privacy risk
- exposes a protected dashboard privacy-review API
- lets operators require blur, mark blur as applied, or clear the privacy flag
- shows a dashboard privacy badge and blurred preview state for reports that require privacy handling
- reuses the existing realtime media update flow so privacy actions refresh the dashboard immediately

This covers the improvement-plan requirement for a dashboard face-blur option and makes the privacy state visible instead of leaving it buried only inside heuristic AI flags.

## Files changed

### 1. `packages/contracts/src/index.ts`

Added the shared privacy contract for media reports:

- `MediaPrivacyStatusSchema`
- `MediaPrivacyReviewRequestSchema`

Also extended `MediaReportSchema` with:

- `privacyStatus`
- `faceBlurApplied`

This keeps the API and dashboard aligned on the same privacy state model.

### 2. `services/api/src/lib/state-store.ts`

Updated media report hydration so older seed/state entries are normalized into the new privacy model.

If a report already has `face_blur_recommended` in `aiFlags`, the store now defaults it to `blur_recommended`.

### 3. `services/api/src/routes/public.routes.ts`

Updated report creation so new uploads persist:

- `privacyStatus`
- `faceBlurApplied`

New reports now start as `blur_recommended` when the verification flags indicate face/privacy caution, otherwise `clear`.

### 4. `services/api/src/routes/protected.routes.ts`

Added:

- `POST /api/dashboard/reports/:reportId/privacy`

This route:

- validates the operator action
- checks district access restrictions
- updates `privacyStatus`
- updates `faceBlurApplied`
- stores review notes and review timestamp
- emits a realtime `media_report_updated` event

Supported actions:

- `mark_blur_required`
- `mark_blur_applied`
- `clear_privacy_flag`

### 5. `services/api/src/data/seed.ts`

Updated seeded media reports with explicit privacy values so the API demo state reflects the new model.

### 6. `dashboard/src/types.ts`

Added the dashboard-side `MediaPrivacyStatus` type and extended `MediaReport` with:

- `privacy_status`
- `face_blur_applied`

### 7. `dashboard/src/services/api.ts`

Updated media-report adaptation so backend privacy fields map into dashboard state.

Added:

- `reviewMediaPrivacy(reportId, action, notes)`

This supports both:

- local demo mode
- live API mode through `/api/dashboard/reports/:reportId/privacy`

### 8. `dashboard/src/components/MediaReportsPanel.tsx`

Extended the dashboard report panel with a new privacy workflow:

- privacy badge per report
- privacy preview card
- blurred preview when privacy enforcement is active
- operator actions:
  - `Require blur`
  - `Mark blur applied`
  - `Clear privacy flag`

Also added helper display logic for default privacy state and preview blur behavior.

### 9. `dashboard/src/data/mockDashboard.ts`

Updated local dashboard demo data with:

- `privacy_status`
- `face_blur_applied`

This keeps the local-only dashboard path consistent with the live API behavior.

## How it works

1. A media report is uploaded.
2. If the upload carries privacy-sensitive AI flags such as `face_blur_recommended`, the report starts in `blur_recommended`.
3. A dashboard operator opens the Ground Reports panel.
4. The operator sees the privacy badge and preview state for the report.
5. The operator can:
   - require blur before wider sharing
   - mark blur as applied
   - clear the privacy flag
6. The backend stores the new privacy state and emits a realtime update.
7. The dashboard refreshes through the existing realtime media update foundation.

This is still a foundation slice:

- it does not run a real image-processing blur pipeline
- it does not generate altered media files
- it provides the review state, UI controls, and persistence needed for that later production step

## How to run

From the project root:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run build
```

To run the dashboard:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\dashboard"
npm run dev
```

To run the API:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run start:api
```

Then open the dashboard Ground Reports panel and use the privacy action buttons on a media report.

## Verification

Verified successfully with:

- `npm run build` from the project root
- `npm run build` inside `dashboard`

Dashboard still shows the same existing Leaflet image asset warnings during build, but the build completes successfully.
