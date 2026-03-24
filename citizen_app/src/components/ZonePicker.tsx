import type { CitizenZoneRisk } from "../types";

interface ZonePickerProps {
  zones: CitizenZoneRisk[];
  selectedZoneId: string | null;
  onChange: (zoneId: string) => void;
  currentAreaLabel: string;
  noZonesText: string;
}

export function ZonePicker({
  zones,
  selectedZoneId,
  onChange,
  currentAreaLabel,
  noZonesText
}: ZonePickerProps) {
  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <label className="flex flex-col gap-2 text-sm text-slate-700">
        {currentAreaLabel}
        <select
          value={selectedZoneId ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={!zones.length}
          className="rounded-xl border border-slate-300 bg-white px-3 py-3"
        >
          {!zones.length ? <option value="">{noZonesText}</option> : null}
          {zones.map((zone) => (
            <option key={zone.zone_id} value={zone.zone_id}>
              {zone.zone_name} - {zone.district_name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
