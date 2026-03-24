# Phase 2 Media Abuse And Privacy Foundation

## Task completed

Implemented the next task slice from `Task_HH-LEWS_Improvements.md` for the media-reports improvement:

- per-device upload throttling foundation
- privacy and moderation flag inference for citizen uploads
- safer media type acceptance on the public upload API
- dashboard review visibility for reporter hash, AI flags, and privacy-review hints

This slice advances the remaining media-report items around:

- rate limiting for repeated uploads
- privacy-aware handling before wider reuse of citizen media
- moderator-visible abuse signals
- safer review flow before future AI verification and external media storage work

## What was built

### 1. Upload throttling and reporter hashing

Updated `services/api/src/routes/public.routes.ts`.

The public upload flow now:

- accepts a stable client reporter token from the citizen app
- hashes that token server-side before storage
- falls back to a hashed network identity when the client token is missing
- enforces a `3 uploads per hour` limit per reporter identity
- returns a clear `429` error if the hourly limit is exceeded

This gives the platform a practical anti-spam foundation without exposing raw phone or device values to dashboard operators.

### 2. Privacy and moderation signal inference

Updated `services/api/src/lib/media-reports.ts`.

The verification helper now adds AI-style flags for:

- contact details in the description
- abusive or spam-like wording
- people/face privacy hints
- stale device timestamps
- suspicious future device timestamps

If a report hits one of these moderation-review conditions, it is kept in manual-review flow instead of being auto-verified.

### 3. Reporter-aware state helper

Updated `services/api/src/lib/state-store.ts`.

The state layer now has a helper to count recent uploads from the same hashed reporter identity, which is what the public upload route uses for the new throttle check.

### 4. Citizen app upload UX hardening

Updated `citizen_app/src/components/MediaReportCard.tsx`.

The citizen report card now:

- creates and persists a stable per-device reporter token in local storage
- sends that token with media uploads
- prefers camera capture with `capture="environment"`
- explains the `3 per hour` upload cap
- warns citizens not to include phone numbers or personal details in descriptions

### 5. Dashboard moderation visibility

Updated `dashboard/src/components/MediaReportsPanel.tsx`.

The dashboard review panel now shows:

- masked reporter hash
- AI flags as badges
- privacy-review warning text for sensitive reports
- risk boost amount
- review notes and review timestamp

This gives operators much better context before they verify, reject, or mark a report as duplicate.

## Files changed and what each one does

- `services/api/src/lib/media-reports.ts`
  - Adds moderation/privacy flag inference and manual-review gating logic

- `services/api/src/lib/state-store.ts`
  - Adds recent-upload counting by hashed reporter identity

- `services/api/src/routes/public.routes.ts`
  - Adds allowed MIME checks, reporter hashing, and `3 uploads per hour` throttling

- `citizen_app/src/components/MediaReportCard.tsx`
  - Adds stable reporter token generation, camera-first upload, and citizen upload guidance

- `dashboard/src/components/MediaReportsPanel.tsx`
  - Shows AI flags, masked reporter identity, privacy hints, risk boost, and review metadata

- `services/api/src/data/seed.ts`
  - Seeds a media report with a privacy-review style AI flag so the new moderation panel has realistic demo data

- `dashboard/src/data/mockDashboard.ts`
  - Adds reporter hash and moderation flag demo data for local dashboard preview mode

## How it works

1. The citizen opens the report card and selects a fresh photo or short video.
2. The citizen app attaches:
   - location
   - language
   - description
   - device timestamp
   - a stable per-device reporter token
3. The API hashes the reporter identity and checks how many uploads were already received from that identity in the last hour.
4. If the count is already `3`, the API returns a `429` rate-limit error.
5. If the upload is allowed, the API:
   - validates MIME type
   - finds the nearest active zone
   - checks duplicates
   - infers AI labels and moderation/privacy flags
6. Reports with privacy or moderation concerns stay in `unverified` review flow.
7. Dashboard operators can then see the masked reporter hash, AI flags, and privacy warning before taking a review action.

## Scope note

This is a moderation and privacy foundation, not the final full verification pipeline.

It does **not** yet include:

- S3 media storage
- antivirus scanning
- face-blur image processing
- EXIF verification
- duplicate image hashing across binary media
- Vision API / AI verification workers
- real Redis-backed distributed rate limiting

What it provides now is the first practical guardrail layer:

- per-reporter throttling
- privacy-review hints
- abuse signal tagging
- better dashboard review context

## How to run

### Root services build

```bash
npm run build
```

### API

```bash
cd services/api
npm run dev
```

### Citizen app

```bash
cd citizen_app
npm run dev
```

Open the report card, choose a photo/video, and submit from a live location.

### Dashboard

```bash
cd dashboard
npm run dev
```

Open a zone drawer and review the ground reports panel to see the new moderation and privacy signals.

## Verification done

- `npm run build` at repo root: passed
- `npm run build` in `citizen_app`: passed
- `npm run build` in `dashboard`: passed

Dashboard still shows the existing Leaflet image warnings during build, but the build succeeds.
