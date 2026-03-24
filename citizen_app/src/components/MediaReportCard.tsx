import { useEffect, useRef, useState } from "react";
import { Camera, Images, ShieldAlert, Upload, Video, X } from "lucide-react";
import { getCitizenDictionary } from "../lib/i18n";
import { deleteMediaReport, getMediaReportStatus, uploadMediaReport } from "../services/api";
import type { LanguageCode, LocationStatus, MediaReportStatus } from "../types";

const REPORTER_TOKEN_STORAGE_KEY = "hhlews-media-reporter-token";

interface MediaReportCardProps {
  language: LanguageCode;
  locationStatus: LocationStatus | null;
  locating: boolean;
}

type CaptureIntent = "camera" | "gallery";

type MediaFlowCopy = {
  guidanceTitle: string;
  guidanceBody: string;
  cameraAction: string;
  galleryAction: string;
  selectedMedia: string;
  noMediaSelected: string;
  sourceCamera: string;
  sourceGallery: string;
  confirmationTitle: string;
  confirmationHint: string;
  attachedLocation: string;
  zoneLabel: string;
  freshnessRecent: string;
  freshnessOlder: string;
  clearSelection: string;
  deleteAction: string;
  deleteConfirm: string;
  deleteSuccess: string;
};

const mediaFlowCopy: Record<LanguageCode, MediaFlowCopy> = {
  hi: {
    guidanceTitle: "अपलोड मार्गदर्शन",
    guidanceBody:
      "ताज़ा कैमरा फ़ोटो या छोटा वीडियो भेजें। लोकेशन अपने आप जुड़ जाएगी और हर डिवाइस से एक घंटे में 3 रिपोर्ट की सीमा रहेगी।",
    cameraAction: "कैमरा खोलें",
    galleryAction: "गैलरी से चुनें",
    selectedMedia: "चुना हुआ मीडिया",
    noMediaSelected: "अभी कोई मीडिया नहीं चुना गया है।",
    sourceCamera: "कैमरा कैप्चर",
    sourceGallery: "गैलरी चयन",
    confirmationTitle: "भेजने से पहले पुष्टि करें",
    confirmationHint: "यह फ़ाइल, आपकी मौजूदा लोकेशन और चुनी हुई भाषा के साथ अधिकारियों तक जाएगी।",
    attachedLocation: "लोकेशन जुड़ गई",
    zoneLabel: "क्षेत्र",
    freshnessRecent: "हाल की कैप्चर",
    freshnessOlder: "पुरानी फ़ाइल, फिर भी भेजी जा सकती है",
    clearSelection: "चयन हटाएँ",
    deleteAction: "यह रिपोर्ट हटाएँ",
    deleteConfirm: "क्या आप यह मीडिया रिपोर्ट हटाना चाहते हैं?",
    deleteSuccess: "रिपोर्ट हटा दी गई है।"
  },
  en: {
    guidanceTitle: "Upload guidance",
    guidanceBody:
      "Use a fresh camera photo or short video when possible. Your location is attached automatically, and each device is limited to 3 uploads per hour.",
    cameraAction: "Open camera",
    galleryAction: "Choose from gallery",
    selectedMedia: "Selected media",
    noMediaSelected: "No media has been selected yet.",
    sourceCamera: "Camera capture",
    sourceGallery: "Gallery selection",
    confirmationTitle: "Confirm before sending",
    confirmationHint: "This file will be sent with your current location and selected language for official review.",
    attachedLocation: "Location attached",
    zoneLabel: "Zone",
    freshnessRecent: "Recent capture",
    freshnessOlder: "Older file, still allowed",
    clearSelection: "Clear selection",
    deleteAction: "Delete this report",
    deleteConfirm: "Do you want to delete this media report?",
    deleteSuccess: "The report has been deleted."
  },
  "hi-x-garhwali": {
    guidanceTitle: "अपलोड बतौण",
    guidanceBody:
      "जित हो सकै त ताजा कैमरा फोटो या छोटो वीडियो भेजो। लोकेशन आपै जुड़लि और एक डिवाइस तैं एक घंटा में 3 रिपोर्ट तक सीमा छै।",
    cameraAction: "कैमरा खोलो",
    galleryAction: "गैलरी तैं चुनो",
    selectedMedia: "चुन्यो मीडिया",
    noMediaSelected: "अभी कोई मीडिया नि चुन्यो।",
    sourceCamera: "कैमरा कैप्चर",
    sourceGallery: "गैलरी चयन",
    confirmationTitle: "भेजण तै पहलि पक्का करौ",
    confirmationHint: "यो फाइल, तुमरी मौजूदा लोकेशन अर चुनी भाषा सँग अफसरन तक जैलि।",
    attachedLocation: "लोकेशन जुड़गी",
    zoneLabel: "क्षेत्र",
    freshnessRecent: "ताजा कैप्चर",
    freshnessOlder: "पुराणी फाइल, फेर भी भेजी सकदी",
    clearSelection: "चयन हटौ",
    deleteAction: "यो रिपोर्ट हटौ",
    deleteConfirm: "क्या तूं यो मीडिया रिपोर्ट हटौण चाहंदो?",
    deleteSuccess: "रिपोर्ट हटगी।"
  },
  "hi-x-kumaoni": {
    guidanceTitle: "अपलोड बतौण",
    guidanceBody:
      "जित हो सक छ त ताजो कैमरा फोटो या छोटो वीडियो भेजो। लोकेशन आपै जुड़ल और एक डिवाइस तैं एक घंटा में 3 रिपोर्ट तक सीमा रहैल।",
    cameraAction: "कैमरा खोलो",
    galleryAction: "गैलरी तैं चुनो",
    selectedMedia: "चुन्यो मीडिया",
    noMediaSelected: "अभी कोनो मीडिया नै चुनो गै।",
    sourceCamera: "कैमरा कैप्चर",
    sourceGallery: "गैलरी चयन",
    confirmationTitle: "भेजण स पहल पुष्टि करो",
    confirmationHint: "यो फाइल, तुमरी हाल की लोकेशन अर चुनी भाषा सँग अफसरन तक जैल।",
    attachedLocation: "लोकेशन जुड़ गई",
    zoneLabel: "क्षेत्र",
    freshnessRecent: "ताजो कैप्चर",
    freshnessOlder: "पुराणी फाइल, फेर भी भेजी सकछ",
    clearSelection: "चयन हटाओ",
    deleteAction: "यो रिपोर्ट हटाओ",
    deleteConfirm: "क्या तुम यो मीडिया रिपोर्ट हटौण चाहो?",
    deleteSuccess: "रिपोर्ट हट गै।"
  }
};

export function MediaReportCard({
  language,
  locationStatus,
  locating
}: MediaReportCardProps) {
  const copy = getCitizenDictionary(language);
  const flowCopy = mediaFlowCopy[language];
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<MediaReportStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reporterToken] = useState(() => getOrCreateReporterToken());
  const [captureIntent, setCaptureIntent] = useState<CaptureIntent>("camera");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!cameraOpen) {
      stopCameraStream(cameraStreamRef);
      return;
    }

    if (!supportsLiveCamera()) {
      setCameraOpen(false);
      cameraInputRef.current?.click();
      return;
    }

    let cancelled = false;

    async function openCamera() {
      setCameraStarting(true);
      setCameraError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          await videoPreviewRef.current.play().catch(() => undefined);
        }
      } catch {
        if (!cancelled) {
          setCameraError("Camera access is not available in this browser. Using file picker instead.");
          setCameraOpen(false);
          cameraInputRef.current?.click();
        }
      } finally {
        if (!cancelled) {
          setCameraStarting(false);
        }
      }
    }

    void openCamera();

    return () => {
      cancelled = true;
      stopCameraStream(cameraStreamRef);
    };
  }, [cameraOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setActionMessage(null);

    if (!locationStatus) {
      setError(copy.reportNeedLocation);
      return;
    }

    if (!file) {
      setError(copy.reportFileLabel);
      return;
    }

    setSubmitting(true);

    try {
      const upload = await uploadMediaReport({
        file,
        lat: locationStatus.user_location.lat,
        lon: locationStatus.user_location.lon,
        language,
        description,
        phone_hash: reporterToken,
        device_timestamp: new Date().toISOString()
      });
      const nextStatus = await getMediaReportStatus(upload.report_id);
      setStatus(nextStatus);
      clearSelection();
      setDescription("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteReport() {
    if (!status?.report_id) {
      return;
    }

    const shouldDelete =
      typeof window === "undefined" ? true : window.confirm(flowCopy.deleteConfirm);

    if (!shouldDelete) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setActionMessage(null);

    try {
      await deleteMediaReport(status.report_id, reporterToken);
      setStatus(null);
      setActionMessage(flowCopy.deleteSuccess);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError(null);
  }

  function clearSelection() {
    setFile(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
  }

  async function handleCaptureFromCamera() {
    const video = videoPreviewRef.current;
    const canvas = captureCanvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Camera capture is unavailable right now.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Captured frame could not be saved.");
      return;
    }

    const capturedFile = new File([blob], `camera-capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now()
    });

    setCaptureIntent("camera");
    setFile(capturedFile);
    setCameraOpen(false);
    setCameraError(null);
    setError(null);
  }

  function handleOpenCamera() {
    setCaptureIntent("camera");
    setError(null);
    setActionMessage(null);
    setCameraError(null);

    if (supportsLiveCamera()) {
      setCameraOpen(true);
      return;
    }

    cameraInputRef.current?.click();
  }

  const locationSummary = locationStatus
    ? `${locationStatus.user_location.lat.toFixed(4)}, ${locationStatus.user_location.lon.toFixed(4)}`
    : locating
      ? copy.locatingLabel
      : copy.reportNeedLocation;

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-amber-700" />
        <h2 className="text-lg font-semibold text-slate-900">{copy.reportSection}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">{copy.reportSubtitle}</p>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4" />
          {flowCopy.guidanceTitle}
        </div>
        <p className="mt-2">{flowCopy.guidanceBody}</p>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-700">{copy.reportFileLabel}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleOpenCamera}
              className="flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900"
            >
              <Video className="h-4 w-4" />
              {flowCopy.cameraAction}
            </button>
            <button
              type="button"
              onClick={() => {
                setCaptureIntent("gallery");
                galleryInputRef.current?.click();
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              <Images className="h-4 w-4" />
              {flowCopy.galleryAction}
            </button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <canvas ref={captureCanvasRef} className="hidden" />
          <p className="text-xs text-slate-500">
            On laptops, Open camera uses your webcam when the browser allows it. Otherwise it falls back to a file picker.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">{flowCopy.selectedMedia}</div>
            {file ? (
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
                {flowCopy.clearSelection}
              </button>
            ) : null}
          </div>
          {file ? (
            <div className="mt-3 space-y-1">
              <div className="font-medium text-slate-900">{file.name}</div>
              <div>
                {captureIntent === "camera" ? flowCopy.sourceCamera : flowCopy.sourceGallery}
                {" • "}
                {formatFileSize(file.size)}
              </div>
              <div className="text-xs text-slate-500">{getFreshnessLabel(file, flowCopy)}</div>
            </div>
          ) : (
            <div className="mt-2 text-slate-500">{flowCopy.noMediaSelected}</div>
          )}
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          {copy.reportDescriptionLabel}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-3"
          />
          <span className="text-xs text-slate-500">
            Avoid phone numbers or personal details in the description. Share only what you see on
            the ground.
          </span>
        </label>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <div className="font-semibold">{flowCopy.confirmationTitle}</div>
          <p className="mt-1 text-emerald-900">{flowCopy.confirmationHint}</p>
          <p className="mt-1 text-sm text-emerald-900">
            Uploaded files appear in the dashboard Ground reports panel for admin verification.
          </p>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                {flowCopy.attachedLocation}
              </div>
              <div className="mt-1">{locationSummary}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                {flowCopy.zoneLabel}
              </div>
              <div className="mt-1">
                {locationStatus?.user_location.zone_name ?? copy.reportNeedLocation}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!locationStatus || !file || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <Upload className="h-4 w-4" />
          {submitting ? copy.locatingLabel : copy.reportSubmit}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {actionMessage}
        </p>
      ) : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/15 bg-slate-950 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">Live camera preview</div>
                <div className="mt-1 text-sm text-slate-300">
                  Capture one fresh image for official verification.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="rounded-full border border-slate-700 p-2 text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-black">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="aspect-video w-full object-cover"
              />
            </div>

            {cameraStarting ? (
              <p className="mt-3 text-sm text-slate-300">Starting camera...</p>
            ) : null}

            {cameraError ? (
              <p className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {cameraError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleCaptureFromCamera()}
                disabled={cameraStarting}
                className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Capture photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraOpen(false);
                  cameraInputRef.current?.click();
                }}
                className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100"
              >
                Use file picker
              </button>
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-300"
              >
                Close camera
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="text-sm font-semibold text-slate-900">{copy.reportStatusLabel}</div>
        {status ? (
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{status.zone_name}</div>
            <div>Status: {status.status}</div>
            {typeof status.verification_score === "number" ? (
              <div>Confidence: {Math.round(status.verification_score * 100)}%</div>
            ) : null}
            {status.risk_boost_applied && status.risk_boost_expires_at ? (
              <div>
                Risk boost active until:{" "}
                {new Date(status.risk_boost_expires_at).toLocaleString("en-IN")}
              </div>
            ) : null}
            <div>{status.message}</div>
            {status.verification_breakdown ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Verification summary
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {status.verification_breakdown.summary}
                </div>
                <div className="mt-3 space-y-2">
                  {status.verification_breakdown.components.map((component) => (
                    <div key={component.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <span>{component.label}</span>
                        <span>{Math.round(component.score * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${Math.max(6, Math.round(component.score * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleDeleteReport()}
              className="mt-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {flowCopy.deleteAction}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">{copy.reportStatusUnavailable}</p>
        )}
      </div>
    </section>
  );
}

function supportsLiveCamera() {
  return typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
}

function stopCameraStream(streamRef: { current: MediaStream | null }) {
  if (!streamRef.current) {
    return;
  }

  streamRef.current.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
}

function getOrCreateReporterToken() {
  if (typeof window === "undefined") {
    return "server-preview";
  }

  const existing = window.localStorage.getItem(REPORTER_TOKEN_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const created =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `reporter-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(REPORTER_TOKEN_STORAGE_KEY, created);
  return created;
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getFreshnessLabel(file: File, copy: MediaFlowCopy) {
  const ageMs = Date.now() - file.lastModified;
  return ageMs <= 6 * 60 * 60 * 1000 ? copy.freshnessRecent : copy.freshnessOlder;
}
