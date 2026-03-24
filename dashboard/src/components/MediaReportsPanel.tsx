import { useEffect, useState } from "react";
import { Camera, CircleCheck, CircleDashed, OctagonAlert, PlayCircle, ShieldAlert } from "lucide-react";
import { formatTimestamp } from "../lib/format";
import { getMediaReportAssets, reviewMediaPrivacy, reviewMediaReport } from "../services/api";
import type { MediaReport, MediaReportAssets } from "../types";

interface MediaReportsPanelProps {
  reports: MediaReport[];
  total: number;
  pending: number;
  verified: number;
  flagged: number;
  onRefresh: () => Promise<void>;
}

export function MediaReportsPanel({
  reports,
  total,
  pending,
  verified,
  flagged,
  onRefresh
}: MediaReportsPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleReview(
    reportId: string,
    decision: "verified" | "fake" | "duplicate" | "unverified",
    notes: string
  ) {
    setBusyId(reportId);
    try {
      await reviewMediaReport(reportId, decision, notes);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handlePrivacyReview(
    reportId: string,
    action: "mark_blur_required" | "mark_blur_applied" | "clear_privacy_flag",
    notes: string
  ) {
    setBusyId(reportId);
    try {
      await reviewMediaPrivacy(reportId, action, notes);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpenMedia(report: MediaReport) {
    setBusyId(report.id);
    try {
      const assets = await getMediaReportAssets(report.id);
      if (assets.available && assets.media_url) {
        window.open(assets.media_url, "_blank", "noopener,noreferrer");
      } else {
        window.alert("Stored media is not available for this report yet.");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-900">
          <Camera className="h-4 w-4 text-amber-700" />
          <h3 className="font-semibold">Ground reports</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span>{total} total</span>
          <span>{pending} pending</span>
          <span>{verified} verified</span>
          <span>{flagged} flagged</span>
        </div>
      </div>

      {!reports.length ? (
        <p className="mt-3 text-sm text-slate-600">No recent ground reports for this zone.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {reports.map((report) => {
            const moderationWarning = getModerationWarning(report.ai_flags);

            return (
              <div key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      {report.file_name}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {report.media_type.toUpperCase()} - {formatTimestamp(report.server_received_at)}
                    </div>
                  </div>
                  <StatusBadge status={report.verification_status} />
                </div>

                <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                  <div className="space-y-2">
                    <div>{report.description || "No citizen description provided."}</div>
                    {report.review_notes ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Review note: {report.review_notes}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <div>
                      {report.lat.toFixed(4)}, {report.lon.toFixed(4)}
                    </div>
                    <div>Score: {report.verification_score ?? "n/a"}</div>
                    <div>
                      Risk boost:{" "}
                      {report.risk_boost_applied ? report.risk_boost_amount.toFixed(2) : "not applied"}
                    </div>
                    {report.risk_boost_expires_at ? (
                      <div>Boost active until: {formatTimestamp(report.risk_boost_expires_at)}</div>
                    ) : null}
                    <div>Reporter: {maskReporterHash(report.uploaded_by_phone_hash)}</div>
                    {report.reviewed_at ? (
                      <div>Reviewed: {formatTimestamp(report.reviewed_at)}</div>
                    ) : null}
                    <div>Storage: {describeStorage(report)}</div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">Privacy preview</div>
                    <PrivacyBadge status={report.privacy_status ?? getDefaultPrivacyStatus(report)} />
                  </div>
                  <div
                    className={`mt-3 rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#cbd5e1,#e2e8f0,#f8fafc)] px-4 py-6 text-slate-800 transition ${
                      shouldBlurPreview(report) ? "select-none blur-[6px]" : ""
                    }`}
                  >
                    <SecureMediaPreview report={report} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() =>
                        void handlePrivacyReview(
                          report.id,
                          "mark_blur_required",
                          "Face blur required before broader sharing."
                        )
                      }
                      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"
                    >
                      Require blur
                    </button>
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() =>
                        void handlePrivacyReview(
                          report.id,
                          "mark_blur_applied",
                          "Face blur applied by dashboard operator."
                        )
                      }
                      className="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900"
                    >
                      Mark blur applied
                    </button>
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() =>
                        void handlePrivacyReview(
                          report.id,
                          "clear_privacy_flag",
                          "Privacy flag cleared by dashboard operator."
                        )
                      }
                      className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Clear privacy flag
                    </button>
                    <button
                      type="button"
                      disabled={busyId === report.id || !hasStoredMedia(report)}
                      onClick={() => void handleOpenMedia(report)}
                      className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      Open secure media
                    </button>
                  </div>
                </div>

                {report.verification_breakdown ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        Verification breakdown
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Total {Math.round(report.verification_breakdown.total_score * 100)}%
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {report.verification_breakdown.summary}
                    </p>
                    <div className="mt-3 space-y-3">
                      {report.verification_breakdown.components.map((component) => (
                        <div key={component.key} className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            <span>{component.label}</span>
                            <span>{Math.round(component.score * 100)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-emerald-500"
                              style={{ width: `${Math.max(6, Math.round(component.score * 100))}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-600">{component.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {report.ai_labels.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.ai_labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-900"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}

                {report.ai_flags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.ai_flags.map((flag) => (
                      <span
                        key={flag}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-950"
                      >
                        {flag.split("_").join(" ")}
                      </span>
                    ))}
                  </div>
                ) : null}

                {moderationWarning ? (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{moderationWarning}</span>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === report.id}
                    onClick={() =>
                      void handleReview(report.id, "verified", "Verified by dashboard operator.")
                    }
                    className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    disabled={busyId === report.id}
                    onClick={() =>
                      void handleReview(report.id, "fake", "Flagged as not reliable.")
                    }
                    className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900"
                  >
                    Flag fake
                  </button>
                  <button
                    type="button"
                    disabled={busyId === report.id}
                    onClick={() =>
                      void handleReview(report.id, "duplicate", "Looks like a duplicate submission.")
                    }
                    className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Mark duplicate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: MediaReport["verification_status"] }) {
  const badge =
    status === "verified"
      ? {
          icon: CircleCheck,
          className: "border-emerald-300 bg-emerald-50 text-emerald-900"
        }
      : status === "pending"
        ? {
            icon: CircleDashed,
            className: "border-amber-300 bg-amber-50 text-amber-900"
          }
        : {
            icon: OctagonAlert,
            className: "border-rose-300 bg-rose-50 text-rose-900"
          };

  const Icon = badge.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function PrivacyBadge({ status }: { status: NonNullable<MediaReport["privacy_status"]> }) {
  const copy =
    status === "blur_applied"
      ? {
          label: "Blur applied",
          className: "border-sky-300 bg-sky-50 text-sky-900"
        }
      : status === "blur_required"
        ? {
            label: "Blur required",
            className: "border-amber-300 bg-amber-50 text-amber-950"
          }
        : status === "blur_recommended"
          ? {
              label: "Blur recommended",
              className: "border-rose-300 bg-rose-50 text-rose-900"
            }
          : {
              label: "Privacy clear",
              className: "border-emerald-300 bg-emerald-50 text-emerald-900"
            };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${copy.className}`}>
      {copy.label}
    </span>
  );
}

function maskReporterHash(value?: string) {
  if (!value) {
    return "not available";
  }

  if (value.length <= 10) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getModerationWarning(flags: string[]) {
  if (flags.includes("contact_info_in_description")) {
    return "Description includes contact details. Review before broader sharing.";
  }

  if (flags.includes("face_blur_recommended")) {
    return "Possible people or faces mentioned. Privacy review is recommended before reuse.";
  }

  if (flags.includes("abusive_language")) {
    return "Description contains abusive or spam-like wording and should be checked manually.";
  }

  if (flags.includes("stale_capture_timestamp") || flags.includes("future_device_timestamp")) {
    return "Capture time looks unreliable. Treat this report as manual-review only.";
  }

  return "";
}

function getDefaultPrivacyStatus(report: MediaReport): NonNullable<MediaReport["privacy_status"]> {
  if (report.face_blur_applied) {
    return "blur_applied";
  }

  if (report.ai_flags.includes("face_blur_recommended")) {
    return "blur_recommended";
  }

  return "clear";
}

function shouldBlurPreview(report: MediaReport) {
  const status = report.privacy_status ?? getDefaultPrivacyStatus(report);
  return status === "blur_required" || status === "blur_applied";
}

function hasStoredMedia(report: MediaReport) {
  return Boolean(report.storage_provider && report.storage_object_path);
}

function describeStorage(report: MediaReport) {
  if (report.storage_provider === "supabase") {
    return "Supabase signed access";
  }

  if (report.storage_provider === "runtime_local") {
    return "Local runtime storage";
  }

  return "metadata only";
}

function SecureMediaPreview({ report }: { report: MediaReport }) {
  const [assets, setAssets] = useState<MediaReportAssets | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!hasStoredMedia(report)) {
      setAssets(null);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    void getMediaReportAssets(report.id)
      .then((nextAssets) => {
        if (isActive) {
          setAssets(nextAssets);
        }
      })
      .catch(() => {
        if (isActive) {
          setAssets(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [report.id, report.storage_object_path, report.storage_provider]);

  if (report.media_type === "photo" && assets?.thumbnail_url) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Secure photo thumbnail
        </div>
        <img
          src={assets.thumbnail_url}
          alt={report.file_name}
          className="h-48 w-full rounded-xl border border-slate-200 object-cover"
          loading="lazy"
        />
        <div className="text-sm">
          {report.description || "No citizen description provided."}
        </div>
      </div>
    );
  }

  if (report.media_type === "video" && hasStoredMedia(report)) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Secure video evidence
        </div>
        <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-900/90 text-white">
          <div className="flex flex-col items-center gap-2 text-center">
            <PlayCircle className="h-10 w-10" />
            <div className="text-sm font-semibold">{report.file_name}</div>
            <div className="text-xs text-slate-300">
              {loading ? "Loading signed link..." : "Use Open secure media to review the clip."}
            </div>
          </div>
        </div>
        <div className="text-sm">
          {report.description || "No citizen description provided."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {report.media_type} preview foundation
      </div>
      <div className="text-base font-semibold">{report.file_name}</div>
      <div className="text-sm">
        {loading ? "Loading secure preview..." : report.description || "No citizen description provided."}
      </div>
    </div>
  );
}
