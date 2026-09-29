"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import UsMap from "@/components/map/UsMap";
import { StatsDrawer, StatsPill } from "@/components/home/StatsDrawer";
import SelectedStateBar from "@/components/home/SelectedStateBar";
import { StateSheet } from "@/components/home/StateCard";
import { Panel } from "@/components/ui/Panel";
import { WordReveal } from "@/components/motion/Reveal";
import { EASE_OUT_EXPO } from "@/lib/motion";

const barMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.35, ease: EASE_OUT_EXPO },
};

export default function HomeExperience({
  initialVisited,
}: {
  initialVisited: string[];
}) {
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set(initialVisited),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

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
      body: JSON.stringify({
        visited: claim,
        firstVisitedOn: claim ? new Date().toISOString().slice(0, 10) : null,
      }),
    }).catch(() => null);

    if (!res?.ok) apply(!claim);
  }

  const visitedList = Array.from(visited);

  return (
    <>
      {/* You land on the map: a one-line headline, then the map. Stats live in a pill that expands into a drawer. */}
      <section className="mx-auto max-w-[1400px] px-3 pt-2 sm:px-8 sm:pt-3">
        <WordReveal
          text="Every Memory, Remembered"
          className="mb-4 px-1 font-display text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1] tracking-[-0.035em] sm:mb-5 [&>span>span:last-child]:text-petrol"
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.2 }}
        >
          <Panel innerClassName="relative overflow-hidden">
            <div className="flex min-h-[76px] items-center gap-4 border-b border-line px-3 py-3 sm:px-6">
              {/* Holds the pill's footprint while it is expanded, so the bar never jumps. */}
              <div className="w-[176px] shrink-0">
                {!statsOpen && (
                  <StatsPill
                    visitedCodes={visitedList}
                    onOpen={() => setStatsOpen(true)}
                  />
                )}
              </div>

              <div className="hidden min-w-0 flex-1 lg:block">
                <AnimatePresence mode="wait" initial={false}>
                  {selected ? (
                    <motion.div key={selected} {...barMotion}>
                      <SelectedStateBar
                        code={selected}
                        claimed={visited.has(selected)}
                        onToggle={toggle}
                        onClose={() => setSelected(null)}
                      />
                    </motion.div>
                  ) : (
                    <motion.p
                      key="hint"
                      {...barMotion}
                      className="text-[14px] text-ink-3"
                    >
                      Tap a state to claim it. Tap again to undo.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div
                className={`ml-auto items-center gap-2 text-[13px] font-medium text-ink-2 ${selected ? "flex lg:hidden" : "flex"}`}
              >
                <span className="flex items-center gap-1.5 rounded-full bg-aqua-soft px-3 py-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-aqua-bright to-petrol" />{" "}
                  Claimed
                </span>
                <span className="hidden items-center gap-1.5 rounded-full bg-bg px-3 py-1 sm:flex">
                  <span className="h-2.5 w-2.5 rounded-full bg-land ring-1 ring-line-strong" />{" "}
                  Not yet
                </span>
              </div>
            </div>

            <div className="px-2 pb-3 pt-3 sm:px-6 sm:pb-6 sm:pt-5 lg:px-10">
              {/* Sized so the whole map fits above the fold on a laptop. */}
              <div
                className="mx-auto w-full"
                style={{ maxWidth: "max(560px, calc((100dvh - 19rem) * 1.6))" }}
              >
                <UsMap
                  visited={visited}
                  selectedCode={selected}
                  onStateTap={toggle}
                />
              </div>
              <p className="mt-2 text-center text-[13px] text-ink-3 lg:hidden">
                Tap a state to claim it. Tap again to undo.
              </p>
            </div>

            <StatsDrawer
              open={statsOpen}
              visitedCodes={visitedList}
              onClose={() => setStatsOpen(false)}
            />
          </Panel>
        </motion.div>
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
