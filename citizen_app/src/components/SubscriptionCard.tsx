import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { isValidInternationalPhoneNumber, normalizePhoneNumber } from "../lib/format";
import { getCitizenDictionary, getLanguageMeta } from "../lib/i18n";
import { subscribeCitizen } from "../services/api";
import type { CitizenZoneRisk, LanguageCode } from "../types";

interface SubscriptionCardProps {
  zones: CitizenZoneRisk[];
  selectedZoneId: string | null;
  appLanguage: LanguageCode;
  alertLanguage: LanguageCode;
}

export function SubscriptionCard({
  zones,
  selectedZoneId,
  appLanguage,
  alertLanguage
}: SubscriptionCardProps) {
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState(selectedZoneId ?? zones[0]?.zone_id ?? "");
  const [channels, setChannels] = useState<Array<"SMS" | "WHATSAPP">>(["SMS", "WHATSAPP"]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = getCitizenDictionary(appLanguage);

  useEffect(() => {
    setZoneId(selectedZoneId ?? zones[0]?.zone_id ?? "");
  }, [selectedZoneId, zones]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!zoneId) {
      setError(copy.selectZoneError);
      return;
    }

    if (!channels.length) {
      setError(copy.selectChannelError);
      return;
    }

    if (!isValidInternationalPhoneNumber(normalizedPhone)) {
      setError(copy.phoneError);
      return;
    }

    try {
      const result = await subscribeCitizen({
        phone_number: normalizedPhone,
        zone_id: zoneId,
        channels,
        app_language: appLanguage,
        alert_language: alertLanguage,
      });
      setStatus(copy.subscriptionStatusFormat(result.subscription_status));
      setPhone("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : copy.saveFailed
      );
    }
  }

  function toggleChannel(channel: "SMS" | "WHATSAPP") {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <div className="flex items-center gap-2">
        <BellRing className="h-5 w-5 text-amber-700" />
        <h2 className="text-lg font-semibold text-slate-900">{copy.alertSubscription}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {copy.alertSubscriptionSubtitle}
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          {copy.phoneNumber}
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+91XXXXXXXXXX"
            required
            inputMode="tel"
            autoComplete="tel"
            className="rounded-xl border border-slate-300 bg-white px-3 py-3"
          />
          <span className="text-xs text-slate-500">{copy.phoneHint}</span>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          {copy.zone}
          <select
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
            required
            className="rounded-xl border border-slate-300 bg-white px-3 py-3"
          >
            {zones.map((zone) => (
              <option key={zone.zone_id} value={zone.zone_id}>
                {zone.zone_name}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div>
            {copy.appLanguage}: {getLanguageMeta(appLanguage).nativeLabel}
          </div>
          <div className="mt-1">
            {copy.alertLanguage}: {getLanguageMeta(alertLanguage).nativeLabel}
          </div>
        </div>

        <div>
          <div className="text-sm text-slate-700">{copy.channels}</div>
          <div className="mt-2 flex flex-wrap gap-3">
            {(["SMS", "WHATSAPP"] as const).map((channel) => (
              <label
                key={channel}
                className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={channels.includes(channel)}
                  onChange={() => toggleChannel(channel)}
                />
                {channel}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!phone.trim() || !zoneId || !channels.length}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          {copy.subscribe}
        </button>

        {status ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {status}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
