"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretLeftIcon, CaretRightIcon, ChartBarIcon } from "@phosphor-icons/react";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import Avatar from "@/components/family/Avatar";
import { useFamily } from "@/components/family/FamilyProvider";
import { STATES, STATE_COUNT, STATES_BY_CODE, totalAreaSqMi, type Region } from "@/lib/statesData";
import { EASE_OUT_EXPO } from "@/lib/motion";

const US_LAND_SQ_MI = 3_531_905;
const REGIONS: Region[] = ["West", "Midwest", "South", "Northeast"];
const REGION_TOTALS = Object.fromEntries(
  REGIONS.map((r) => [r, STATES.filter((s) => s.region === r && s.code !== "DC").length]),
) as Record<Region, number>;

/** Shared by the pill and the drawer, so the pill physically grows into the drawer. */
const LAYOUT_ID = "map-stats";
const MORPH = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const;

function claimedOnly(codes: string[]) {
  return codes.filter((c) => c !== "DC");
}

/** Collapsed: a pill on the map. Tapping it expands into the drawer. */
export function StatsPill({ visitedCodes, onOpen }: { visitedCodes: string[]; onOpen: () => void }) {
  const count = claimedOnly(visitedCodes).length;
  return (
    <motion.button
      type="button"
      layoutId={LAYOUT_ID}
      transition={MORPH}
      onClick={onOpen}
      aria-label={`${count} of ${STATE_COUNT} states claimed. Show your stats`}
      aria-expanded={false}
      style={{ borderRadius: 999 }}
      className="group flex h-11 shrink-0 items-center gap-2.5 bg-petrol pl-2 pr-3 text-white shadow-[0_12px_24px_-14px_var(--petrol)]"
    >
      <motion.span layout="position" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
        <ChartBarIcon size={15} weight="bold" />
      </motion.span>
      <motion.span layout="position" className="flex items-baseline gap-1">
        <span className="font-display text-[1.2rem] leading-none">{count}</span>
        <span className="text-[13px] font-medium text-white/70">/ {STATE_COUNT} states</span>
      </motion.span>
      <CaretRightIcon size={14} weight="bold" className="text-white/70 transition-transform group-hover:translate-x-0.5" />
    </motion.button>
  );
}

/** Expanded: a card over the left third of the map (most of the width on phones). */
export function StatsDrawer({
  open,
  visitedCodes,
  family,
  onClose,
}: {
  open: boolean;
  visitedCodes: string[];
  /** Member ids per state, for the family ranking. */
  family: Record<string, string[]>;
  onClose: () => void;
}) {
  const { viewer, members } = useFamily();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // The family ranking: members by how many states they've claimed.
  const isFamily = members.length > 1;
  const familyRanking = members
    .map((m) => ({
      member: m,
      count: Object.entries(family).filter(([code, ids]) => code !== "DC" && ids.includes(m.userId)).length,
    }))
    .sort((a, b) => b.count - a.count);
  const everyoneCount = isFamily
    ? Object.entries(family).filter(([code, ids]) => code !== "DC" && members.every((m) => ids.includes(m.userId)))
        .length
    : 0;

  const claimed = claimedOnly(visitedCodes);
  const count = claimed.length;
  const landPct = (totalAreaSqMi(claimed) / US_LAND_SQ_MI) * 100;
  // The ranking: regions ordered by how much of each you've claimed.
  const ranking = REGIONS.map((region) => {
    const got = claimed.filter((c) => STATES_BY_CODE[c]?.region === region).length;
    const total = REGION_TOTALS[region];
    return { region, got, total, pct: total ? got / total : 0 };
  }).sort((a, b) => b.pct - a.pct || b.got - a.got);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px] lg:absolute lg:z-20 lg:bg-ink/10"
            aria-hidden
          />
          <motion.aside
            key="drawer"
            layoutId={LAYOUT_ID}
            transition={MORPH}
            style={{ borderRadius: 28 }}
            role="dialog"
            aria-label="Your stats"
            className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex max-h-[calc(100dvh-1.5rem)] w-[min(86vw,380px)] flex-col overflow-hidden bg-elevated shadow-[var(--shadow-float)] ring-1 ring-line lg:absolute lg:left-3 lg:top-3 lg:z-30 lg:max-h-[calc(100%-1.5rem)] lg:w-[max(340px,33%)]"
          >
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_OUT_EXPO, delay: 0.18 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="flex flex-col gap-6 overflow-y-auto p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[14px] font-medium text-ink-3">States claimed</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <AnimatedNumber
                      value={count}
                      pad={2}
                      className="font-display text-[4.5rem] leading-[0.85] tracking-[-0.05em] text-petrol"
                    />
                    <span className="text-xl font-medium text-ink-3">/ {STATE_COUNT}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Collapse stats"
                  className="-mr-2 -mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-bg text-ink-2 transition-colors hover:text-ink"
                >
                  <CaretLeftIcon size={16} weight="bold" />
                </button>
              </div>

              {/* Passport strip: one tick per state. */}
              <div className="flex h-7 items-end gap-[3px]" aria-hidden>
                {Array.from({ length: STATE_COUNT }, (_, i) => {
                  const on = i < count;
                  return (
                    <motion.span
                      key={i}
                      className={`h-full flex-1 origin-bottom rounded-full ${
                        on ? "bg-gradient-to-t from-petrol to-aqua-bright" : "bg-land"
                      }`}
                      initial={{ scaleY: 0.42 }}
                      animate={{ scaleY: on ? 1 : 0.42 }}
                      transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.25 + (on ? i * 0.012 : 0) }}
                    />
                  );
                })}
              </div>

              <div>
                <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-petrol">Region ranking</p>
                <ol className="space-y-3.5">
                  {ranking.map(({ region, got, total, pct }, i) => (
                    <li key={region} className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold ${
                          i === 0 ? "bg-sun text-white" : "bg-bg text-ink-2"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between text-[14px]">
                          <span className="font-medium text-ink">{region}</span>
                          <span className="text-[13px] text-ink-3 tabular">
                            {got}/{total}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-land">
                          <motion.div
                            className="h-full origin-left rounded-full bg-gradient-to-r from-petrol to-aqua"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: pct }}
                            transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.3 + i * 0.06 }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {isFamily && (
                <div>
                  <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-petrol">
                    Family ranking
                  </p>
                  <ol className="space-y-2.5">
                    {familyRanking.map(({ member, count: n }, i) => (
                      <li key={member.userId} className="flex items-center gap-3">
                        <span className="w-4 text-center text-[13px] font-semibold text-ink-3 tabular">{i + 1}</span>
                        <Avatar member={member} size={30} />
                        <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">
                          {member.userId === viewer?.userId ? `${member.displayName} (you)` : member.displayName}
                        </span>
                        <span className="font-display text-[1.15rem] text-ink tabular">{n}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-sun-soft px-4 py-3">
                    <span className="flex items-center gap-2 text-[14px] font-medium text-ink-2">
                      <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#fff1b8] via-[#f5b929] to-[#b47a06]" />
                      Everyone&apos;s been
                    </span>
                    <span className="font-display text-[1.35rem] text-[#8a5a04] dark:text-sun">
                      <AnimatedNumber value={everyoneCount} />
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-baseline justify-between rounded-2xl bg-aqua-soft px-4 py-3">
                <span className="text-[14px] font-medium text-ink-2">U.S. land explored</span>
                <span className="font-display text-[1.6rem] text-petrol">
                  <AnimatedNumber value={landPct} decimals={1} />%
                </span>
              </div>
            </motion.div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
