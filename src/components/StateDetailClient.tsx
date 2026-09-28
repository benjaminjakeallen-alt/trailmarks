"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import StateSilhouette from "@/components/map/StateSilhouette";
import MemoryComposer from "@/components/memories/MemoryComposer";
import MemoryTimeline from "@/components/memories/MemoryTimeline";
import Switch from "@/components/ui/Switch";
import { Eyebrow, Panel } from "@/components/ui/Panel";
import { WordReveal } from "@/components/motion/Reveal";
import { STATES_BY_CODE } from "@/lib/statesData";
import { EASE_OUT_EXPO, haptic } from "@/lib/motion";
import type { Memory } from "@/lib/types";

interface StateDetailClientProps {
  stateCode: string;
  initialMemories: Memory[];
  initialVisited: boolean;
  initialFirstVisitedOn: string | null;
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
}: StateDetailClientProps) {
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

  return (
    <>
      <section className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-4 pb-12 pt-6 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:pb-20 lg:pt-10">
        <div className="lg:col-span-6 lg:pt-8">
          <Link href="/" className="group inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
            <ArrowLeftIcon size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
            Back to the map
          </Link>

          <div className="mt-8">
            <Eyebrow>{info.region}</Eyebrow>
          </div>
          <WordReveal
            text={info.name}
            className="mt-5 font-display text-[clamp(3rem,8vw,6.5rem)] font-light leading-[0.92] tracking-[-0.045em]"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-4 font-mono text-[12px] uppercase tracking-[0.16em] text-ink-3"
          >
            Capital · {info.capital}
          </motion.p>

          <motion.blockquote
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.9, ease: EASE_OUT_EXPO }}
            className="mt-8 max-w-[44ch] border-l-2 border-gold/70 pl-4 text-[17px] leading-[1.6] text-ink-2"
          >
            {info.funFact}
          </motion.blockquote>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.9, ease: EASE_OUT_EXPO }}
            className="mt-8 flex max-w-md items-center justify-between gap-4 rounded-[1.4rem] bg-elevated px-5 py-4 shadow-[var(--highlight)] ring-1 ring-line"
          >
            <div>
              <p className="font-medium">{visited ? "Claimed" : "Not claimed yet"}</p>
              <p className="text-[13px] text-ink-3">
                {visited ? (since ? `On your map since ${since}` : "On your map") : "Been here? Claim it."}
              </p>
            </div>
            <Switch on={visited} onChange={toggle} label={`Claim ${info.name}`} />
          </motion.div>
        </div>

        <motion.div
          className="lg:col-span-6"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: EASE_OUT_EXPO }}
        >
          <Panel innerClassName="bg-topo flex aspect-[4/3] items-center justify-center p-6 sm:p-10">
            <StateSilhouette code={stateCode} claimed={visited} draw width={480} height={360} className="h-full w-full" />
          </Panel>
        </motion.div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-8">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-3xl tracking-[-0.02em]">Journal</h2>
          <span className="font-mono text-[12px] text-ink-3 tabular">
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
