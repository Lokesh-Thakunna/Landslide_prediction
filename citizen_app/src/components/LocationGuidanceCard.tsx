import { Compass, LocateFixed, TriangleAlert } from "lucide-react";
import { getCitizenDictionary } from "../lib/i18n";
import type { LanguageCode, LocationStatus } from "../types";

interface LocationGuidanceCardProps {
  language: LanguageCode;
  status: LocationStatus | null;
  deviceHeading: number | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
}

const guidanceCopyByLanguage: Record<
  LanguageCode,
  {
    currentHeading: string;
    headingFallback: string;
    headingUnavailable: string;
    locallyDetected: (degrees: number) => string;
    calibrate: string;
    safeTurn: string;
    angleToDanger: (degrees: number) => string;
  }
> = {
  hi: {
    currentHeading: "वर्तमान दिशा",
    headingFallback: "दिशा",
    headingUnavailable: "दिशा उपलब्ध नहीं",
    locallyDetected: (degrees) => `${degrees}° स्थानीय रूप से मिला`,
    calibrate: "कंपास ठीक करने के लिए फोन घुमाएँ",
    safeTurn: "सुरक्षित मोड़",
    angleToDanger: (degrees) => `खतरे की दिशा से कोण: ${degrees}°`
  },
  en: {
    currentHeading: "Current heading",
    headingFallback: "Heading",
    headingUnavailable: "Heading unavailable",
    locallyDetected: (degrees) => `${degrees}° detected locally`,
    calibrate: "Move your phone to calibrate the compass",
    safeTurn: "Safe turn",
    angleToDanger: (degrees) => `Angle to danger direction: ${degrees}°`
  },
  "hi-x-garhwali": {
    currentHeading: "हाळ की दिशा",
    headingFallback: "दिशा",
    headingUnavailable: "दिशा नि मिली",
    locallyDetected: (degrees) => `${degrees}° फोन स्यूं मिली`,
    calibrate: "कंपास ठीकरण खातर फोन घुमावा",
    safeTurn: "सुरक्षित मोड़",
    angleToDanger: (degrees) => `खतरो कु कोण: ${degrees}°`
  },
  "hi-x-kumaoni": {
    currentHeading: "हाळ की दिशा",
    headingFallback: "दिशा",
    headingUnavailable: "दिशा नै मिली",
    locallyDetected: (degrees) => `${degrees}° फोन स्यूं मिल्यो`,
    calibrate: "कंपास ठीक करणा खातिर फोन घुमाओ",
    safeTurn: "सुरक्षित मोड़",
    angleToDanger: (degrees) => `खतरा की दिशा से कोण: ${degrees}°`
  }
};

export function LocationGuidanceCard({
  language,
  status,
  deviceHeading,
  loading,
  error,
  onRefresh
}: LocationGuidanceCardProps) {
  const copy = getCitizenDictionary(language);
  const guidanceCopy = guidanceCopyByLanguage[language];

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-semibold text-slate-900">{copy.locationGuidance}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">{copy.locationGuidanceSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {loading ? copy.locatingLabel : copy.locationButton}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      {!status && !error ? (
        <p className="mt-4 text-sm text-slate-600">{copy.locationUnavailable}</p>
      ) : null}

      {status ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <InfoBlock
              icon={LocateFixed}
              label={copy.currentPosition}
              value={`${status.user_location.zone_name}, ${status.user_location.district}`}
              detail={`${status.user_location.lat.toFixed(4)}, ${status.user_location.lon.toFixed(4)}`}
            />
            <InfoBlock
              icon={TriangleAlert}
              label={copy.nearestDanger}
              value={status.risk.nearest_danger_zone_name || status.risk.danger_direction_label}
              detail={`${status.risk.nearest_danger_m} m · ${status.risk.danger_direction_label}`}
            />
            <InfoBlock
              icon={Compass}
              label={copy.recommendedSafeZone}
              value={status.evacuation.recommended_safe_zone.name}
              detail={`${status.evacuation.offline_fallback.bearing_label} · ${status.evacuation.recommended_safe_zone.distance_km} km`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock
              icon={Compass}
              label={guidanceCopy.currentHeading}
              value={
                status.movement.user_heading_degrees !== null
                  ? status.movement.heading_label || guidanceCopy.headingFallback
                  : guidanceCopy.headingUnavailable
              }
              detail={
                status.movement.user_heading_degrees !== null
                  ? `${status.movement.user_heading_degrees}°`
                  : deviceHeading !== null
                    ? guidanceCopy.locallyDetected(Math.round(deviceHeading))
                    : guidanceCopy.calibrate
              }
            />
            <InfoBlock
              icon={TriangleAlert}
              label={guidanceCopy.safeTurn}
              value={status.movement.safe_bearing_label}
              detail={`${status.movement.safe_bearing_degrees}°`}
            />
          </div>

          {status.warnings.length ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                status.movement.moving_toward_danger
                  ? "border border-rose-200 bg-rose-50 text-rose-900"
                  : "border border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {status.warnings.map((warning) => (
                <div key={warning.type}>{warning.message}</div>
              ))}
            </div>
          ) : null}

          {status.movement.danger_bearing_delta_degrees !== null ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              {guidanceCopy.angleToDanger(status.movement.danger_bearing_delta_degrees)}
            </div>
          ) : null}

          {status.risk.nearest_danger_note ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {status.risk.nearest_danger_note}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm font-semibold text-slate-900">{copy.recommendedSafeZone}</div>
            <div className="mt-2 text-xl font-semibold text-slate-950">
              {status.evacuation.recommended_safe_zone.name}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
              <span>{status.evacuation.route.distance_km} km</span>
              <span>{status.evacuation.route.walk_time_min} min</span>
              <span>
                {status.evacuation.route.is_uphill ? copy.uphillLabel : copy.downhillLabel}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {status.evacuation.route.steps.map((step, index) => (
                <div
                  key={`${index}-${step}`}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                >
                  {index + 1}. {step}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4">
            <div className="text-sm font-semibold text-slate-900">{copy.fallbackDirection}</div>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {status.evacuation.offline_fallback.bearing_label}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {status.evacuation.offline_fallback.distance_km} km ·{" "}
              {status.evacuation.offline_fallback.landmark}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: typeof Compass;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{detail}</div>
    </div>
  );
}
