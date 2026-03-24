import { LocateFixed, MapPinned, Navigation, Route, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { CitizenRouteMap } from "./CitizenRouteMap";
import { useEvacuationTracker } from "../hooks/useEvacuationTracker";
import type {
  ComputedSafeZoneRoute,
  EvacuationRoute,
  LanguageCode,
  LocationStatus,
  ZoneRoadConditions
} from "../types";

interface EvacuationNavigationCardProps {
  language: LanguageCode;
  route: EvacuationRoute | null;
  computedRoute: ComputedSafeZoneRoute | null;
  roadConditions: ZoneRoadConditions | null;
  status: LocationStatus | null;
  deviceHeading: number | null;
}

type NavigationCopy = {
  title: string;
  subtitle: string;
  start: string;
  stop: string;
  ready: string;
  liveTracking: string;
  remaining: string;
  eta: string;
  currentStep: string;
  nextStep: string;
  liveMap: string;
  mapHint: string;
  noRoute: string;
  trackingError: string;
  currentPosition: string;
  safeZone: string;
  danger: string;
  trackingOn: string;
  turnWarning: string;
};

const copyByLanguage: Record<LanguageCode, NavigationCopy> = {
  hi: {
    title: "Live route navigation",
    subtitle: "Start navigation to keep your live position and the safest path in one screen.",
    start: "Start route",
    stop: "Stop route",
    ready: "Route ready",
    liveTracking: "Live tracking",
    remaining: "Remaining distance",
    eta: "ETA",
    currentStep: "Current step",
    nextStep: "Next step",
    liveMap: "Route map",
    mapHint: "Blue dot is your live position. Green is the safe zone. Red marks the nearest danger side.",
    noRoute: "Load location guidance first to start the navigation screen.",
    trackingError: "Tracking issue",
    currentPosition: "Your position",
    safeZone: "Safe zone",
    danger: "Danger side",
    trackingOn: "Tracking active",
    turnWarning: "Turn away from the red marker and follow the green route."
  },
  en: {
    title: "Live route navigation",
    subtitle: "Start navigation to keep your live position and the safest path in one screen.",
    start: "Start route",
    stop: "Stop route",
    ready: "Route ready",
    liveTracking: "Live tracking",
    remaining: "Remaining distance",
    eta: "ETA",
    currentStep: "Current step",
    nextStep: "Next step",
    liveMap: "Route map",
    mapHint: "Blue dot is your live position. Green is the safe zone. Red marks the nearest danger side.",
    noRoute: "Load location guidance first to start the navigation screen.",
    trackingError: "Tracking issue",
    currentPosition: "Your position",
    safeZone: "Safe zone",
    danger: "Danger side",
    trackingOn: "Tracking active",
    turnWarning: "Turn away from the red marker and follow the green route."
  },
  "hi-x-garhwali": {
    title: "Live route navigation",
    subtitle: "Navigation chalaun ki app tumku live jagah ar sabsyan surakshit rasto dikhau.",
    start: "Start route",
    stop: "Stop route",
    ready: "Route ready",
    liveTracking: "Live tracking",
    remaining: "Bachi duri",
    eta: "Pahunchan ka samay",
    currentStep: "Ab ka kadam",
    nextStep: "Aglo kadam",
    liveMap: "Route map",
    mapHint: "Blue dot tumari jagah ch. Green safe zone ch. Red khatara wali disha ch.",
    noRoute: "Navigation screen chalaun tai pahile location guidance load kara.",
    trackingError: "Tracking issue",
    currentPosition: "Tumari jagah",
    safeZone: "Safe zone",
    danger: "Danger side",
    trackingOn: "Tracking active",
    turnWarning: "Laal marker ku rukh chhod ar haryo route pakad."
  },
  "hi-x-kumaoni": {
    title: "Live route navigation",
    subtitle: "Navigation chalaun se tumro live thaor aur sabse surakshit bato ek screen ma dikhal.",
    start: "Start route",
    stop: "Stop route",
    ready: "Route ready",
    liveTracking: "Live tracking",
    remaining: "Bachi duri",
    eta: "Pahunchan ko samay",
    currentStep: "Ab ko kadam",
    nextStep: "Agilo kadam",
    liveMap: "Route map",
    mapHint: "Blue dot tumro live thaor cha. Green safe zone cha. Red khatra wali taraf dikhau cha.",
    noRoute: "Navigation screen chalaun se pahile location guidance load karo.",
    trackingError: "Tracking issue",
    currentPosition: "Tumro thaor",
    safeZone: "Safe zone",
    danger: "Danger side",
    trackingOn: "Tracking active",
    turnWarning: "Lal marker se door rahe aur haryo route follow karo."
  },
};

export function EvacuationNavigationCard({
  language,
  route,
  computedRoute,
  roadConditions,
  status,
  deviceHeading,
}: EvacuationNavigationCardProps) {
  const [active, setActive] = useState(false);
  const copy = copyByLanguage[language];
  const tracker = useEvacuationTracker({
    active,
    route,
    computedRoute,
    roadConditions,
    status,
    deviceHeading,
  });

  const steps =
    computedRoute?.route.steps.map((step) =>
      language === "en" ? step.instruction_en : step.instruction_hi
    ) ??
    route?.steps ??
    status?.evacuation.route.steps ??
    [];
  const currentStep = steps[tracker.currentStepIndex] ?? null;
  const nextStep = steps[tracker.currentStepIndex + 1] ?? null;

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_40px_rgba(32,22,17,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-semibold text-slate-900">{copy.title}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            {active ? copy.liveTracking : copy.ready}
          </span>
          <button
            type="button"
            onClick={() => setActive((current) => !current)}
            disabled={!status}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {active ? copy.stop : copy.start}
          </button>
        </div>
      </div>

      {!status ? (
        <p className="mt-4 text-sm text-slate-600">{copy.noRoute}</p>
      ) : (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard
              icon={LocateFixed}
              label={copy.remaining}
              value={tracker.remainingDistanceKm !== null ? `${tracker.remainingDistanceKm.toFixed(2)} km` : "--"}
              detail={active ? copy.trackingOn : copy.ready}
            />
            <MetricCard
              icon={Navigation}
              label={copy.eta}
              value={
                tracker.etaMinutes !== null
                  ? `${tracker.etaMinutes} min`
                  : computedRoute
                    ? `${computedRoute.route.duration_minutes} min`
                    : "--"
              }
              detail={tracker.headingToSafe !== null ? `${Math.round(tracker.headingToSafe)} deg to safe zone` : "Bearing pending"}
            />
            <MetricCard
              icon={MapPinned}
              label={copy.safeZone}
              value={status.evacuation.recommended_safe_zone.name}
              detail={`${status.evacuation.recommended_safe_zone.distance_km} km initial route`}
            />
          </div>

          {tracker.trackingError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-semibold">{copy.trackingError}: </span>
              {tracker.trackingError}
            </div>
          ) : null}

          {tracker.movingTowardDanger ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <div className="flex items-center gap-2 font-semibold">
                <TriangleAlert className="h-4 w-4" />
                {copy.turnWarning}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950 text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-sm font-semibold">{copy.liveMap}</div>
                <div className="mt-1 text-xs text-slate-300">{copy.mapHint}</div>
              </div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-300">
                {Math.round(tracker.progressRatio * 100)}% complete
              </div>
            </div>
            <CitizenRouteMap
              currentPosition={tracker.currentPosition}
              safeCoordinate={tracker.safeCoordinate}
              dangerCoordinate={tracker.dangerCoordinate}
              routeCoordinates={tracker.routeCoordinates}
              currentPositionLabel={copy.currentPosition}
              safeZoneLabel={copy.safeZone}
              dangerLabel={copy.danger}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <StepCard
              label={copy.currentStep}
              step={currentStep}
              detail={tracker.remainingDistanceKm !== null ? `${tracker.remainingDistanceKm.toFixed(2)} km left` : null}
              tone="emerald"
            />
            <StepCard
              label={copy.nextStep}
              step={nextStep}
              detail={tracker.etaMinutes !== null ? `${tracker.etaMinutes} min remaining` : null}
              tone="slate"
            />
          </div>

          {steps.length ? (
            <div className="space-y-2">
              {steps.map((step, index) => {
                const activeStep = index === tracker.currentStepIndex;
                const completedStep = index < tracker.currentStepIndex;

                return (
                  <div
                    key={`${index}-${step}`}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      activeStep
                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                        : completedStep
                          ? "border-slate-200 bg-slate-100 text-slate-500"
                          : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div className="font-semibold">Step {index + 1}</div>
                    <div className="mt-1">{step}</div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Route;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{detail}</div>
    </div>
  );
}

function StepCard({
  label,
  step,
  detail,
  tone,
}: {
  label: string;
  step: string | null;
  detail: string | null;
  tone: "emerald" | "slate";
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        tone === "emerald"
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-900">
        {step ?? "Route step unavailable"}
      </div>
      {detail ? <div className="mt-2 text-sm text-slate-600">{detail}</div> : null}
    </div>
  );
}
