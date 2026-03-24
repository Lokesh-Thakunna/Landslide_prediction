import { CloudRain, Mountain, Route, Warehouse } from "lucide-react";
import { EvacuationPathEditor } from "./EvacuationPathEditor";
import { MediaReportsPanel } from "./MediaReportsPanel";
import { formatFeatureLabel, formatTimestamp } from "../lib/format";
import {
  getDashboardDictionary,
  getDashboardRiskLabel,
  type DashboardLanguage
} from "../lib/i18n";
import { formatRiskCopy, riskTone } from "../lib/risk";
import type {
  DangerZone,
  ElevationProfile,
  EvacuationRoute,
  LiveWeather,
  MediaReport,
  Shelter,
  ZoneForecast,
  ZoneRoadConditions,
  ZoneRisk
} from "../types";

interface ZoneDrawerProps {
  language: DashboardLanguage;
  zone: ZoneRisk | null;
  forecast: ZoneForecast | null;
  liveWeather: LiveWeather | null;
  shelters: Shelter[];
  route: EvacuationRoute | null;
  roadConditions: ZoneRoadConditions | null;
  elevationProfile: ElevationProfile | null;
  dangerZones: DangerZone[];
  mediaReports: MediaReport[];
  mediaStats: {
    total: number;
    pending: number;
    verified: number;
    flagged: number;
  } | null;
  onSavePath: () => Promise<void>;
  onRefreshMedia: () => Promise<void>;
}

export function ZoneDrawer({
  language,
  zone,
  forecast,
  liveWeather,
  shelters,
  route,
  roadConditions,
  elevationProfile,
  dangerZones,
  mediaReports,
  mediaStats,
  onSavePath,
  onRefreshMedia
}: ZoneDrawerProps) {
  const copy = getDashboardDictionary(language);

  if (!zone) {
    return (
      <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_60px_rgba(17,32,22,0.08)] backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">{copy.zone}</h2>
        <p className="mt-3 text-sm text-slate-600">
          {language === "hi"
            ? "वर्तमान और पूर्वानुमान स्थिति देखने के लिए मानचित्र या हॉटस्पॉट पैनल से कोई क्षेत्र चुनें।"
            : "Select a zone from the map or hotspot panel to review current and forecast conditions."}
        </p>
      </section>
    );
  }

  const primaryShelter = shelters[0];

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_60px_rgba(17,32,22,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {copy.zone}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">{zone.zone_name}</h2>
          <p className="mt-1 text-sm text-slate-600">{zone.district_name}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone(zone.risk_level)}`}>
          {getDashboardRiskLabel(language, zone.risk_level)}
        </span>
      </div>

      <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {formatRiskCopy(zone.risk_level)}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard label={language === "hi" ? "वर्तमान स्कोर" : "Current score"} value={zone.risk_score} />
        <StatCard
          label={language === "hi" ? "वर्षा" : "Rainfall"}
          value={`${liveWeather?.rainfall_mm_hr ?? zone.rainfall_mm_hr} mm/hr`}
        />
        <StatCard
          label={language === "hi" ? "अपडेट" : "Updated"}
          value={formatTimestamp(liveWeather?.observed_at ?? zone.predicted_at)}
        />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
          Forecast
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <ForecastCard
            title="Current"
            score={forecast?.current.risk_score ?? zone.risk_score}
            level={forecast?.current.risk_level ?? zone.risk_level}
            timestamp={forecast?.current.predicted_at ?? zone.predicted_at}
          />
          {forecast?.forecast.map((item) => (
            <ForecastCard
              key={item.horizon_hours}
              title={`+${item.horizon_hours}h`}
              score={item.risk_score}
              level={item.risk_level}
              timestamp={item.forecast_for}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricCard
          icon={CloudRain}
          title="Rainfall overlay"
          values={[
            `Latest: ${liveWeather?.rainfall_mm_hr ?? zone.rainfall_mm_hr} mm/hr`,
            `6h avg: ${zone.rainfall_6h_avg_mm_hr} mm/hr`,
            `24h total: ${zone.rainfall_24h_total_mm} mm`,
            `Feed: ${formatWeatherSource(liveWeather?.source)}`,
            `Freshness: ${liveWeather?.is_stale ? "stale / fallback" : "live"}`,
          ]}
        />
        <MetricCard
          icon={Mountain}
          title="Proxy and terrain context"
          values={[
            `Soil moisture proxy: ${zone.soil_moisture_proxy_pct}%`,
            `Movement proxy: ${zone.ground_movement_proxy_pct}%`,
            `Slope: ${zone.slope_degrees}°`,
          ]}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricCard
          icon={Warehouse}
          title="Shelter summary"
          values={
            primaryShelter
              ? [
                  primaryShelter.name,
                  `Capacity: ${primaryShelter.capacity}`,
                  `Distance: ${primaryShelter.distance_km} km`,
                ]
              : ["No shelter assigned yet", "Capacity unavailable", "Distance unavailable"]
          }
        />
        <MetricCard
          icon={Route}
          title="Evacuation route"
          values={
            route
              ? [
                  `${route.distance_km} km estimated`,
                  `${route.estimated_minutes} minutes`,
                  `Road status: ${route.road_status ?? "open"}`,
                  route.instruction_summary,
                ]
              : ["No route published", "Distance unavailable", "Instructions unavailable"]
          }
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <RoadConditionsCard roadConditions={roadConditions} />
        <ElevationProfileCard elevationProfile={elevationProfile} />
      </div>

      <div className="mt-5">
        <DangerZonesCard dangerZones={dangerZones} />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
          Top contributing features
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {forecast?.top_features.map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-900"
            >
              {formatFeatureLabel(feature)}
            </span>
          ))}
        </div>
      </div>

      <EvacuationPathEditor
        zoneId={zone.zone_id}
        route={route}
        shelters={shelters}
        roadConditions={roadConditions}
        onSaved={onSavePath}
      />

      <MediaReportsPanel
        reports={mediaReports}
        total={mediaStats?.total ?? 0}
        pending={mediaStats?.pending ?? 0}
        verified={mediaStats?.verified ?? 0}
        flagged={mediaStats?.flagged ?? 0}
        onRefresh={onRefreshMedia}
      />
    </section>
  );
}

function DangerZonesCard({ dangerZones }: { dangerZones: DangerZone[] }) {
  if (!dangerZones.length) {
    return (
      <MetricCard
        icon={Mountain}
        title="Active danger zones"
        values={[
          "No active danger polygons published for this zone",
          "Nearest-danger guidance will fall back to the zone center",
          "Publish field-confirmed hazard areas as they are identified"
        ]}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-slate-900">
        <Mountain className="h-4 w-4 text-rose-700" />
        <h3 className="font-semibold">Active danger zones</h3>
      </div>
      <div className="mt-3 space-y-3">
        {dangerZones.map((dangerZone) => (
          <div key={dangerZone.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-slate-900">{dangerZone.name}</div>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-900">
                {dangerZone.severity}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {dangerZone.type.replace(/_/g, " ")} • Updated {formatTimestamp(dangerZone.updated_at)}
            </div>
            <div className="mt-2 text-sm text-slate-700">{dangerZone.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ForecastCard({
  title,
  score,
  level,
  timestamp,
}: {
  title: string;
  score: number;
  level: ZoneRisk["risk_level"];
  timestamp: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskTone(level)}`}>
          {level}
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">{score}</div>
      <div className="mt-2 text-sm text-slate-500">{formatTimestamp(timestamp)}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  values,
}: {
  icon: typeof CloudRain;
  title: string;
  values: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-slate-900">
        <Icon className="h-4 w-4 text-emerald-700" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        {values.map((value) => (
          <div key={value}>{value}</div>
        ))}
      </div>
    </div>
  );
}

function RoadConditionsCard({
  roadConditions
}: {
  roadConditions: ZoneRoadConditions | null;
}) {
  if (!roadConditions) {
    return (
      <MetricCard
        icon={Route}
        title="Road condition overlay"
        values={[
          "No road-condition snapshot available",
          "Polling is not configured for this zone",
          "Overlay will appear once segment data is loaded"
        ]}
      />
    );
  }

  const topSegments = roadConditions.segments
    .slice()
    .sort((left, right) => right.condition.severity_pct - left.condition.severity_pct)
    .slice(0, 3);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-slate-900">
        <Route className="h-4 w-4 text-amber-700" />
        <h3 className="font-semibold">Road condition overlay</h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
        <div>Open: {roadConditions.summary.open_count}</div>
        <div>Caution: {roadConditions.summary.caution_count}</div>
        <div>Blocked: {roadConditions.summary.blocked_count}</div>
        <div>Flooded: {roadConditions.summary.flooded_count}</div>
      </div>
      <div className="mt-3 text-sm text-slate-600">
        Worst status: {roadConditions.summary.worst_status}
      </div>
      <div className="mt-1 text-sm text-slate-500">
        Updated {formatTimestamp(roadConditions.summary.updated_at)}
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {topSegments.map((segment) => (
          <div
            key={segment.id}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3"
          >
            <div className="font-semibold text-slate-800">{segment.name}</div>
            <div className="mt-1">
              {segment.condition.status} • {segment.condition.delay_minutes} min delay
            </div>
            <div className="mt-1">{segment.condition.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ElevationProfileCard({
  elevationProfile
}: {
  elevationProfile: ElevationProfile | null;
}) {
  if (!elevationProfile) {
    return (
      <MetricCard
        icon={Mountain}
        title="Elevation profile"
        values={[
          "No elevation profile available",
          "Terrain summary is pending",
          "Officials can review ascent and descent once loaded"
        ]}
      />
    );
  }

  const range = Math.max(
    1,
    elevationProfile.max_elevation_m - elevationProfile.min_elevation_m
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-slate-900">
        <Mountain className="h-4 w-4 text-emerald-700" />
        <h3 className="font-semibold">Elevation profile</h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
        <div>Ascent: {elevationProfile.total_ascent_m} m</div>
        <div>Descent: {elevationProfile.total_descent_m} m</div>
        <div>Low: {elevationProfile.min_elevation_m} m</div>
        <div>High: {elevationProfile.max_elevation_m} m</div>
      </div>
      <div className="mt-3 text-sm text-slate-600">
        Valley exposure: {elevationProfile.valley_exposure}
      </div>
      <div className="mt-1 text-sm text-slate-600">
        {elevationProfile.recommended_direction_label}
      </div>
      <div className="mt-4 flex items-end gap-2">
        {elevationProfile.points.map((point) => (
          <div key={point.distance_km} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-lg bg-emerald-500/70"
              style={{
                height: `${Math.max(
                  28,
                  ((point.elevation_m - elevationProfile.min_elevation_m) / range) * 96 + 18
                )}px`
              }}
            />
            <div className="text-[11px] text-slate-500">{point.distance_km} km</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatWeatherSource(source?: string) {
  if (!source) {
    return "unknown";
  }

  return source.replace(/-/g, " ");
}
