import { Flame, TrendingUp } from "lucide-react";
import {
  getDashboardDictionary,
  getDashboardRiskLabel,
  type DashboardLanguage
} from "../lib/i18n";
import { riskTone } from "../lib/risk";
import type { Hotspot, ZoneRisk } from "../types";

interface HotspotPanelProps {
  language: DashboardLanguage;
  hotspots: Hotspot[];
  zones: ZoneRisk[];
  onSelectZone: (zoneId: string) => void;
}

export function HotspotPanel({
  language,
  hotspots,
  zones,
  onSelectZone
}: HotspotPanelProps) {
  const copy = getDashboardDictionary(language);

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_60px_rgba(17,32,22,0.08)] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{copy.hotspotWatchlist}</h2>
          <p className="text-sm text-slate-600">
            {copy.hotspotSubtitle}
          </p>
        </div>
        <Flame className="h-5 w-5 text-amber-600" />
      </div>

      <div className="mt-4 space-y-3">
        {hotspots.map((hotspot) => {
          const zone = zones.find((item) => item.zone_id === hotspot.zone_id);
          if (!zone) {
            return null;
          }

          return (
            <button
              key={hotspot.zone_id}
              type="button"
              onClick={() => onSelectZone(hotspot.zone_id)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{zone.zone_name}</div>
                  <div className="mt-1 text-sm text-slate-500">{zone.district_name}</div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone(hotspot.risk_level)}`}
                >
                  {getDashboardRiskLabel(language, hotspot.risk_level)}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-700">
                <span>{copy.scoreLabel} {hotspot.risk_score}</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-emerald-700" />
                  {copy.trendLabel[hotspot.trend]}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {copy.nextHorizonStatus}:{" "}
                {hotspot.next_horizon_level
                  ? getDashboardRiskLabel(language, hotspot.next_horizon_level)
                  : "--"}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
