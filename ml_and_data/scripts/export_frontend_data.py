from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.config import (
    ACTIVE_ZONES_PATH,
    FRONTEND_CONTEXT_PATH,
    PREDICTIONS_PATH,
    ROOT_DIR,
    ZONE_FEATURES_PATH,
)


def build_warning_text(level: str, next_level: str | None) -> str:
    if level == "DANGER":
        return "Danger expected within 1 hour. Move toward the listed shelter now."
    if level == "WATCH" and next_level == "DANGER":
        return "Watch level now, but danger may follow soon. Prepare to move early."
    if level == "WATCH":
        return "Watch level. Stay alert and avoid steep roadside edges."
    return "Conditions are currently stable. Keep emergency contacts and route details ready."


def main() -> None:
    context = json.loads(FRONTEND_CONTEXT_PATH.read_text(encoding="utf-8"))
    predictions = json.loads(PREDICTIONS_PATH.read_text(encoding="utf-8"))["snapshots"]
    zone_features = {
        item["zone_id"]: item
        for item in json.loads(ZONE_FEATURES_PATH.read_text(encoding="utf-8"))
    }
    rainfall_inputs = {
        item["zone_id"]: item
        for item in json.loads(ACTIVE_ZONES_PATH.read_text(encoding="utf-8"))
    }

    zones_by_id = {item["zone_id"]: item for item in context["zones"]}
    districts = context["districts"]
    shelters = context["shelters"]
    routes = context["routes"]
    emergency_contacts = context["emergency_contacts"]

    dashboard_zones = []
    citizen_zones = []
    dashboard_forecasts: dict[str, dict] = {}
    citizen_forecasts: dict[str, dict] = {}

    for snapshot in predictions:
        zone = zones_by_id[snapshot["zone_id"]]
        rainfall = rainfall_inputs.get(snapshot["zone_id"])
        if rainfall is None:
            rainfall = {
                "rainfall_mm_hr": 0,
                "rainfall_6h_avg_mm_hr": 0,
                "rainfall_24h_total_mm": 0,
            }

        forecast_items = snapshot["forecast"]
        next_level = forecast_items[0]["risk_level"] if forecast_items else None

        dashboard_zones.append(
            {
                "zone_id": snapshot["zone_id"],
                "zone_name": snapshot["zone_name"],
                "district_id": snapshot["district_id"],
                "district_name": zone["district_name"],
                "risk_score": snapshot["current"]["risk_score"],
                "risk_level": snapshot["current"]["risk_level"],
                "rainfall_mm_hr": rainfall["rainfall_mm_hr"],
                "rainfall_6h_avg_mm_hr": rainfall["rainfall_6h_avg_mm_hr"],
                "rainfall_24h_total_mm": rainfall["rainfall_24h_total_mm"],
                "soil_moisture_proxy_pct": snapshot["soil_moisture_proxy_pct"],
                "ground_movement_proxy_pct": snapshot["ground_movement_proxy_pct"],
                "slope_degrees": zone_features[snapshot["zone_id"]]["slope_degrees"],
                "historical_landslide_frequency": zone_features[snapshot["zone_id"]][
                    "historical_landslide_frequency"
                ],
                "predicted_at": snapshot["current"]["predicted_at"],
                "is_stale": False,
                "coordinates": zone["coordinates"],
                "polygon": zone["polygon"],
            }
        )

        dashboard_forecasts[snapshot["zone_id"]] = {
            "zone_id": snapshot["zone_id"],
            "current": {
                "risk_score": snapshot["current"]["risk_score"],
                "risk_level": snapshot["current"]["risk_level"],
                "predicted_at": snapshot["current"]["predicted_at"],
            },
            "forecast": [
                {
                    "horizon_hours": item["horizon_hours"],
                    "risk_score": item["risk_score"],
                    "risk_level": item["risk_level"],
                    "forecast_for": item["forecast_for"],
                }
                for item in forecast_items
            ],
            "top_features": snapshot["top_features"],
        }

        citizen_zones.append(
            {
                "zone_id": snapshot["zone_id"],
                "zone_name": snapshot["zone_name"],
                "district_id": snapshot["district_id"],
                "district_name": zone["district_name"],
                "risk_score": snapshot["current"]["risk_score"],
                "risk_level": snapshot["current"]["risk_level"],
                "rainfall_mm_hr": rainfall["rainfall_mm_hr"],
                "warning_text": build_warning_text(snapshot["current"]["risk_level"], next_level),
                "updated_at": snapshot["current"]["predicted_at"],
            }
        )

        citizen_forecasts[snapshot["zone_id"]] = {
            "zone_id": snapshot["zone_id"],
            "current": {
                "risk_score": snapshot["current"]["risk_score"],
                "risk_level": snapshot["current"]["risk_level"],
                "predicted_at": snapshot["current"]["predicted_at"],
            },
            "forecast": [
                {
                    "horizon_hours": item["horizon_hours"],
                    "risk_score": item["risk_score"],
                    "risk_level": item["risk_level"],
                    "forecast_for": item["forecast_for"],
                }
                for item in forecast_items
            ],
        }

    dashboard_hotspots = sorted(
        [
            {
                "zone_id": zone["zone_id"],
                "risk_score": zone["risk_score"],
                "risk_level": zone["risk_level"],
                "trend": "rising"
                if dashboard_forecasts[zone["zone_id"]]["forecast"]
                and dashboard_forecasts[zone["zone_id"]]["forecast"][0]["risk_score"] > zone["risk_score"]
                else "steady",
                "next_horizon_level": dashboard_forecasts[zone["zone_id"]]["forecast"][0]["risk_level"]
                if dashboard_forecasts[zone["zone_id"]]["forecast"]
                else zone["risk_level"],
                "district_id": zone["district_id"],
            }
            for zone in dashboard_zones
            if zone["risk_level"] == "DANGER" or zone["risk_score"] >= 45
        ],
        key=lambda item: item["risk_score"],
        reverse=True,
    )[:3]

    dashboard_alerts = [
        {
            "id": "alert_01",
            "zone_id": dashboard_zones[0]["zone_id"],
            "zone_name": dashboard_zones[0]["zone_name"],
            "risk_level": dashboard_zones[0]["risk_level"],
            "trigger_source": "AUTO_FORECAST",
            "channels": ["SMS", "WHATSAPP"],
            "recipient_count": 187,
            "delivery_status": "QUEUED",
            "created_at": predictions[0]["current"]["predicted_at"],
        }
    ]

    dashboard_bundle = {
        "districts": districts,
        "zones": dashboard_zones,
        "hotspots": dashboard_hotspots,
        "shelters": shelters,
        "routes": routes,
        "alerts": dashboard_alerts,
        "forecasts": dashboard_forecasts,
    }

    citizen_bundle = {
        "zones": citizen_zones,
        "forecasts": citizen_forecasts,
        "shelters": shelters,
        "routes": routes,
        "emergencyContacts": emergency_contacts,
    }

    dashboard_path = ROOT_DIR.parent / "dashboard" / "public" / "demo-data"
    citizen_path = ROOT_DIR.parent / "citizen_app" / "public" / "demo-data"
    dashboard_path.mkdir(parents=True, exist_ok=True)
    citizen_path.mkdir(parents=True, exist_ok=True)

    (dashboard_path / "dashboard.json").write_text(
        json.dumps(dashboard_bundle, indent=2),
        encoding="utf-8",
    )
    (citizen_path / "citizen.json").write_text(
        json.dumps(citizen_bundle, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {dashboard_path / 'dashboard.json'}")
    print(f"Wrote {citizen_path / 'citizen.json'}")


if __name__ == "__main__":
    main()
