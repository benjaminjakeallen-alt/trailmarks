"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, CheckIcon, ImagesSquareIcon } from "@phosphor-icons/react";
import LiveRecorder from "@/components/LiveRecorder";
import MemoryComposer from "@/components/memories/MemoryComposer";
import MemoryTimeline from "@/components/memories/MemoryTimeline";
import PhotoImport from "@/components/trips/PhotoImport";
import { Button } from "@/components/ui/Button";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { TripStatus, formatTripDates } from "@/components/TripCard";
import Avatar from "@/components/family/Avatar";
import { useFamily } from "@/components/family/FamilyProvider";
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
  const { viewer, members, byId } = useFamily();
  const isOwner = !!viewer && trip.userId === viewer.userId;
  const owner = trip.userId ? byId[trip.userId] : undefined;
  const [importFiles, setImportFiles] = useState<File[] | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  async function refreshSteps() {
    const res = await fetch(`/api/trips/${trip.id}/memories`).catch(() => null);
    if (res?.ok) setMemories((await res.json()).memories);
  }

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
    <div className="mx-auto max-w-[1400px] px-3 pb-24 pt-4 sm:px-8 lg:pt-6">
      <Link href="/trips" className="group ml-1 inline-flex items-center gap-2 text-[15px] font-medium text-fg-muted hover:text-fg">
        <ArrowLeftIcon size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
        All trips
      </Link>

      <motion.header
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: EASE_OUT_EXPO }}
        className="relative isolate mb-4 mt-5 flex min-h-[380px] overflow-hidden rounded-[2rem] text-white sm:min-h-[420px]"
      >
        {trip.coverPhotoUrl ? (
          <motion.div
            className="absolute inset-0 -z-10"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.4, ease: EASE_OUT_EXPO }}
          >
            <Image src={trip.coverPhotoUrl} alt="" fill priority sizes="(min-width: 1400px) 1400px, 100vw" className="object-cover" />
          </motion.div>
        ) : (
          <div className="brand-gradient absolute inset-0 -z-10" />
        )}
        <div className="photo-scrim absolute inset-0 -z-10" />

        <div className="grid w-full grid-cols-1 content-end gap-6 p-6 sm:p-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              {owner && members.length > 1 && (
                <span className="glass flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-3 text-[12.5px] font-medium">
                  <Avatar member={owner} size={22} />
                  {isOwner ? "Your trip" : `${owner.displayName}'s trip`}
                </span>
              )}
              <TripStatus status={status} onPhoto />
              <span className="glass rounded-full px-3 py-1 text-[12.5px] font-medium">
                {formatTripDates(trip.startedAt, trip.endedAt)}
              </span>
            </div>
            <WordReveal
              text={trip.title}
              className="mt-4 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98] tracking-[-0.035em]"
            />
            {trip.description && <p className="mt-3 max-w-[52ch] text-[17px] leading-relaxed text-white/80">{trip.description}</p>}
          </div>

          <dl className="grid grid-cols-3 gap-2 lg:col-span-4">
            {[
              { label: "Miles", value: miles, decimals: miles < 10 ? 1 : 0 },
              { label: "States", value: stateCodes.length, decimals: 0 },
              { label: "Steps", value: memories.length, decimals: 0 },
            ].map((s) => (
              <div key={s.label} className="glass flex flex-col-reverse rounded-2xl px-4 py-3">
                <dt className="text-[12.5px] font-medium text-white/70">{s.label}</dt>
                <dd className="font-display text-[1.75rem] leading-tight">
                  <AnimatedNumber value={s.value} decimals={s.decimals} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </motion.header>

      <LiveRecorder
        trip={trip}
        canRecord={isOwner}
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
            className="mt-4 flex items-center gap-4 rounded-[1.6rem] bg-success-soft p-5 ring-1 ring-success/20"
          >
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRING_STAMP, delay: 0.15 }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-white"
            >
              <CheckIcon size={22} weight="bold" />
            </motion.span>
            <div>
              <p className="font-display text-xl">Trip complete.</p>
              <p className="text-sm text-fg-muted">
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
          <span className="mr-1 text-[14px] font-medium text-fg-subtle">Crossed</span>
          {stateCodes.map((code) => (
            <Link
              key={code}
              href={`/states/${code.toLowerCase()}`}
              className="rounded-full bg-surface px-3.5 py-1.5 text-[14px] font-medium shadow-[var(--shadow-card)] ring-1 ring-line transition-colors hover:text-accent-fg hover:ring-accent/30"
            >
              {STATES_BY_CODE[code]?.name ?? code}
            </Link>
          ))}
        </div>
      )}

      <section className="mx-auto mt-16 max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-3xl">Steps</h2>
            <span className="text-[14px] font-medium text-fg-subtle tabular">
              {memories.length} {memories.length === 1 ? "stop" : "stops"}
            </span>
          </div>
          {isOwner && (
            <>
              <Button
                variant="secondary"
                icon={<ImagesSquareIcon size={18} />}
                onClick={() => importInput.current?.click()}
              >
                Import photos
              </Button>
              <input
                ref={importInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (files.length) setImportFiles(files);
                }}
              />
            </>
          )}
        </div>
        {importFiles && (
          <PhotoImport
            tripId={trip.id}
            trip={{ startedAt: trip.startedAt, endedAt: trip.endedAt }}
            steps={memories}
            files={importFiles}
            onClose={() => setImportFiles(null)}
            onImported={refreshSteps}
          />
        )}
        <div className="space-y-8">
          {trip.status !== "completed" && isOwner && (
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
