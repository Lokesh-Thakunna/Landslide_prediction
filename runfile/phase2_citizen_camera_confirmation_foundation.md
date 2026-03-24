# Phase 2 Citizen Camera Confirmation Foundation

## What I built

This task upgrades the citizen media-report flow so it behaves more like a real disaster reporting tool instead of a plain file input.

The citizen app now:

- gives separate actions for direct camera capture and gallery selection
- keeps camera capture as the preferred one-tap path
- shows a selected-media summary before upload
- shows whether the chosen file looks recent or older
- displays a language-aware confirmation block with attached GPS location and detected zone
- lets the user clear the selected file before sending

This builds on the earlier media-report upload foundation and better matches the improvement-plan requirement for direct camera access, GPS auto-capture, and language-aware confirmation.

## Files changed

### 1. `citizen_app/src/components/MediaReportCard.tsx`

Reworked the media upload card.

Added:

- explicit `Open camera` action
- explicit `Choose from gallery` action
- hidden file inputs for camera and gallery flows
- selected-file summary card
- freshness hint based on file timestamp
- localized confirmation block showing:
  - attached location
  - current zone
- clear-selection action before upload

The upload request itself still uses the existing real multipart API.

## How it works

1. The citizen opens the Ground Report section.
2. They can either:
   - open the camera directly, or
   - choose an existing photo/video from the gallery
3. After selecting media, the app shows:
   - file name
   - source type
   - file size
   - a freshness hint
4. The app also shows a confirmation panel with:
   - the current GPS coordinates already attached
   - the active detected zone
   - localized reminder text in the selected language
5. The user can clear the selection or submit the report.
6. After upload, the existing report-status panel still shows verification progress.

## Notes

This is a foundation slice:

- GPS is still coming from the existing location-guidance flow
- there is no live camera preview screen yet
- there is no background upload queue yet

But the citizen reporting experience is now much closer to the target field workflow.

## How to run

From the citizen app folder:

```powershell
cd "D:\Games\Landslide_prediction-main\Landslide_prediction-main\citizen_app"
npm run build
npm run dev
```

Open the citizen app, allow location access, then use the Ground Report card to:

- open the camera
- choose from gallery
- confirm attached location and zone
- submit the report

## Verification

Verified successfully with:

- `npm run build` inside `citizen_app`
