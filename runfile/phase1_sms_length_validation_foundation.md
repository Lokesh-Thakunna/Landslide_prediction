# Phase 1 SMS Length Validation Foundation

## What I built

This task adds multilingual SMS length validation to the HH-LEWS alert workflow.

The system now:

- computes SMS character counts for each localized alert variant
- returns per-language SMS validation metadata in alert preview payloads
- adds preview notes that clearly say whether all SMS variants fit within the 160-character limit
- blocks manual alert dispatch when SMS is selected and at least one language variant exceeds the limit
- shows SMS count pills and pass/fail status in the dashboard preview UI before dispatch

This is a foundation step for the multilingual rollout because operators can now catch oversize SMS messages before they are queued.

## Files changed

### 1. `packages/contracts/src/index.ts`

Updated the shared alert preview contract to include SMS validation metadata on each localized message:

- `smsCharacterCount`
- `smsCharacterLimit`
- `smsWithinLimit`

This keeps the API and dashboard aligned on the new preview fields.

### 2. `services/api/src/lib/localization.ts`

Added backend SMS validation logic during localized preview generation.

What it now does:

- uses a 160-character SMS limit
- counts SMS characters with `Array.from(...)` so Unicode text is counted more safely
- records count, limit, and pass/fail state on each localized message
- appends preview notes showing whether the SMS check passed or which language variants exceeded the limit

### 3. `services/api/src/routes/protected.routes.ts`

Added server-side enforcement to manual alert dispatch.

Behavior:

- when the operator selects `SMS`
- and any localized preview variant is over the 160-character limit
- the backend rejects dispatch with a `400` error

This means the safety rule is enforced on the backend, not only in the dashboard UI.

### 4. `dashboard/src/types.ts`

Extended the dashboard alert preview types with:

- `sms_character_count`
- `sms_character_limit`
- `sms_within_limit`

They are optional on the dashboard side so local preview mode can still work even if the fields are missing.

### 5. `dashboard/src/services/api.ts`

Updated the API adapter layer so dashboard preview data can consume the backend SMS validation fields.

It also computes safe fallback values from `sms_body` when the backend fields are not present, which keeps local/demo preview mode working.

### 6. `dashboard/src/components/ManualAlertForm.tsx`

Enhanced the multilingual alert preview panel.

What changed:

- each language card now shows an `SMS count/limit` badge
- the badge turns green when the message fits and red when it exceeds the limit
- the SMS block now displays a clear pass/fail sentence
- the queue button is disabled when SMS is selected and any language variant is too long
- a blocking warning message is shown below the button when dispatch is not allowed

## How it works

1. The dashboard asks the API for the alert preview for the selected zone.
2. The API generates localized alert text for Hindi, Garhwali, Kumaoni, and English.
3. The API calculates SMS character counts for every localized SMS body.
4. The API returns the counts and pass/fail state in the preview payload.
5. The dashboard renders those values in the multilingual preview cards.
6. If the operator tries to send an SMS alert while one variant is too long, the dashboard blocks the action visually and the backend also rejects it.

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

To test the feature manually:

1. Open the dashboard.
2. Go to the manual alert trigger form.
3. Select a zone.
4. Review the multilingual preview cards.
5. Check the SMS count pill for each language.
6. If any language exceeds the limit, confirm that the queue button becomes blocked.

## Verification

Verified successfully with:

- `npm run build` from the project root
- `npm run build` inside `dashboard`

Dashboard build still shows the same existing Leaflet image asset warnings, but the build completes successfully.
