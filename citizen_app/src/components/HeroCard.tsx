import { AlertTriangle, CloudRain, MapPinned } from "lucide-react";
import { formatLocalizedTimestamp, getCitizenDictionary, getRiskDisplayLabel } from "../lib/i18n";
import { riskTheme } from "../lib/risk";
import type { CitizenZoneRisk, LanguageCode, LiveWeather } from "../types";

interface HeroCardProps {
  zone: CitizenZoneRisk;
  weather: LiveWeather | null;
  language: LanguageCode;
}

export function HeroCard({ zone, weather, language }: HeroCardProps) {
  const theme = riskTheme[zone.risk_level];
  const copy = getCitizenDictionary(language);

  return (
    <section
      className={`rounded-[30px] border border-white/70 bg-gradient-to-br ${theme.card} bg-white/85 p-5 shadow-[0_24px_60px_rgba(32,22,17,0.12)] backdrop-blur`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
            {copy.yourCurrentZone}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{zone.zone_name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <MapPinned className="h-4 w-4" />
            {copy.subtitleFormat(zone.district_name)}
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${theme.badge}`}>
          {getRiskDisplayLabel(zone.risk_level, language)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric icon={AlertTriangle} label={copy.riskScore} value={String(zone.risk_score)} />
        <Metric
          icon={CloudRain}
          label={copy.rainfall}
          value={`${weather?.rainfall_mm_hr ?? zone.rainfall_mm_hr} mm/hr`}
          detail={formatWeatherSource(weather)}
        />
        <Metric
          label={copy.lastUpdated}
          value={formatLocalizedTimestamp(weather?.observed_at ?? zone.updated_at, language)}
          detail={weather?.is_stale ? "Fallback feed" : "Live feed"}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-white/70 bg-white/70 p-4">
        <div className="text-sm font-semibold text-slate-900">{copy.riskTitle[zone.risk_level]}</div>
        <p className="mt-2 text-sm leading-6 text-slate-700">{copy.warningText[zone.risk_level]}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{copy.actionText[zone.risk_level]}</p>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon?: typeof AlertTriangle;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}
    </div>
  );
}

function formatWeatherSource(weather: LiveWeather | null) {
  if (!weather) {
    return "Weather feed unavailable";
  }

  return weather.source.replace(/-/g, " ");
}
