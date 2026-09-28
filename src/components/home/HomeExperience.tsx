"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRightIcon, ImagesIcon } from "@phosphor-icons/react";
import UsMap from "@/components/map/UsMap";
import StatsPanel from "@/components/home/StatsPanel";
import { StateCardBody, StateSheet } from "@/components/home/StateCard";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow, Panel } from "@/components/ui/Panel";
import { WordReveal } from "@/components/motion/Reveal";
import { EASE_OUT_EXPO } from "@/lib/motion";

export default function HomeExperience({ initialVisited }: { initialVisited: string[] }) {
  const [visited, setVisited] = useState<Set<string>>(() => new Set(initialVisited));
  const [selected, setSelected] = useState<string | null>(null);

  async function toggle(code: string) {
    const claim = !visited.has(code);
    const apply = (on: boolean) =>
      setVisited((prev) => {
        const next = new Set(prev);
        if (on) next.add(code);
        else next.delete(code);
        return next;
      });

    apply(claim);
    setSelected(code);

    const res = await fetch(`/api/states/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: claim, firstVisitedOn: claim ? new Date().toISOString().slice(0, 10) : null }),
    }).catch(() => null);

    if (!res?.ok) apply(!claim);
  }

  const visitedList = Array.from(visited);

  return (
    <>
      <section className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-4 pb-14 pt-8 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:pb-20 lg:pt-16">
        <div className="lg:col-span-7 lg:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          >
            <Eyebrow>
              <span className="h-1.5 w-1.5 rounded-full bg-ember" /> Your field journal
            </Eyebrow>
          </motion.div>

          <WordReveal
            text={"Every state,\nremembered."}
            delay={0.1}
            className="mt-6 font-display text-[clamp(3.1rem,8.2vw,7rem)] font-light leading-[0.92] tracking-[-0.045em] [&>span:last-child]:italic [&>span:last-child]:text-ink-2"
          />

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.55 }}
            className="mt-7 max-w-[44ch] text-[17px] leading-[1.65] text-ink-2"
          >
            Claim the states you&apos;ve stood in. Record a trip and Trailmarks draws the route,
            fills in the map on its own, and turns your photos into a story you can replay.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.7 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <ButtonLink href="/trips/new" trailingIcon={<ArrowUpRightIcon size={15} />}>
              Start a trip
            </ButtonLink>
            <ButtonLink href="/memories" variant="secondary" icon={<ImagesIcon size={17} />}>
              Replay memories
            </ButtonLink>
          </motion.div>
        </div>

        <motion.div
          className="hidden lg:col-span-5 lg:block"
          initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.35 }}
        >
          <Panel className="h-full">
            <StatsPanel visitedCodes={visitedList} />
          </Panel>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 pb-6 sm:px-8 lg:pb-8">
        <Panel innerClassName="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="bg-topo relative p-3 sm:p-8 lg:p-10">
              <div className="mb-2 flex items-center justify-between px-2 sm:mb-6 sm:px-0">
                <Eyebrow>The map</Eyebrow>
                <p className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 sm:block">
                  Tap to claim · tap again to undo
                </p>
              </div>
              <UsMap visited={visited} selectedCode={selected} onStateTap={toggle} />
            </div>

            <aside className="hidden border-l border-line p-7 lg:block">
              <StateCardBody code={selected} claimed={selected ? visited.has(selected) : false} onToggle={toggle} />
            </aside>
          </div>
        </Panel>
      </section>

      {/* On phones the map comes first; the stats follow it. */}
      <section className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-8 lg:hidden">
        <Panel>
          <StatsPanel visitedCodes={visitedList} />
        </Panel>
      </section>

      <StateSheet
        code={selected}
        claimed={selected ? visited.has(selected) : false}
        onToggle={toggle}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
