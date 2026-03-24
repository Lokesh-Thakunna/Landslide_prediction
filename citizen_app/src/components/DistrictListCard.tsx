import type { District } from "../types";

interface DistrictListCardProps {
  districts: District[];
  selectedDistrictId: string | null;
  onSelect: (districtId: string) => void;
  title: string;
  subtitle: string;
  countLabel: (count: number) => string;
}

export function DistrictListCard({
  districts,
  selectedDistrictId,
  onSelect,
  title,
  subtitle,
  countLabel
}: DistrictListCardProps) {
  if (!districts.length) {
    return null;
  }

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {districts.map((district) => {
          const selected = district.id === selectedDistrictId;

          return (
            <button
              key={district.id}
              type="button"
              onClick={() => onSelect(district.id)}
              className={`rounded-full border px-4 py-2 text-left transition ${
                selected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <div className="text-sm font-semibold">{district.name}</div>
              <div className={`text-xs ${selected ? "text-slate-200" : "text-slate-500"}`}>
                {countLabel(district.zone_count)}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
