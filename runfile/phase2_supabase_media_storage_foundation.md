# Phase 2 Supabase Media Storage Foundation

## What I built

This task adds real media-file persistence and secure viewing support for crowd reports.

The system now:

- stores uploaded media files through a dedicated storage service
- uses Supabase Storage when `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are configured
- falls back to local runtime storage when Supabase is unavailable
- saves storage metadata against each media report
- exposes a protected dashboard asset endpoint that returns a 15-minute secure media link
- lets dashboard operators open the stored media directly from the Ground Reports panel

This covers the storage and presigned-viewing part of the media improvement plan, adapted for Supabase instead of S3.

## Files changed

### 1. `packages/contracts/src/index.ts`

Extended the shared media contract with storage fields:

- `storageProvider`
- `storageBucket`
- `storageObjectPath`
- `thumbnailBucket`
- `thumbnailObjectPath`

Also added:

- `MediaStorageProviderSchema`
- `MediaReportAssetsResponseSchema`

### 2. `services/api/src/config/env.ts`

Added backend env support for:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `MEDIA_BUCKET`
- `THUMBNAIL_BUCKET`
- `MAX_PHOTO_SIZE_MB`
- `MAX_VIDEO_SIZE_MB`

### 3. `services/api/src/lib/media-storage-service.ts`

Added the new storage abstraction.

What it does:

- uploads files to Supabase Storage when configured
- falls back to `.runtime/media-uploads` local storage otherwise
- creates signed Supabase URLs for dashboard access
- streams locally stored files for the fallback path

### 4. `services/api/src/lib/media-asset-access.ts`

Added expiring media access token support for runtime-local media links.

This makes the local fallback path act like a signed URL instead of exposing a raw file path.

### 5. `services/api/src/app.ts`

Wired the shared `MediaStorageService` into the public and protected routers.

### 6. `services/api/src/routes/public.routes.ts`

Updated `POST /api/reports/upload` so the uploaded file is now persisted before the report metadata is stored.

Also added:

- `GET /api/reports/:reportId/media`

This route serves locally stored media only when a valid expiring token is present.

### 7. `services/api/src/routes/protected.routes.ts`

Added:

- `GET /api/dashboard/reports/:reportId/assets`

This route:

- checks auth and district access
- creates a 15-minute secure viewing link
- returns either:
  - a Supabase signed URL, or
  - a signed runtime-local API link

### 8. `services/api/src/lib/state-store.ts`

Updated persisted-state hydration so older reports are normalized with the new storage metadata fields.

### 9. `services/api/src/data/seed.ts`

Updated seeded media reports to include explicit storage metadata defaults.

### 10. `services/api/package.json`

Added the official dependency:

- `@supabase/supabase-js`

### 11. `package-lock.json`

Updated automatically for the new API dependency.

### 12. `dashboard/src/types.ts`

Added dashboard-side storage fields and the `MediaReportAssets` response type.

### 13. `dashboard/src/services/api.ts`

Mapped backend storage metadata into dashboard state and added:

- `getMediaReportAssets(reportId)`

### 14. `dashboard/src/components/MediaReportsPanel.tsx`

Updated the media moderation UI to:

- show storage status
- enable an `Open secure media` action when stored media exists
- open the secure link returned by the backend

## How it works

1. A citizen uploads a media file.
2. The API validates file type and size using the configured photo/video limits.
3. The API stores the file:
   - in Supabase Storage when configured, or
   - in local runtime storage as a fallback
4. The API saves storage metadata on the media report.
5. A dashboard operator opens the report panel.
6. When the operator clicks `Open secure media`, the dashboard requests a secure asset link.
7. The backend returns:
   - a Supabase signed URL, or
   - an expiring local runtime media URL
8. The media opens in a new tab for review.

## Notes

This is a foundation slice:

- it stores the original media object
- it does not yet generate real thumbnails
- it does not yet implement antivirus scanning
- it does not yet implement a delete-media lifecycle flow

## How to run

Make sure the root `.env` includes your storage configuration:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
MEDIA_BUCKET=hhlews-media-reports
THUMBNAIL_BUCKET=hhlews-thumbnails
MAX_PHOTO_SIZE_MB=10
MAX_VIDEO_SIZE_MB=50
```

From the project root:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run build
```

To run the API:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main"
npm run start:api
```

To run the dashboard:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\dashboard"
npm run dev
```

Upload a report from the citizen app, then open the dashboard Ground Reports panel and use `Open secure media`.

## Verification

Verified successfully with:

- `npm run build` from the project root
- `npm run build` inside `dashboard`

Dashboard still shows the same existing Leaflet image asset warnings during build, but the build completes successfully.
