# HH-LEWS — Technical Feature & Service Breakdown

## 1. Technical Feature Breakdown

The HH-LEWS backend architecture is designed around asynchronous data pipelines, isolated ML inference, and high-concurrency alert dispatch.

### Data Ingestion Layer
*   **Weather Polling Engine:** Background cron job (Celery Beat) fetching per-zone live weather metrics (rainfall intensity, humidity, pressure) from OpenWeatherMap APIs.
*   **Static Terrain Processing:** One-time preprocessing of local SRTM DEM files to calculate static topology risk (slope, aspect, elevation, curvature) stored via PostGIS.
*   **Simulated IoT/MQTT Telemetry:** Mosquitto-based MQTT broker accepting live (or simulated) incoming connections tracking `soil_saturation` and `vibrations_mps2`.
*   **Data Validation Pipeline:** Strict JSON Schema checking + physical boundary checks (e.g., saturation not > 100%) prior to storage.

### AI Risk Prediction Engine
*   **Dynamic Feature Assembly:** Merging static GIS data, rolling weather sums (e.g. 72h antecedent rainfall), and live sensor stats in an in-memory batch.
*   **FastAPI Inference Gate:** REST `/predict` exposed securely within the backend VPC, wrapping Scikit-Learn (Random Forest) and XGBoost.
*   **Ensemble Scoring Mechanism:** Combining RF class probabilities with XGBoost continuous score to yield a `0.0-1.0` `risk_score`.
*   **Two-Cycle Validation:** State-tracking to ensure alerts are verified against at least two polling cycles to squash sensor-noise pseudo-events.

### Multichannel Alert Mechanism
*   **Rule-based Threshold Engine:** Applies the calculated scores to defined thresholds (`HIGH>=0.65`, `CRITICAL>=0.85`).
*   **Rate & Cooldown Limiters:** Limits redundant messaging using Redis TTL mechanisms (30-minute block on identical zones unless escalating).
*   **Twilio / MSG91 SMS Dispatch:** Parallel, bulk phone-number decryption and SMS formatting in Hindi.
*   **WhatsApp API & Exotel IVR Integration:** Rich notification hooks and voice-fallback capability for non-literate/elderly citizens.

### Dashboards and WebSockets
*   **VPC Socket Publisher:** React dashboard clients subscribe to `zone_id` specific Websocket channels on the Node.js API server.
*   **JWT Protected RBAC:** Admin and District officials separated logically, dictating which manual alert controls they can access.
*   **GeoJSON Rendering APIS:** Fast PostgreSQL indexed retrievals of safe zones and districts to populate the Leaflet UI maps.

---

## 2. Feature-to-Service Mapping

| Feature / Capability | Responsible Service (Container) | Technology / Protocol |
| :--- | :--- | :--- |
| JWT Issuance & Validation | **Node.js API Gateway** | Express + JSONWebToken |
| Real-time Map Updates | **Node.js API Gateway** | Socket.io / Native WebSockets |
| ML Model Loading & Hot Swap | **FastAPI ML Service** | Python, Joblib, REST |
| Risk Score Inference | **FastAPI ML Service** | Scikit-Learn, PyDantic |
| Weather Polling Timer | **Celery Beat** | Python Scheduled Tasks |
| IoT Data Ingestion Handlers | **Celery MQTT Workers** | Python \`paho-mqtt\` client |
| Outbound SMS orchestration | **Celery Alert Workers** | Twilio/MSG91 REST API |
| Sensor Heartbeat & LWT | **MQTT Broker** | Eclipse Mosquitto |
| In-Memory Cache & States | **Redis Broker/Cache** | Redis 7+ |
| Relational & GIS Storage | **Database Node** | PostgreSQL 15 + PostGIS |

---

## 3. Real-time vs Batch Features

### Real-time (Low Latency < 1s)
*   **Websocket Pushes:** Changes in risk level triggering live `zone_risk_updated` events.
*   **Rule / Threshold Evaluations:** Happens immediately trailing an ML cycle.
*   **Manual Alert Overrides:** Direct `/alerts/trigger` API dispatching the worker threads instantly.
*   **ML Prediction Endpoint:** The `/predict` invocation itself averages < 500ms.

### Batch & Asynchronous 
*   **Inference Pipeline:** Triggered globally every **5 minutes** by Celery Beat to prevent over-burdening the server.
*   **Weather API Polling:** Runs on an equivalent **5-minute batch window** to circumvent 429 external rate limits.
*   **Historical Log Partitions Cleaning:** Midnight Postgres cleanup queries dropping 90+ day old partitions.
*   **ML Feedback Loop:** Training queue aggregating `500+` alerts over weeks for future model fine-tuning.

---

## 4. Future Extensibility Hooks

*   **Phase 2 Hardware Injection:** The system's decoupling via Mosquitto means simulated script generation can be disabled, and physical field Piezeometers can immediately connect without changing a single line of backend logic.
*   **Federated Learning Integration:** Storing full prediction data points (the `features_vector` JSONB property) makes exporting to Central Academic Hubs (IIT Roorkee / Wadia Institute) trivial.
*   **InSAR Satellite Verification:** Hook architecture allows extending the ingestion workers to pull from ISRO Bhuvan satellite deformation metrics.
*   **NDMA IDRN Push API:** Alerts can be piped not just to Twilio, but forwarded cleanly to National Government resource networks using additional Celery queues.
