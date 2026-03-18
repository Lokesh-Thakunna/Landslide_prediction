# HH-LEWS — System Architecture

## 1. Service Breakdown

The HH-LEWS system is built using a decoupled microservices approach designed to operate on single-responsibility principles, ensuring isolation of heavy ML models from standard APIs.

| Service | Technology | Responsibility | Scalability |
| :--- | :--- | :--- | :--- |
| **API Gateway** | Node.js (Express) | Routing, Auth (JWT), WebSocket real-time updates, dashboard endpoints. | Scales horizontally behind Nginx (CPU-bound on WS). |
| **ML Inference** | FastAPI (Python 3.11) | Executing Scikit-Learn/XGBoost models, hot-loading `.pkl` files. | CPU-bound. Scaled to multiple containers at high-load. |
| **Task Queue** | Celery Workers | Async executions: Weather polling, inferences, and alerts. | Scalable worker depth per queue type. |
| **MQTT Broker** | Mosquitto (Eclipse) | Handling long-lived IoT telemetry streams. | Extremely high concurrent TCP connections. |
| **Data Store** | PostgreSQL 15 | Transactions, PostGIS queries, entity relationships, auditing. | Scales vertically. Connection pooling via pg-pool. |
| **State / Broker** | Redis 7 | Caching weather limits, ML predictions, and Celery broker queues. | Ram-bound, runs entirely in-memory. |

---

## 2. API Gateway Structure
The Node.js Express server acts as the primary access gate (port `3000`). It sits behind an `Nginx` reverse proxy configured to handle HTTPS TLS termination. 
- It terminates standard external routes (`/api/zones`, `/api/subscribe`).
- It hosts the persistent WebSocket connection (`wss://hhlews.in`).
- It acts as an internal client, passing well-formed validation payloads via `X-Internal-API-Key` headers securely over the Docker VPC (Virtual Private Cloud) to the FastAPI instance (`port 8000`).

---

## 3. Queue Usage (Celery)
We explicitly divide Celery workers by queues to prevent heavy ML pipeline backlogs from blocking an emergency SMS dispatch.

*   `polling_queue`: Fetches OpenWeatherMap API metrics every 5 mins.
*   `inference_queue`: Processes active zones against the latest ML thresholds. Triggered post-polling.
*   `alerts_queue`: Triggers bulk parallel processes matching Twilio REST SMS loops (`dispatch_sms_batch`) or MSG91 fallbacks.
*   `maintenance_queue`: Database partition clearing, sensor health checks. 

---

## 4. WebSocket Channel Design
The system provisions highly efficient one-to-many publish pipelines from Node.js (via `socket.io` or native WS) directly to the Dashboard React clients.
*   **Events published to Client:** `zone_risk_updated`, `alert_dispatched`, `sensor_offline`, `system_health`.
*   **Targeting:** Rather than a global broadcast, administrators can join WS rooms matching specific `district_id`s, reducing bandwidth (e.g., specific `subscribe_zone` commands).

---

## 5. Sensor Simulator Service
For Phase 1 deployment without physical piezometers or tilt-sensors, a "Sensor Simulator Layer" runs as a script or MQTT-pub worker.
*   **Mock Generation:** Feeds random-walk constrained JSON values corresponding to realistic soil saturations/vibrations based on active rainfall.
*   **Payload Schema:** `{ sensor_id, zone_id, ts, soil_saturation_pct, vibration_mps2 }`.
*   **Decoupled Hook:** By enforcing MQTT connections even for the simulator, switching to Phase 2 real-sensors requires absolutely zero codebase refactoring. Just disabling the Simulator script.

---

## 6. Scaling Model (Phase 1 -> Phase 2)
### Vertical -> Horizontal transition
*   **Phase 1 (Pilot):** Single AWS `t3.medium` EC2 containerizing Node/Python/Celery/Nginx, alongside a `t3.small` RDS DB.
*   **Phase 2 (10,000 Zones):** 
    1. Introduction of **Application Load Balancer (ALB)** driving traffic to `3x Node.js EC2 instances`.
    2. ElastiCache for Multi-AZ Redis persistence.
    3. Postgres auto-partitioning via `pg_partman` by Month/Year for massive temporal sensor-reading storage without degrading query times.
