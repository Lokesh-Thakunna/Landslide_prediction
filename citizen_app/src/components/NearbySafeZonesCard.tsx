import { Mountain, ShieldCheck } from "lucide-react";
import { getCitizenDictionary } from "../lib/i18n";
import type { LanguageCode, NearbySafeZone } from "../types";

interface NearbySafeZonesCardProps {
  language: LanguageCode;
  safeZones: NearbySafeZone[];
}

export function NearbySafeZonesCard({ language, safeZones }: NearbySafeZonesCardProps) {
  const copy = getCitizenDictionary(language);

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold text-slate-900">{copy.nearbySafeZones}</h2>
      </div>

      {!safeZones.length ? (
        <p className="mt-4 text-sm text-slate-600">{copy.noNearbySafeZones}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {safeZones.map((safeZone) => (
            <div
              key={safeZone.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950">{safeZone.name}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {safeZone.distance_km} km · {safeZone.walk_time_min} min · {safeZone.capacity}
                  </div>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {safeZone.bearing_degrees}°
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <Mountain className="h-4 w-4 text-slate-500" />
                {safeZone.is_uphill_from_user ? copy.uphillLabel : copy.downhillLabel} ·{" "}
                {safeZone.elevation_m} m
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{safeZone.route_summary}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
