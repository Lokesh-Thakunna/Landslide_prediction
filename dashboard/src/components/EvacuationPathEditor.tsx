import { useEffect, useMemo, useState } from "react";
import { MapPinned } from "lucide-react";
import { saveEvacuationPath } from "../services/api";
import type {
  EvacuationPathCategory,
  EvacuationPathPayload,
  EvacuationRoute,
  Shelter,
  ZoneRoadConditions
} from "../types";

interface EvacuationPathEditorProps {
  zoneId: string;
  route: EvacuationRoute | null;
  shelters: Shelter[];
  roadConditions: ZoneRoadConditions | null;
  onSaved: () => Promise<void>;
}

const pathCategories: EvacuationPathCategory[] = ["primary", "alternate", "emergency_only"];

export function EvacuationPathEditor({
  zoneId,
  route,
  shelters,
  roadConditions,
  onSaved
}: EvacuationPathEditorProps) {
  const [safeShelterId, setSafeShelterId] = useState(route?.safe_shelter_id ?? shelters[0]?.id ?? "");
  const [pathCategory, setPathCategory] = useState<EvacuationPathCategory>(
    route?.path_category ?? "primary"
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(route?.estimated_minutes ?? 18);
  const [instructionSummary, setInstructionSummary] = useState(route?.instruction_summary ?? "");
  const [stepsText, setStepsText] = useState((route?.steps ?? []).join("\n"));
  const [warningsText, setWarningsText] = useState((route?.route_warnings ?? []).join("\n"));
  const [hazardNotes, setHazardNotes] = useState(route?.hazard_notes ?? "");
  const [isUphill, setIsUphill] = useState(route?.is_uphill ?? false);
  const [avoidsStreams, setAvoidsStreams] = useState(route?.avoids_streams ?? false);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>(route?.segment_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSafeShelterId(route?.safe_shelter_id ?? shelters[0]?.id ?? "");
    setPathCategory(route?.path_category ?? "primary");
    setEstimatedMinutes(route?.estimated_minutes ?? 18);
    setInstructionSummary(route?.instruction_summary ?? "");
    setStepsText((route?.steps ?? []).join("\n"));
    setWarningsText((route?.route_warnings ?? []).join("\n"));
    setHazardNotes(route?.hazard_notes ?? "");
    setIsUphill(route?.is_uphill ?? false);
    setAvoidsStreams(route?.avoids_streams ?? false);
    setSelectedSegmentIds(route?.segment_ids ?? []);
    setStatus(null);
    setError(null);
  }, [route, shelters, zoneId]);

  const selectedSegments = useMemo(
    () =>
      roadConditions?.segments.filter((segment) => selectedSegmentIds.includes(segment.id)) ?? [],
    [roadConditions?.segments, selectedSegmentIds]
  );

  const computedDistanceKm = useMemo(
    () =>
      Number(
        selectedSegments.reduce((sum, segment) => sum + segment.length_km, 0).toFixed(2)
      ),
    [selectedSegments]
  );

  function toggleSegment(segmentId: string) {
    setSelectedSegmentIds((current) =>
      current.includes(segmentId)
        ? current.filter((item) => item !== segmentId)
        : [...current, segmentId]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    setError(null);

    const payload: EvacuationPathPayload = {
      zone_id: zoneId,
      safe_shelter_id: safeShelterId,
      segment_ids: selectedSegmentIds,
      instruction_summary: instructionSummary.trim(),
      steps: stepsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      estimated_minutes: estimatedMinutes,
      path_category: pathCategory,
      is_uphill: isUphill,
      avoids_streams: avoidsStreams,
      hazard_notes: hazardNotes.trim(),
      route_warnings: warningsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    try {
      await saveEvacuationPath(payload);
      await onSaved();
      setStatus("Evacuation path saved and published.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save evacuation path.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-900">
        <MapPinned className="h-4 w-4 text-sky-700" />
        <div>
          <h3 className="font-semibold">Evacuation path authoring</h3>
          <p className="text-sm text-slate-600">
            Publish the verified path this zone should expose to citizens.
          </p>
        </div>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Safe shelter
            <select
              value={safeShelterId}
              onChange={(event) => setSafeShelterId(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              {shelters.map((shelter) => (
                <option key={shelter.id} value={shelter.id}>
                  {shelter.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Path category
            <select
              value={pathCategory}
              onChange={(event) => setPathCategory(event.target.value as EvacuationPathCategory)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              {pathCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Walk time (min)
            <input
              type="number"
              min={0}
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Route summary
          <textarea
            value={instructionSummary}
            onChange={(event) => setInstructionSummary(event.target.value)}
            className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
        </label>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-900">Road segment selection</div>
              <div className="text-sm text-slate-600">
                Pick the segments that form the published evacuation path.
              </div>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
              {computedDistanceKm} km selected
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {roadConditions?.segments.length ? (
              roadConditions.segments.map((segment) => (
                <label
                  key={segment.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedSegmentIds.includes(segment.id)}
                    onChange={() => toggleSegment(segment.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {segment.name} • {segment.condition.status}
                    </div>
                    <div className="mt-1">
                      {segment.length_km} km • {segment.condition.note}
                    </div>
                  </div>
                </label>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
                No road segments are available for this zone yet.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Step-by-step instructions
            <textarea
              value={stepsText}
              onChange={(event) => setStepsText(event.target.value)}
              className="min-h-32 rounded-xl border border-slate-300 bg-white px-3 py-2"
              placeholder="One step per line"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Route warnings
            <textarea
              value={warningsText}
              onChange={(event) => setWarningsText(event.target.value)}
              className="min-h-32 rounded-xl border border-slate-300 bg-white px-3 py-2"
              placeholder="One warning per line"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Hazard notes
          <textarea
            value={hazardNotes}
            onChange={(event) => setHazardNotes(event.target.value)}
            className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isUphill}
              onChange={(event) => setIsUphill(event.target.checked)}
            />
            Uphill path
          </label>
          <label className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={avoidsStreams}
              onChange={(event) => setAvoidsStreams(event.target.checked)}
            />
            Avoids streams
          </label>
        </div>

        {route?.verified_by || route?.verified_at ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
            Published by {route.verified_by ?? "operator"}
            {route.verified_at ? ` • ${new Date(route.verified_at).toLocaleString("en-IN")}` : ""}
          </div>
        ) : null}

        {status ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving || !safeShelterId || !selectedSegmentIds.length}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saving ? "Publishing path..." : "Publish evacuation path"}
        </button>
      </form>
    </section>
  );
}
