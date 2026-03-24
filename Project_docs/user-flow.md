# BHURAKSHAN User Flows

## 1. Citizen Flow: Alert Received

1. a zone reaches `DANGER` now or in the next two hours
2. citizen receives SMS or WhatsApp alert
3. alert message includes:
   - zone name
   - danger status
   - shelter name
   - route summary or link
4. citizen opens the mobile interface
5. citizen sees:
   - current risk
   - `+1h` and `+2h` forecast
   - nearest safe shelter
   - evacuation route

## 2. Citizen Flow: Self-Check Without Alert

1. citizen opens the app or web link
2. current zone status is shown
3. if risk is `WATCH`, the interface emphasizes readiness
4. if risk is `DANGER`, the interface switches to action-first guidance

## 3. Official Flow: Daily Monitoring

1. operator opens dashboard
2. map shows current zone colors
3. hotspot list shows highest-risk and fastest-rising zones
4. operator opens a zone drawer
5. current and forecast scores are reviewed
6. if needed, operator triggers a manual alert

## 4. Official Flow: Forecast-Based Escalation

1. zone is `WATCH` now
2. `+1h` forecast becomes `DANGER`
3. hotspot list moves the zone upward
4. operator sees shelter and route context
5. auto-alert is dispatched or operator confirms manual alert

## 5. Admin Flow: Zone Onboarding

1. add district and zone geometry
2. set slope and historical frequency baseline
3. map shelters and routes
4. enable the zone for rainfall polling and prediction

## 6. Prediction Lifecycle

1. worker fetches rainfall
2. worker computes moisture proxy
3. worker calls ML for current, `+1h`, and `+2h`
4. scores are stored and published
5. alert rules run against the results

## 7. Edge Cases

### Weather provider failure

- fall back to secondary provider
- mark stale data if both fail

### ML service failure

- use rules-based fallback score
- show degraded mode in dashboard

### Duplicate citizen subscription

- dedupe by phone hash plus zone

### Repeated danger alerts

- enforce cooldown by zone
