"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react";
import LiveRecorder from "@/components/LiveRecorder";
import MemoryComposer from "@/components/memories/MemoryComposer";
import MemoryTimeline from "@/components/memories/MemoryTimeline";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { TripStatus, formatTripDates } from "@/components/TripCard";
import { WordReveal } from "@/components/motion/Reveal";
import { STATES_BY_CODE } from "@/lib/statesData";
import { findStateCodesForPoints } from "@/lib/stateLookup";
import { trackDistanceMiles } from "@/lib/geo";
import { EASE_OUT_EXPO, SPRING_STAMP } from "@/lib/motion";
import type { Memory, TripDetail } from "@/lib/types";
import type { TripMapPin, TripMapPoint } from "@/components/TripMap";

export default function TripDetailClient({ trip: initialTrip }: { trip: TripDetail }) {
  const [trip, setTrip] = useState(initialTrip);
  const [memories, setMemories] = useState<Memory[]>(initialTrip.memories);
  const [livePoints, setLivePoints] = useState<TripMapPoint[]>(() =>
    initialTrip.points.map((p) => ({ lat: p.lat, lng: p.lng })),
  );
  const [recording, setRecording] = useState(false);
  const [finished, setFinished] = useState<string[] | null>(null);

  const pins: TripMapPin[] = useMemo(
    () =>
      memories
        .map((m, index) => ({ m, index }))
        .filter(({ m }) => m.lat != null && m.lng != null)
        .map(({ m, index }) => ({ id: m.id, lat: m.lat!, lng: m.lng!, label: m.title, index })),
    [memories],
  );

  const miles = useMemo(() => trackDistanceMiles(livePoints), [livePoints]);
  const stateCodes = useMemo(
    () => (trip.status === "completed" ? trip.stateCodes : findStateCodesForPoints(livePoints.map((p) => [p.lng, p.lat]))),
    [livePoints, trip.status, trip.stateCodes],
  );

  const status = recording ? "active" : trip.status;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-8 lg:pt-10">
      <Link href="/trips" className="group inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeftIcon size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
        All trips
      </Link>

      <header className="mb-8 mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-3">
            <TripStatus status={status} />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              {formatTripDates(trip.startedAt, trip.endedAt)}
            </span>
          </div>
          <WordReveal
            text={trip.title}
            className="mt-4 font-display text-[clamp(2.6rem,6vw,5rem)] font-light leading-[0.95] tracking-[-0.04em]"
          />
          {trip.description && <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">{trip.description}</p>}
        </div>

        <dl className="grid grid-cols-3 divide-x divide-line rounded-[1.4rem] bg-elevated py-4 shadow-[var(--highlight)] ring-1 ring-line lg:col-span-4">
          {[
            { label: "Miles", value: miles, decimals: miles < 10 ? 1 : 0 },
            { label: "States", value: stateCodes.length, decimals: 0 },
            { label: "Steps", value: memories.length, decimals: 0 },
          ].map((s) => (
            <div key={s.label} className="px-4 text-center">
              <dd className="font-display text-3xl tracking-tight">
                <AnimatedNumber value={s.value} decimals={s.decimals} />
              </dd>
              <dt className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">{s.label}</dt>
            </div>
          ))}
        </dl>
      </header>

      <LiveRecorder
        trip={trip}
        pins={pins}
        onPointsChange={setLivePoints}
        onRecordingChange={setRecording}
        onPinClick={(id) => document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        onFinished={(newStateCodes) => {
          setTrip((prev) => ({ ...prev, status: "completed", endedAt: new Date().toISOString() }));
          setFinished(newStateCodes);
        }}
      />

      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
            className="mt-5 flex items-center gap-4 rounded-[1.6rem] bg-lagoon-soft p-5 ring-1 ring-lagoon/20"
          >
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRING_STAMP, delay: 0.15 }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lagoon text-white"
            >
              <CheckIcon size={22} weight="bold" />
            </motion.span>
            <div>
              <p className="font-display text-xl tracking-tight">Trip complete.</p>
              <p className="text-sm text-ink-2">
                {finished.length > 0
                  ? `${finished.map((c) => STATES_BY_CODE[c]?.name ?? c).join(", ")} ${
                      finished.length === 1 ? "is" : "are"
                    } now on your map.`
                  : "Every state on this route was already on your map."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {stateCodes.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Crossed</span>
          {stateCodes.map((code) => (
            <Link
              key={code}
              href={`/states/${code.toLowerCase()}`}
              className="rounded-full bg-elevated px-3 py-1.5 text-sm ring-1 ring-line transition-colors hover:ring-ink-3/40"
            >
              {STATES_BY_CODE[code]?.name ?? code}
            </Link>
          ))}
        </div>
      )}

      <section className="mx-auto mt-16 max-w-3xl">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-3xl tracking-[-0.02em]">Steps</h2>
          <span className="font-mono text-[12px] text-ink-3 tabular">
            {memories.length} {memories.length === 1 ? "stop" : "stops"}
          </span>
        </div>
        <div className="space-y-8">
          {trip.status !== "completed" && (
            <MemoryComposer
              endpoint={`/api/trips/${trip.id}/memories`}
              captureLocation
              fallbackPoint={livePoints[livePoints.length - 1] ?? null}
              prompt="Add a step where you are…"
              titlePlaceholder="Lunch stop in Asheville"
              onCreated={(memory) => setMemories((prev) => [...prev, memory])}
            />
          )}
          <MemoryTimeline
            memories={memories}
            numbered
            onDelete={(id) => setMemories((prev) => prev.filter((m) => m.id !== id))}
            emptyTitle="No steps yet"
            emptyBody="Drop a step at every stop worth remembering. Each one pins itself to the map."
          />
        </div>
      </section>
    </div>
  );
}
