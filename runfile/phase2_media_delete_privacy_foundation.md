# Phase 2 Media Delete Privacy Foundation

## What I built

This task adds the first citizen-controlled media deletion flow for privacy cleanup.

The system now:

- lets a citizen delete their previously uploaded media report from the app
- authenticates deletion using the same per-device reporter token already used during upload
- removes the stored media object from Supabase Storage when present
- removes runtime-local fallback media files when Supabase is not used
- deletes the media report from backend runtime state
- triggers the existing dashboard realtime refresh path so deleted reports disappear from the review panel

This covers the first foundation for the privacy note that users should be able to remove their media reports.

## Files changed

### 1. `packages/contracts/src/index.ts`

Added:

- `MediaReportDeleteRequestSchema`
- `MediaReportDeleteResponseSchema`

This gives the delete flow a shared API contract.

### 2. `services/api/src/lib/state-store.ts`

Added:

- `deleteMediaReport(reportId)`

This removes the stored report from runtime state and persists the updated state snapshot.

### 3. `services/api/src/lib/media-storage-service.ts`

Added:

- `deleteStoredMedia(report)`

This deletes:

- Supabase stored media objects
- runtime-local fallback media files

### 4. `services/api/src/routes/public.routes.ts`

Added:

- `DELETE /api/reports/:reportId`

Behavior:

- validates the device reporter token
- recomputes the stored reporter hash
- rejects deletion from other devices
- deletes the stored media object
- removes the report from backend state
- emits a realtime media update so dashboards refresh

### 5. `citizen_app/src/types.ts`

Added:

- `MediaReportDeleteResponse`

### 6. `citizen_app/src/services/api.ts`

Added:

- `deleteMediaReport(reportId, phoneHash)`

This works in both:

- local demo mode
- live API mode

### 7. `citizen_app/src/components/MediaReportCard.tsx`

Extended the citizen report-status card with:

- localized delete action text
- confirmation prompt
- success message after deletion
- delete button for the current report

The delete action uses the same persistent per-device reporter token already created by the upload flow.

## How it works

1. The citizen uploads a media report.
2. The backend stores the report and the stored-media metadata.
3. The citizen sees the report status card.
4. If they choose to remove it, the app calls:

   - `DELETE /api/reports/:reportId`

5. The backend:

   - validates that the request comes from the same device token used for upload
   - deletes the file from storage
   - removes the report entry from state
   - emits a realtime media update event

6. The citizen app clears the local status card and shows a success message.
7. The dashboard refresh path removes the report from the zone review view.

## Notes

This is a foundation slice:

- deletion is currently tied to the same reporter token used for upload
- it removes the report fully instead of keeping an audit tombstone
- it does not yet include a broader phone-number unsubscribe dashboard flow

But it gives citizens a real privacy cleanup path for the media they submitted.

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

To run the API:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run start:api
```

Upload a report from the citizen app, wait for the status card to appear, then use the new delete action in the report-status section.

## Verification

Verified successfully with:

- `npm run build` from the project root
- `npm run build` inside `citizen_app`
