import { CloudOff, Compass, Download, Navigation } from "lucide-react";
import type { LanguageCode, LocationStatus } from "../types";

interface OfflineCompassCardProps {
  language: LanguageCode;
  status: LocationStatus | null;
  deviceHeading: number | null;
  districtName: string | null;
  isOnline: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerReady: boolean;
  cacheState: "idle" | "preparing" | "ready" | "error";
  cacheMessage: string | null;
  cachedCurrentDistrict: boolean;
  onPrepareOffline: () => void | Promise<void>;
}

type OfflineCompassCopy = {
  title: string;
  subtitle: string;
  online: string;
  offline: string;
  prepare: string;
  preparing: string;
  ready: string;
  unavailable: string;
  districtLabel: string;
  compassHint: string;
  headingLabel: string;
  landmarkLabel: string;
  shelterLabel: string;
  arrowCaption: string;
  connectivityHint: string;
};

const copyByLanguage: Record<LanguageCode, OfflineCompassCopy> = {
  hi: {
    title: "Offline Compass Guidance",
    subtitle: "Internet na hone par bhi surakshit sthal ki direction aur landmark yahan milega.",
    online: "Online",
    offline: "Offline",
    prepare: "Prepare offline access",
    preparing: "Preparing offline guidance",
    ready: "Offline guidance ready",
    unavailable: "Offline app caching is not available on this browser.",
    districtLabel: "Prepared district",
    compassHint: "Phone ko seedha pakadkar arrow ko follow karein.",
    headingLabel: "Current heading",
    landmarkLabel: "Landmark fallback",
    shelterLabel: "Safe shelter",
    arrowCaption: "Arrow safe zone ki direction dikhata hai.",
    connectivityHint: "Map na load ho to bhi compass, bearing aur landmark guidance kaam karega."
  },
  en: {
    title: "Offline Compass Guidance",
    subtitle: "Keep a district-ready fallback so direction and landmark guidance still works without internet.",
    online: "Online",
    offline: "Offline",
    prepare: "Prepare offline access",
    preparing: "Preparing offline guidance",
    ready: "Offline guidance ready",
    unavailable: "Offline app caching is not available on this browser.",
    districtLabel: "Prepared district",
    compassHint: "Hold the phone flat and follow the arrow toward the safe zone.",
    headingLabel: "Current heading",
    landmarkLabel: "Landmark fallback",
    shelterLabel: "Safe shelter",
    arrowCaption: "The arrow points toward the recommended safe zone.",
    connectivityHint: "Even if the live map does not load, the compass, bearing, and landmark guidance remains available."
  },
  "hi-x-garhwali": {
    title: "Offline Compass Guidance",
    subtitle: "Internet na hon par bhi surakshit jagah ku rukh ar landmark guidance yakh milu.",
    online: "Online",
    offline: "Offline",
    prepare: "Prepare offline access",
    preparing: "Preparing offline guidance",
    ready: "Offline guidance ready",
    unavailable: "Offline app caching is not available on this browser.",
    districtLabel: "Prepared district",
    compassHint: "Phone sidho pakad ar arrow ku palan kara.",
    headingLabel: "Current heading",
    landmarkLabel: "Landmark fallback",
    shelterLabel: "Safe shelter",
    arrowCaption: "Arrow surakshit jagah ku rukh dikhaund.",
    connectivityHint: "Map na khulyo ta bhi compass, bearing ar landmark guidance chaldi rahal."
  },
  "hi-x-kumaoni": {
    title: "Offline Compass Guidance",
    subtitle: "Internet na rahyo ta bhi surakshit thaor ko rukh aur landmark guidance yahan milu.",
    online: "Online",
    offline: "Offline",
    prepare: "Prepare offline access",
    preparing: "Preparing offline guidance",
    ready: "Offline guidance ready",
    unavailable: "Offline app caching is not available on this browser.",
    districtLabel: "Prepared district",
    compassHint: "Phone seedho pakad aur arrow ko follow karo.",
    headingLabel: "Current heading",
    landmarkLabel: "Landmark fallback",
    shelterLabel: "Safe shelter",
    arrowCaption: "Arrow sujhaayo safe zone ko rukh dikhau cha.",
    connectivityHint: "Map na khulno ta bhi compass, bearing aur landmark guidance chalno cha."
  },
};

export function OfflineCompassCard({
  language,
  status,
  deviceHeading,
  districtName,
  isOnline,
  serviceWorkerSupported,
  serviceWorkerReady,
  cacheState,
  cacheMessage,
  cachedCurrentDistrict,
  onPrepareOffline,
}: OfflineCompassCardProps) {
  const copy = copyByLanguage[language];
  const fallback = status?.evacuation.offline_fallback ?? null;
  const safeZone = status?.evacuation.recommended_safe_zone ?? null;
  const currentHeading = status?.movement.user_heading_degrees ?? deviceHeading;
  const relativeRotation =
    typeof fallback?.bearing_degrees === "number"
      ? Math.round(fallback.bearing_degrees - (currentHeading ?? 0))
      : 0;

  const actionLabel =
    cacheState === "preparing"
      ? copy.preparing
      : cachedCurrentDistrict
        ? copy.ready
        : copy.prepare;

  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#15324b_48%,#1f5f5b_100%)] p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-sky-200" />
            <h2 className="text-lg font-semibold">{copy.title}</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-200">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
              isOnline
                ? "bg-emerald-400/20 text-emerald-100"
                : "bg-amber-300/20 text-amber-100"
            }`}
          >
            {isOnline ? copy.online : copy.offline}
          </span>
          <button
            type="button"
            onClick={() => void onPrepareOffline()}
            disabled={!serviceWorkerSupported || cacheState === "preparing"}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLabel}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-300">
                {copy.shelterLabel}
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {safeZone?.name ?? "Awaiting safe-zone guidance"}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-200">
                <span>{fallback ? `${fallback.distance_km} km` : "--"}</span>
                <span>{fallback?.bearing_label ?? "Bearing unavailable"}</span>
                <span>{status?.movement.safe_bearing_label ?? "Compass pending"}</span>
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-slate-950/20 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-200">
              {serviceWorkerReady ? "SW ready" : "Starting offline worker"}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <div className="flex h-44 w-44 items-center justify-center rounded-full border border-white/15 bg-slate-950/25 shadow-[inset_0_0_40px_rgba(148,163,184,0.12)]">
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Compass className="absolute h-24 w-24 text-white/20" />
                <Navigation
                  className="h-16 w-16 text-sky-200 transition-transform"
                  style={{ transform: `rotate(${relativeRotation}deg)` }}
                />
              </div>
            </div>
            <div className="text-xl font-semibold">
              {fallback?.bearing_label ?? "Offline bearing unavailable"}
            </div>
            <div className="max-w-xl text-sm text-slate-200">{copy.arrowCaption}</div>
          </div>
        </div>

        <div className="grid gap-3">
          <InfoPanel
            icon={Download}
            label={copy.districtLabel}
            value={districtName ?? "Current district"}
            detail={
              serviceWorkerSupported
                ? cacheMessage ??
                  (cachedCurrentDistrict
                    ? copy.ready
                    : copy.connectivityHint)
                : copy.unavailable
            }
          />
          <InfoPanel
            icon={Compass}
            label={copy.headingLabel}
            value={
              currentHeading !== null
                ? `${Math.round(currentHeading)} deg`
                : "Heading unavailable"
            }
            detail={copy.compassHint}
          />
          <InfoPanel
            icon={CloudOff}
            label={copy.landmarkLabel}
            value={fallback?.landmark ?? "Landmark guidance will appear after location refresh."}
            detail={fallback ? copy.connectivityHint : "Use location guidance once to save fallback details."}
          />
        </div>
      </div>
    </section>
  );
}

function InfoPanel({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Compass;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-300">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-200">{detail}</div>
    </div>
  );
}
