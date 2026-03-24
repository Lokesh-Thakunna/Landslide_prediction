import { Navigation } from "lucide-react";
import { getCitizenDictionary } from "../lib/i18n";
import type {
  ComputedSafeZoneRoute,
  ElevationProfile,
  EvacuationRoute,
  LanguageCode,
  ZoneRoadConditions
} from "../types";

interface RouteCardProps {
  route: EvacuationRoute | null;
  computedRoute: ComputedSafeZoneRoute | null;
  roadConditions: ZoneRoadConditions | null;
  elevationProfile: ElevationProfile | null;
  language: LanguageCode;
}

export function RouteCard({
  route,
  computedRoute,
  roadConditions,
  elevationProfile,
  language
}: RouteCardProps) {
  const copy = getCitizenDictionary(language);
  const highlightedSegments = roadConditions?.segments
    .filter((segment) => segment.condition.status !== "open")
    .slice(0, 2) ?? [];

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <div className="flex items-center gap-2">
        <Navigation className="h-5 w-5 text-sky-700" />
        <h2 className="text-lg font-semibold text-slate-900">{copy.evacuationRoute}</h2>
      </div>

      {route ? (
        <div className="mt-4">
          <p className="text-sm leading-6 text-slate-700">{route.instruction_summary}</p>
          <div className="mt-3 flex gap-3 text-sm text-slate-600">
            <span>{copy.distanceFormat(route.distance_km)}</span>
            <span>{copy.minutesFormat(route.estimated_minutes)}</span>
          </div>
          {computedRoute ? (
            <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-950">
              <div className="font-semibold capitalize">
                Computed route - {computedRoute.route.source.replaceAll("_", " ")}
              </div>
              <div className="mt-1">
                {copy.distanceFormat(computedRoute.route.distance_km)} - {copy.minutesFormat(computedRoute.route.duration_minutes)}
              </div>
              {computedRoute.route.blocked_roads_avoided.length ? (
                <div className="mt-1">
                  Avoiding: {computedRoute.route.blocked_roads_avoided.join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
              <div className="font-semibold capitalize">
                {route.path_category ?? "primary"} path • {route.road_status ?? "open"}
              </div>
              <div className="mt-1">
                Caution: {route.caution_segment_count ?? 0} | Blocked: {route.blocked_segment_count ?? 0}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
              <div className="font-semibold capitalize">
                Valley exposure: {route.valley_exposure ?? elevationProfile?.valley_exposure ?? "low"}
              </div>
              <div className="mt-1">
                Ascent {(route.elevation_gain_m ?? elevationProfile?.total_ascent_m ?? 0)} m | Descent {(route.elevation_loss_m ?? elevationProfile?.total_descent_m ?? 0)} m
              </div>
            </div>
          </div>
          {route.route_warnings?.length ? (
            <div className="mt-4 space-y-2">
              {route.route_warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900"
                >
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
          {computedRoute?.route.warnings.length ? (
            <div className="mt-4 space-y-2">
              {computedRoute.route.warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900"
                >
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
          {highlightedSegments.length ? (
            <div className="mt-4 space-y-2">
              {highlightedSegments.map((segment) => (
                <div
                  key={segment.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
                >
                  <div className="font-semibold capitalize">
                    {segment.name} • {segment.condition.status}
                  </div>
                  <div className="mt-1">{segment.condition.note}</div>
                </div>
              ))}
            </div>
          ) : null}
          {elevationProfile ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              {elevationProfile.recommended_direction_label}
            </div>
          ) : null}
          {route.hazard_notes ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              {route.hazard_notes}
            </div>
          ) : null}
          {route.verified_by || route.verified_at ? (
            <div className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">
              Verified route
              {route.verified_by ? ` • ${route.verified_by}` : ""}
              {route.verified_at ? ` • ${new Date(route.verified_at).toLocaleString("en-IN")}` : ""}
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            {(computedRoute?.route.steps.length
              ? computedRoute.route.steps.map((step) =>
                  language === "en" ? step.instruction_en : step.instruction_hi
                )
              : route.steps
            ).map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
              >
                {copy.numberedStep(index + 1, step)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">{copy.routeUnavailable}</p>
      )}
    </section>
  );
}
