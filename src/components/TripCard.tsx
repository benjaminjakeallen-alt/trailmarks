"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import RouteSketch from "@/components/trips/RouteSketch";
import { STATES_BY_CODE } from "@/lib/statesData";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { Trip } from "@/lib/types";

export function formatTripDates(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return "Not started";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startedAt).toLocaleDateString(undefined, opts);
  if (!endedAt) return `Since ${start}`;
  const end = new Date(endedAt).toLocaleDateString(undefined, { ...opts, year: "numeric" });
  return start === new Date(endedAt).toLocaleDateString(undefined, opts) ? end : `${start} — ${end}`;
}

export function TripStatus({ status }: { status: Trip["status"] }) {
  const label = { planned: "Planned", active: "Recording", completed: "Completed" }[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated/85 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-2 ring-1 ring-line backdrop-blur">
      <span className="relative flex h-1.5 w-1.5">
        {status === "active" && <span className="record-pulse absolute inset-0 rounded-full bg-ember" />}
        <span
          className={`relative h-1.5 w-1.5 rounded-full ${
            status === "active" ? "bg-ember" : status === "completed" ? "bg-lagoon" : "bg-ink-3"
          }`}
        />
      </span>
      {label}
    </span>
  );
}

export default function TripCard({
  trip,
  points,
  stateCodes,
  distanceMiles,
  featured = false,
  wide = false,
  index = 0,
}: {
  trip: Trip;
  points: { lat: number; lng: number }[];
  stateCodes: string[];
  distanceMiles: number;
  featured?: boolean;
  wide?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: index * 0.07 }}
      className="h-full"
    >
      <Link
        href={`/trips/${trip.id}`}
        className="group flex h-full flex-col rounded-[2rem] bg-ink/[0.03] p-1.5 ring-1 ring-line transition-transform duration-500 ease-[var(--ease-glide)] active:scale-[0.99]"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[calc(2rem-0.375rem)] bg-elevated shadow-[var(--highlight)] ring-1 ring-line">
          <div className={`relative overflow-hidden bg-sunken/60 ${featured ? "min-h-[280px] flex-1" : wide ? "aspect-[16/10] md:aspect-[5/2]" : "aspect-[16/10]"}`}>
            <RouteSketch
              points={points}
              live={trip.status === "active"}
              className="absolute inset-0 h-full w-full transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
            />
            <div className="absolute left-4 top-4">
              <TripStatus status={trip.status} />
            </div>
            {trip.coverPhotoUrl && (
              <div className="absolute bottom-4 right-4 h-16 w-16 overflow-hidden rounded-2xl ring-4 ring-elevated">
                <Image src={trip.coverPhotoUrl} alt="" fill sizes="64px" className="object-cover" />
              </div>
            )}
          </div>

          <div className="flex items-end justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                {formatTripDates(trip.startedAt, trip.endedAt)}
              </p>
              <h3
                className={`mt-1.5 truncate font-display tracking-[-0.02em] ${
                  featured ? "text-[2.1rem] leading-[1.05]" : "text-2xl"
                }`}
              >
                {trip.title}
              </h3>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-ink-2 tabular">
                <span>{distanceMiles >= 10 ? Math.round(distanceMiles) : distanceMiles.toFixed(1)} mi</span>
                <span className="text-ink-3">/</span>
                <span>
                  {stateCodes.length
                    ? stateCodes.map((c) => STATES_BY_CODE[c]?.code ?? c).join(" · ")
                    : "No states yet"}
                </span>
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/[0.05] text-ink-2 transition-all duration-300 group-hover:bg-ink group-hover:text-bg">
              <ArrowUpRightIcon size={16} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
