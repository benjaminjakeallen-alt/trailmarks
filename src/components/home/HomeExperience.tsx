"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import UsMap from "@/components/map/UsMap";
import { StatsDrawer, StatsPill } from "@/components/home/StatsDrawer";
import SelectedStateBar from "@/components/home/SelectedStateBar";
import { StateSheet } from "@/components/home/StateCard";
import JournalPanel, { type JournalOrigin } from "@/components/home/JournalPanel";
import { useFamily } from "@/components/family/FamilyProvider";
import { Panel } from "@/components/ui/Panel";
import { WordReveal } from "@/components/motion/Reveal";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { FamilyVisit } from "@/lib/types";

const barMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.35, ease: EASE_OUT_EXPO },
};

function Legend({ family }: { family: boolean }) {
  const chip = "flex items-center gap-1.5 rounded-full px-3 py-1";
  const dot = "h-2.5 w-2.5 rounded-full";
  if (!family) {
    return (
      <>
        <span className={`${chip} bg-aqua-soft`}>
          <span className={`${dot} bg-gradient-to-br from-aqua-bright to-petrol`} /> Claimed
        </span>
        <span className={`${chip} hidden bg-bg sm:flex`}>
          <span className={`${dot} bg-land ring-1 ring-line-strong`} /> Not yet
        </span>
      </>
    );
  }
  return (
    <>
      <span className={`${chip} bg-aqua-soft`}>
        <span className={`${dot} bg-gradient-to-br from-aqua-bright to-petrol`} /> You
      </span>
      <span className={`${chip} hidden bg-bg sm:flex`}>
        <span className={`${dot} bg-aqua-bright/45`} /> Family
      </span>
      <span className={`${chip} bg-sun-soft`}>
        <span className={`${dot} bg-gradient-to-br from-[#fff1b8] via-[#f5b929] to-[#b47a06]`} /> Everyone
      </span>
    </>
  );
}

export default function HomeExperience({ initialVisits }: { initialVisits: FamilyVisit[] }) {
  const { viewer, members } = useFamily();
  const me = viewer?.userId ?? "";
  const [visits, setVisits] = useState(initialVisits);
  const [selected, setSelected] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [journal, setJournal] = useState<{ code: string; origin: JournalOrigin | null } | null>(null);
  const openJournal = (code: string, origin: JournalOrigin) => setJournal({ code, origin });

  // Mine drives claiming; byState (member ids per state, in family order) drives the family view.
  const { mine, byState } = useMemo(() => {
    const order = new Map(members.map((m, i) => [m.userId, i]));
    const grouped: Record<string, string[]> = {};
    for (const v of visits) (grouped[v.stateCode] ??= []).push(v.userId);
    for (const ids of Object.values(grouped)) ids.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
    return { mine: new Set(visits.filter((v) => v.userId === me).map((v) => v.stateCode)), byState: grouped };
  }, [visits, members, me]);

  async function setClaimed(code: string, claim: boolean) {
    if (claim === mine.has(code)) return;
    const before = visits;
    setVisits(
      claim
        ? [...visits, { userId: me, stateCode: code, firstVisitedOn: new Date().toISOString().slice(0, 10) }]
        : visits.filter((v) => !(v.userId === me && v.stateCode === code)),
    );
    setSelected(code);

    const res = await fetch(`/api/states/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: claim, firstVisitedOn: claim ? new Date().toISOString().slice(0, 10) : null }),
    }).catch(() => null);

    if (!res?.ok) setVisits(before);
  }

  /** Writing a memory claims the state for its author on the server; mirror that here. */
  function markWritten(code: string) {
    if (mine.has(code)) return;
    setVisits((prev) => [...prev, { userId: me, stateCode: code, firstVisitedOn: new Date().toISOString().slice(0, 10) }]);
  }

  /** The switch in the state bar/sheet: the keyboard- and screen-reader-friendly way to undo. */
  const toggle = (code: string) => setClaimed(code, !mine.has(code));

  const mineList = Array.from(mine);
  const isFamily = members.length > 1;

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
                {!statsOpen && <StatsPill visitedCodes={mineList} onOpen={() => setStatsOpen(true)} />}
              </div>

              <div className="hidden min-w-0 flex-1 lg:block">
                <AnimatePresence mode="wait" initial={false}>
                  {selected ? (
                    <motion.div key={selected} {...barMotion}>
                      <SelectedStateBar
                        code={selected}
                        claimed={mine.has(selected)}
                        visitorIds={byState[selected] ?? []}
                        onToggle={toggle}
                        onOpenJournal={openJournal}
                        onClose={() => setSelected(null)}
                      />
                    </motion.div>
                  ) : (
                    <motion.p key="hint" {...barMotion} className="text-[14px] text-ink-3">
                      Tap a state to claim it. Press and hold to unclaim.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div
                className={`ml-auto items-center gap-2 text-[13px] font-medium text-ink-2 ${
                  selected ? "flex lg:hidden" : "flex"
                }`}
              >
                <Legend family={isFamily} />
              </div>
            </div>

            <div className="px-2 pb-3 pt-3 sm:px-6 sm:pb-6 sm:pt-5 lg:px-10">
              {/* Sized so the whole map fits above the fold on a laptop. */}
              <div className="mx-auto w-full" style={{ maxWidth: "max(560px, calc((100dvh - 19rem) * 1.6))" }}>
                <UsMap
                  visited={mine}
                  family={byState}
                  members={members}
                  viewerId={me}
                  selectedCode={selected}
                  onClaim={(code) => setClaimed(code, true)}
                  onUnclaim={(code) => setClaimed(code, false)}
                  onSelect={setSelected}
                />
              </div>
              <p className="mt-2 text-center text-[13px] text-ink-3 lg:hidden">
                Tap a state to claim it. Press and hold to unclaim.
              </p>
            </div>

            <StatsDrawer
              open={statsOpen}
              visitedCodes={mineList}
              family={byState}
              onClose={() => setStatsOpen(false)}
            />
          </Panel>
        </motion.div>
      </section>

      <StateSheet
        code={journal ? null : selected}
        claimed={selected ? mine.has(selected) : false}
        visitorIds={selected ? (byState[selected] ?? []) : []}
        onToggle={toggle}
        onOpenJournal={openJournal}
        onClose={() => setSelected(null)}
      />

      <JournalPanel
        code={journal?.code ?? null}
        origin={journal?.origin ?? null}
        claimed={journal ? mine.has(journal.code) : false}
        visitorIds={journal ? (byState[journal.code] ?? []) : []}
        onClose={() => setJournal(null)}
        onWrote={markWritten}
      />
    </>
  );
}
