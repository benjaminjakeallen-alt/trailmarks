"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LiveRecorder from "@/components/LiveRecorder";
import TripStepForm from "@/components/TripStepForm";
import MemoryCard from "@/components/MemoryCard";
import { STATES_BY_CODE } from "@/lib/statesData";
import { findStateCodesForPoints } from "@/lib/stateLookup";
import { trackDistanceMiles } from "@/lib/geo";
import type { TripDetail, Memory } from "@/lib/types";
import type { TripMapPin, TripMapPoint } from "@/components/TripMap";

interface TripDetailClientProps {
  trip: TripDetail;
}

export default function TripDetailClient({ trip: initialTrip }: TripDetailClientProps) {
  const [trip, setTrip] = useState(initialTrip);
  const [memories, setMemories] = useState<Memory[]>(initialTrip.memories);
  const [justFinished, setJustFinished] = useState<string[] | null>(null);
  const [livePoints, setLivePoints] = useState<TripMapPoint[]>(
    initialTrip.points.map((p) => ({ lat: p.lat, lng: p.lng })),
  );

  const pins: TripMapPin[] = useMemo(
    () =>
      memories
        .filter((m): m is Memory & { lat: number; lng: number } => m.lat != null && m.lng != null)
        .map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, label: m.title })),
    [memories],
  );

  const lastKnownPoint = livePoints[livePoints.length - 1] ?? null;

  const liveDistanceMiles = useMemo(() => trackDistanceMiles(livePoints), [livePoints]);
  const liveStateCount = useMemo(
    () =>
      trip.status === "completed"
        ? trip.stateCodes.length
        : findStateCodesForPoints(livePoints.map((p) => [p.lng, p.lat])).length,
    [livePoints, trip.status, trip.stateCodes.length],
  );

  function handleFinished(newStateCodes: string[]) {
    setTrip((prev) => ({ ...prev, status: "completed" }));
    setJustFinished(newStateCodes);
  }

  return (
    <div className="space-y-6">
      <LiveRecorder
        trip={trip}
        pins={pins}
        onFinished={handleFinished}
        onPointsChange={setLivePoints}
        onPinClick={(id) => {
          document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      <AnimatePresence>
        {justFinished && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-visited-soft px-4 py-3 text-sm text-visited"
          >
            🎉 Trip complete
            {justFinished.length > 0 && (
              <>
                {" "}
                — newly marked{" "}
                {justFinished.map((code) => STATES_BY_CODE[code]?.name ?? code).join(", ")}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Distance", value: `${Math.round(liveDistanceMiles)} mi` },
          { label: "States touched", value: `${liveStateCount}` },
          { label: "Steps logged", value: `${memories.length}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface p-4 text-center shadow-sm">
            <p className="font-display text-2xl font-semibold">{stat.value}</p>
            <p className="text-sm text-foreground-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {trip.status !== "completed" && (
        <TripStepForm
          tripId={trip.id}
          lastKnownPoint={lastKnownPoint}
          onCreated={(memory) => setMemories((prev) => [...prev, memory])}
        />
      )}

      {memories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
          No steps yet — add one above as you go, or once the trip is done.
        </p>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <div id={`step-${memory.id}`} key={memory.id}>
              <MemoryCard
                memory={memory}
                onDelete={(id) => setMemories((prev) => prev.filter((m) => m.id !== id))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
