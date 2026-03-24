# BHURAKSHAN Technical Features

## 1. Data Ingestion Layer

- live rainfall polling from a weather API
- static zone geometry and terrain slope
- historical landslide density and frequency per zone
- proxy generation for soil moisture and ground movement

## 2. AI Risk Engine

- Random Forest inference service
- `0-100` risk score output
- `SAFE`, `WATCH`, `DANGER` mapping
- forecast generation for `current`, `+1h`, and `+2h`
- top feature extraction for operator visibility

## 3. Alert Layer

- automatic SMS alerts
- automatic WhatsApp alerts
- manual dashboard trigger
- nearest shelter recommendation
- evacuation route summary
- alert dispatch log

## 4. Visualization Layer

- Leaflet risk map
- hotspot markers
- zone detail drawer
- forecast cards
- citizen-friendly mobile interface

## 5. Feature-to-Service Mapping

| Feature | Primary service |
| --- | --- |
| Rainfall polling | Worker |
| Proxy generation | Worker |
| ML prediction | FastAPI service |
| Risk and forecast APIs | Node.js gateway |
| Alert orchestration | Worker plus API gateway |
| Map updates | Dashboard plus WebSocket |
| Shelter and route guidance | API gateway plus PostGIS |

## 6. Real-Time vs Batch

### Near real time

- dashboard refresh
- current zone risk
- alert dispatch
- hotspot updates

### Scheduled batch

- rainfall polling
- forecast recalculation
- data cleanup
- model evaluation refresh

## 7. Future Hooks

- live sensors
- SAR validation
- multilingual voice channels
- GPS-based mobile alerts
