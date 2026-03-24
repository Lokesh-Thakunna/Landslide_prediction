import { PhoneCall } from "lucide-react";
import { getCitizenDictionary } from "../lib/i18n";
import type { EmergencyContact, LanguageCode } from "../types";

interface EmergencyContactsCardProps {
  contacts: EmergencyContact[];
  language: LanguageCode;
}

export function EmergencyContactsCard({ contacts, language }: EmergencyContactsCardProps) {
  const copy = getCitizenDictionary(language);

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <div className="flex items-center gap-2">
        <PhoneCall className="h-5 w-5 text-rose-700" />
        <h2 className="text-lg font-semibold text-slate-900">{copy.emergencyContacts}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="font-semibold text-slate-900">{contact.label}</div>
            <div className="mt-1 text-sm text-slate-700">{contact.phone}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
              {contact.availability}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
