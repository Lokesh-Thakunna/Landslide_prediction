import type { District, RiskLevel } from "../types";
import {
  getDashboardDictionary,
  getDashboardRiskLabel,
  type DashboardLanguage
} from "../lib/i18n";

interface FilterBarProps {
  language: DashboardLanguage;
  districts: District[];
  districtFilter: string;
  setDistrictFilter: (value: string) => void;
  riskFilter: RiskLevel | "ALL";
  setRiskFilter: (value: RiskLevel | "ALL") => void;
}

const riskOptions: Array<RiskLevel | "ALL"> = ["ALL", "SAFE", "WATCH", "DANGER"];

export function FilterBar({
  language,
  districts,
  districtFilter,
  setDistrictFilter,
  riskFilter,
  setRiskFilter,
}: FilterBarProps) {
  const copy = getDashboardDictionary(language);

  return (
    <section className="rounded-[22px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_16px_40px_rgba(17,32,22,0.07)] backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {copy.filters}
          </p>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {copy.filtersSubtitle}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            {copy.district}
            <select
              value={districtFilter}
              onChange={(event) => setDistrictFilter(event.target.value)}
              className="min-w-[180px] rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              <option value="ALL">{copy.allDistricts}</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            {copy.riskLevel}
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value as RiskLevel | "ALL")}
              className="min-w-[160px] rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              {riskOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? copy.allLevels : getDashboardRiskLabel(language, option)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
