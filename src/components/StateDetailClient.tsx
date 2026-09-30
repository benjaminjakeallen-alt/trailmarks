"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeftIcon, LightbulbIcon } from "@phosphor-icons/react";
import StateSilhouette from "@/components/map/StateSilhouette";
import Visitors from "@/components/family/Visitors";
import { useFamily } from "@/components/family/FamilyProvider";
import MemoryComposer from "@/components/memories/MemoryComposer";
import MemoryTimeline from "@/components/memories/MemoryTimeline";
import Switch from "@/components/ui/Switch";
import { WordReveal } from "@/components/motion/Reveal";
import { STATES_BY_CODE } from "@/lib/statesData";
import { EASE_OUT_EXPO, haptic } from "@/lib/motion";
import type { Memory } from "@/lib/types";

interface StateDetailClientProps {
  stateCode: string;
  initialMemories: Memory[];
  initialVisited: boolean;
  initialFirstVisitedOn: string | null;
  /** Other family members who have claimed this state. */
  otherVisitorIds: string[];
}

function sinceLabel(date: string | null) {
  if (!date) return null;
  const d = new Date(`${date.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function StateDetailClient({
  stateCode,
  initialMemories,
  initialVisited,
  initialFirstVisitedOn,
  otherVisitorIds,
}: StateDetailClientProps) {
  const { viewer, members } = useFamily();
  const info = STATES_BY_CODE[stateCode];
  const [memories, setMemories] = useState(initialMemories);
  const [visited, setVisited] = useState(initialVisited);
  const [firstVisitedOn, setFirstVisitedOn] = useState(initialFirstVisitedOn);

  async function toggle() {
    const next = !visited;
    setVisited(next);
    haptic(next ? [10, 40, 18] : 8);
    const res = await fetch(`/api/states/${stateCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: next, firstVisitedOn: next ? new Date().toISOString().slice(0, 10) : null }),
    }).catch(() => null);
    if (!res?.ok) {
      setVisited(!next);
      return;
    }
    const data = await res.json();
    setFirstVisitedOn(data.firstVisitedOn ?? null);
  }

  const since = visited ? sinceLabel(firstVisitedOn) : null;
  const heroPhoto = memories.find((m) => m.photos.length > 0)?.photos[0].url ?? null;
  const order = new Map(members.map((m, i) => [m.userId, i]));
  const visitorIds = [...(visited && viewer ? [viewer.userId] : []), ...otherVisitorIds].sort(
    (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99),
  );

  return (
    <>
      <section className="mx-auto max-w-[1400px] px-3 pb-10 pt-4 sm:px-8 lg:pb-14 lg:pt-6">
        <Link href="/" className="group ml-1 inline-flex items-center gap-2 text-[15px] font-medium text-ink-2 hover:text-ink">
          <ArrowLeftIcon size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
          Back to the map
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: EASE_OUT_EXPO }}
          className="relative isolate mt-5 overflow-hidden rounded-[2rem] text-white"
        >
          {heroPhoto ? (
            <motion.div
              className="absolute inset-0 -z-10"
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 2.4, ease: EASE_OUT_EXPO }}
            >
              <Image src={heroPhoto} alt="" fill priority sizes="(min-width: 1400px) 1400px, 100vw" className="object-cover" />
            </motion.div>
          ) : (
            <div className="brand-gradient absolute inset-0 -z-10" />
          )}
          <div className="photo-scrim absolute inset-0 -z-10" />

          <div className="grid min-h-[480px] grid-cols-1 gap-4 p-6 sm:p-10 lg:min-h-[540px] lg:grid-cols-12 lg:items-end lg:p-14">
            <div className="order-2 lg:order-1 lg:col-span-7">
              <span className="glass inline-flex rounded-full px-3 py-1 text-[12.5px] font-medium">{info.region}</span>
              <WordReveal
                text={info.name}
                className="mt-4 font-display text-[clamp(3rem,7.5vw,6.25rem)] leading-[0.95] tracking-[-0.04em]"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="mt-3 text-[15px] text-white/75"
              >
                Capital · {info.capital}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.9, ease: EASE_OUT_EXPO }}
                className="glass mt-7 flex max-w-md items-center justify-between gap-4 rounded-2xl px-5 py-4"
              >
                <div>
                  <p className="font-semibold">{visited ? "Claimed" : "Not claimed yet"}</p>
                  <p className="text-[13.5px] text-white/70">
                    {visited ? (since ? `On your map since ${since}` : "On your map") : "Been here? Claim it."}
                  </p>
                </div>
                <Switch on={visited} onChange={toggle} label={`Claim ${info.name}`} />
              </motion.div>
              <Visitors userIds={visitorIds} onPhoto size={26} className="mt-4" />
            </div>

            <div className="order-1 flex items-center justify-center lg:order-2 lg:col-span-5 lg:self-center">
              <StateSilhouette
                code={stateCode}
                claimed={visited}
                gold={members.length > 1 && visitorIds.length === members.length}
                draw
                onPhoto
                width={480}
                height={360}
                className="h-44 w-full drop-shadow-[0_12px_30px_rgb(0_0_0/0.35)] sm:h-60 lg:h-auto"
              />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
          className="mb-10 flex gap-3 rounded-[1.4rem] bg-sun-soft px-5 py-4 text-[16px] leading-[1.6] text-ink-2"
        >
          <LightbulbIcon size={20} weight="fill" className="mt-0.5 shrink-0 text-sun" />
          {info.funFact}
        </motion.p>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-3xl">Journal</h2>
          <span className="text-[14px] font-medium text-ink-3 tabular">
            {memories.length} {memories.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <div className="space-y-8">
          <MemoryComposer
            endpoint={`/api/states/${stateCode}/memories`}
            photoStateCode={stateCode}
            prompt={`Write about ${info.name}…`}
            titlePlaceholder="Sunrise hike above the clouds"
            onCreated={(memory) => {
              setMemories((prev) => [memory, ...prev]);
              setVisited(true);
            }}
          />
          <MemoryTimeline
            memories={memories}
            onDelete={(id) => setMemories((prev) => prev.filter((m) => m.id !== id))}
            emptyTitle={`Nothing from ${info.name} yet`}
            emptyBody="Add the first memory above. Photos, a date, a line or two — it all becomes part of the slideshow."
          />
        </div>
      </section>
    </>
  );
}
