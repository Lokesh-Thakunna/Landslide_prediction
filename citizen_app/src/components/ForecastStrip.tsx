import { formatLocalizedTimestamp, getCitizenDictionary, getRiskDisplayLabel } from "../lib/i18n";
import { riskTheme } from "../lib/risk";
import type { CitizenForecast, LanguageCode, RiskLevel } from "../types";

interface ForecastStripProps {
  forecast: CitizenForecast | null;
  language: LanguageCode;
}

export function ForecastStrip({ forecast, language }: ForecastStripProps) {
  if (!forecast) {
    return null;
  }

  const copy = getCitizenDictionary(language);

  const cards = [
    {
      label: copy.nowLabel,
      score: forecast.current.risk_score,
      level: forecast.current.risk_level,
      time: forecast.current.predicted_at,
    },
    ...forecast.forecast.map((item) => ({
      label: copy.forecastLabel(item.horizon_hours),
      score: item.risk_score,
      level: item.risk_level,
      time: item.forecast_for,
    })),
  ];

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <h2 className="text-lg font-semibold text-slate-900">{copy.nextTwoHours}</h2>
      <p className="mt-1 text-sm text-slate-600">{copy.nextTwoHoursSubtitle}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <ForecastCard key={card.label} {...card} language={language} />
        ))}
      </div>
    </section>
  );
}

function ForecastCard({
  label,
  score,
  level,
  time,
  language,
}: {
  label: string;
  score: number;
  level: RiskLevel;
  time: string;
  language: LanguageCode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskTheme[level].badge}`}>
          {getRiskDisplayLabel(level, language)}
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{score}</div>
      <div className="mt-2 text-sm text-slate-500">{formatLocalizedTimestamp(time, language)}</div>
    </div>
  );
}
