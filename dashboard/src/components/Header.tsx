import { BellRing, CloudRain, RadioTower, ShieldAlert } from "lucide-react";
import {
  dashboardLanguageOptions,
  getDashboardDictionary,
  type DashboardLanguage
} from "../lib/i18n";

interface HeaderProps {
  language: DashboardLanguage;
  onLanguageChange: (language: DashboardLanguage) => void;
  zoneCount: number;
  hotspotCount: number;
  alertCount: number;
}

export function Header({
  language,
  onLanguageChange,
  zoneCount,
  hotspotCount,
  alertCount
}: HeaderProps) {
  const copy = getDashboardDictionary(language);
  const cards = [
    {
      label: copy.monitoredZones,
      value: zoneCount,
      icon: ShieldAlert,
    },
    {
      label: copy.activeHotspots,
      value: hotspotCount,
      icon: RadioTower,
    },
    {
      label: copy.dispatchesToday,
      value: alertCount,
      icon: BellRing,
    },
    {
      label: copy.rainfallOverlay,
      value: copy.live,
      icon: CloudRain,
    },
  ];

  return (
    <header className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_60px_rgba(17,32,22,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-800">
            {copy.headerEyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            {copy.headerTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {copy.headerSubtitle}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="ml-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2">
            <span className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {copy.language}
            </span>
            {dashboardLanguageOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => onLanguageChange(option.code)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  language === option.code ? "bg-slate-900 text-white" : "text-slate-600"
                }`}
              >
                {option.nativeLabel}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="min-w-[160px] rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {label}
                </span>
                <Icon className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </header>
  );
}
