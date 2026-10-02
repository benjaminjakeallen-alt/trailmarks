"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRightIcon, CalendarBlankIcon, MapPinIcon, PathIcon } from "@phosphor-icons/react";
import RouteSketch from "@/components/trips/RouteSketch";
import { STATES_BY_CODE } from "@/lib/statesData";
import Avatar from "@/components/family/Avatar";
import { useFamily } from "@/components/family/FamilyProvider";
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

export function TripStatus({ status, onPhoto = false }: { status: Trip["status"]; onPhoto?: boolean }) {
  const label = { planned: "Planned", active: "Recording", completed: "Completed" }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium ${
        onPhoto ? "glass text-white" : "bg-surface text-fg-muted ring-1 ring-line"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {status === "active" && <span className="record-pulse absolute inset-0 rounded-full bg-danger" />}
        <span
          className={`relative h-2 w-2 rounded-full ${
            status === "active" ? "bg-danger" : status === "completed" ? "bg-success-bright" : onPhoto ? "bg-white/60" : "bg-fg-subtle"
          }`}
        />
      </span>
      {label}
    </span>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium tabular">
      {icon}
      {children}
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
  const { members, byId } = useFamily();
  const owner = members.length > 1 && trip.userId ? byId[trip.userId] : undefined;
  const miles = distanceMiles >= 10 ? Math.round(distanceMiles) : distanceMiles.toFixed(1);
  const size = featured
    ? "min-h-[420px] h-full md:min-h-[560px]"
    : wide
      ? "aspect-[4/5] sm:aspect-[16/10] md:aspect-[5/2]"
      : "aspect-[4/5] sm:aspect-[16/12]";

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
        className={`group relative isolate flex flex-col justify-end overflow-hidden rounded-[1.75rem] text-white shadow-[var(--shadow-card)] transition-transform duration-500 ease-[var(--ease-glide)] active:scale-[0.99] ${size}`}
      >
        {trip.coverPhotoUrl ? (
          <Image
            src={trip.coverPhotoUrl}
            alt=""
            fill
            sizes={featured ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 100vw"}
            className="-z-10 object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
          />
        ) : (
          <div className="brand-gradient absolute inset-0 -z-10" />
        )}
        <div className="photo-scrim absolute inset-0 -z-10" />

        {/* The route rides in the open sky above the title, like a trail drawn on the landscape. */}
        <div className="absolute inset-x-0 top-0 h-[62%]">
          <RouteSketch points={points} live={trip.status === "active"} onPhoto className="h-full w-full" />
        </div>

        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            {owner && <Avatar member={owner} size={28} ring />}
            <TripStatus status={trip.status} onPhoto />
          </span>
          <span className="glass flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <ArrowUpRightIcon size={17} />
          </span>
        </div>

        <div className="relative p-5 sm:p-6">
          <h2 className={`font-display leading-[1.05] ${featured ? "text-[2rem] sm:text-[2.5rem]" : "text-[1.6rem]"}`}>
            {trip.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip icon={<CalendarBlankIcon size={14} />}>{formatTripDates(trip.startedAt, trip.endedAt)}</Chip>
            {distanceMiles > 0 && <Chip icon={<PathIcon size={14} />}>{miles} mi</Chip>}
            {stateCodes.length > 0 && (
              <Chip icon={<MapPinIcon size={14} weight="fill" className="text-reward" />}>
                {stateCodes.map((c) => STATES_BY_CODE[c]?.code ?? c).join(" · ")}
              </Chip>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
