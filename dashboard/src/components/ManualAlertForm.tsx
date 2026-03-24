import { useEffect, useState } from "react";
import { Siren } from "lucide-react";
import {
  dashboardLanguageOptions,
  getDashboardDictionary,
  type DashboardLanguage
} from "../lib/i18n";
import { triggerManualAlert } from "../services/api";
import type { AlertLog, AlertPreview, ManualAlertPayload, ZoneRisk } from "../types";

interface ManualAlertFormProps {
  language: DashboardLanguage;
  zones: ZoneRisk[];
  selectedZoneId: string | null;
  onAlertTriggered: (alerts: AlertLog[]) => void;
  getLatestAlerts: () => Promise<AlertLog[]>;
  getAlertPreview: (
    zoneId: string,
    options?: {
      recipientPhoneNumber?: string;
      recipientAlertLanguage?: AlertPreview["localized_messages"][number]["language"];
    }
  ) => Promise<AlertPreview>;
}

export function ManualAlertForm({
  language,
  zones,
  selectedZoneId,
  onAlertTriggered,
  getLatestAlerts,
  getAlertPreview,
}: ManualAlertFormProps) {
  const copy = getDashboardDictionary(language);
  const [zoneId, setZoneId] = useState(selectedZoneId ?? zones[0]?.zone_id ?? "");
  const [reason, setReason] = useState("Field verification confirms slope distress.");
  const [channels, setChannels] = useState<Array<"SMS" | "WHATSAPP">>(["SMS", "WHATSAPP"]);
  const [recipientPhoneNumber, setRecipientPhoneNumber] = useState("");
  const [recipientAlertLanguage, setRecipientAlertLanguage] = useState<AlertPreview["localized_messages"][number]["language"]>("hi");
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<AlertPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedZoneId) {
      setZoneId(selectedZoneId);
    }
  }, [selectedZoneId]);

  useEffect(() => {
    if (!zoneId) {
      setPreview(null);
      return;
    }

    let isActive = true;

    async function loadPreview() {
      try {
        setPreviewError(null);
        const nextPreview = await getAlertPreview(zoneId, {
          recipientPhoneNumber: recipientPhoneNumber.trim() || undefined,
          recipientAlertLanguage: recipientPhoneNumber.trim()
            ? recipientAlertLanguage
            : undefined
        });
        if (isActive) {
          setPreview(nextPreview);
        }
      } catch (error) {
        if (isActive) {
          setPreview(null);
          setPreviewError(error instanceof Error ? error.message : copy.loadPreviewFailed);
        }
      }
    }

    void loadPreview();

    return () => {
      isActive = false;
    };
  }, [getAlertPreview, recipientAlertLanguage, recipientPhoneNumber, zoneId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: ManualAlertPayload = {
      zone_id: zoneId,
      reason,
      channels,
      recipient_phone_number: recipientPhoneNumber.trim() || undefined,
      recipient_alert_language: recipientPhoneNumber.trim()
        ? recipientAlertLanguage
        : undefined
    };

    const result = await triggerManualAlert(payload);
    const alerts = await getLatestAlerts();
    onAlertTriggered(alerts);
    setStatus(
      copy.alertQueued(
        result.alert_id,
        result.queued_channels,
        result.delivery_status,
        result.recipient_count
      )
    );
  }

  function toggleChannel(channel: "SMS" | "WHATSAPP") {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  const hasSmsLengthFailure =
    channels.includes("SMS") &&
    (preview?.localized_messages ?? []).some(
      (message) => !isSmsWithinLimit(message)
    );

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_60px_rgba(17,32,22,0.08)] backdrop-blur">
      <div className="flex items-center gap-2">
        <Siren className="h-5 w-5 text-rose-700" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{copy.manualAlertTitle}</h2>
          <p className="text-sm text-slate-600">
            {copy.manualAlertSubtitle}
          </p>
        </div>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          {copy.zone}
          <select
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2"
          >
            {zones.map((zone) => (
              <option key={zone.zone_id} value={zone.zone_id}>
                {zone.zone_name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          {copy.reason}
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-28 rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
        </label>

        <div>
          <div className="text-sm text-slate-700">{copy.channels}</div>
          <div className="mt-2 flex gap-3">
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

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          {copy.testRecipient}
          <input
            value={recipientPhoneNumber}
            onChange={(event) => setRecipientPhoneNumber(event.target.value)}
            placeholder="+91XXXXXXXXXX"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
          <span className="text-xs text-slate-500">{copy.testRecipientHint}</span>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          {copy.testRecipientLanguage}
          <select
            value={recipientAlertLanguage}
            onChange={(event) =>
              setRecipientAlertLanguage(
                event.target.value as AlertPreview["localized_messages"][number]["language"]
              )
            }
            disabled={!recipientPhoneNumber.trim()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
          >
            {dashboardLanguageOptions.map((option) => {
              const alertLanguage =
                option.code === "hi"
                  ? "hi"
                  : option.code === "en"
                    ? "en"
                    : "hi";

              return (
                <option key={option.code} value={alertLanguage}>
                  {option.nativeLabel}
                </option>
              );
            })}
            <option value="hi-x-garhwali">Garhwali</option>
            <option value="hi-x-kumaoni">Kumaoni</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={hasSmsLengthFailure}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {copy.queueManualAlert}
        </button>

        {hasSmsLengthFailure ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {copy.smsBlocked}
          </p>
        ) : null}

        {status ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {status}
          </p>
        ) : null}
      </form>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {copy.multilingualPreview}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {copy.multilingualPreviewSubtitle}
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700">
            {preview?.total_subscribers ?? 0} {copy.subscribers}
          </div>
        </div>

        {previewError ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {previewError}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3">
          {preview?.localized_messages.map((message) => (
            <div key={message.language} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-slate-900">
                  {message.language_label}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span>{message.subscriber_count} subscribers</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      isSmsWithinLimit(message)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-rose-300 bg-rose-50 text-rose-900"
                    }`}
                  >
                    SMS {getSmsCount(message)}/{getSmsLimit(message)}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {channels.includes("SMS") ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      SMS
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{message.sms_body}</p>
                    <div
                      className={`mt-3 text-xs font-semibold ${
                        isSmsWithinLimit(message) ? "text-emerald-800" : "text-rose-800"
                      }`}
                    >
                      {isSmsWithinLimit(message)
                        ? copy.withinSmsLimit
                        : copy.exceedsSmsLimit}
                    </div>
                  </div>
                ) : null}
                {channels.includes("WHATSAPP") ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      WhatsApp
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {message.whatsapp_body}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {preview?.notes.length ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            {copy.notesPrefix}: {preview.notes.join(" ")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getSmsCount(message: AlertPreview["localized_messages"][number]) {
  return message.sms_character_count ?? Array.from(message.sms_body).length;
}

function getSmsLimit(message: AlertPreview["localized_messages"][number]) {
  return message.sms_character_limit ?? 160;
}

function isSmsWithinLimit(message: AlertPreview["localized_messages"][number]) {
  return message.sms_within_limit ?? getSmsCount(message) <= getSmsLimit(message);
}
