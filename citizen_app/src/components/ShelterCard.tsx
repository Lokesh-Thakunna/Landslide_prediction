import { House, Phone } from "lucide-react";
import { getCitizenDictionary } from "../lib/i18n";
import type { LanguageCode, Shelter } from "../types";

interface ShelterCardProps {
  shelter: Shelter | null;
  language: LanguageCode;
}

export function ShelterCard({ shelter, language }: ShelterCardProps) {
  const copy = getCitizenDictionary(language);

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <div className="flex items-center gap-2">
        <House className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold text-slate-900">{copy.nearbyShelter}</h2>
      </div>

      {shelter ? (
        <div className="mt-4 space-y-3">
          <div className="text-xl font-semibold text-slate-950">{shelter.name}</div>
          <div className="text-sm text-slate-600">
            {copy.distance}: {copy.distanceFormat(shelter.distance_km)}
          </div>
          <div className="text-sm text-slate-600">
            {copy.capacity}: {shelter.capacity}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Phone className="h-4 w-4" />
            {shelter.contact_number}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">{copy.shelterUnavailable}</p>
      )}
    </section>
  );
}
