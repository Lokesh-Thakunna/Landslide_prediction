import { getCitizenDictionary } from "../lib/i18n";
import type { LanguageCode } from "../types";

interface InstallPromptProps {
  language: LanguageCode;
}

export function InstallPrompt({ language }: InstallPromptProps) {
  const copy = getCitizenDictionary(language);

  return (
    <section className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-4">
      <div className="text-sm font-semibold text-slate-900">{copy.offlineShellTitle}</div>
      <p className="mt-1 text-sm text-slate-600">{copy.offlineShellBody}</p>
    </section>
  );
}
