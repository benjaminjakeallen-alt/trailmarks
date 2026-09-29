"use client";

import { motion } from "framer-motion";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { STATES, STATE_COUNT, STATES_BY_CODE, totalAreaSqMi, type Region } from "@/lib/statesData";
import { EASE_OUT_EXPO } from "@/lib/motion";

const US_LAND_SQ_MI = 3_531_905;
const REGIONS: Region[] = ["West", "Midwest", "South", "Northeast"];
const REGION_TOTALS = Object.fromEntries(
  REGIONS.map((r) => [r, STATES.filter((s) => s.region === r && s.code !== "DC").length]),
) as Record<Region, number>;

export default function StatsPanel({ visitedCodes, bare = false }: { visitedCodes: string[]; bare?: boolean }) {
  const claimed = visitedCodes.filter((c) => c !== "DC");
  const count = claimed.length;
  const landPct = (totalAreaSqMi(claimed) / US_LAND_SQ_MI) * 100;

  return (
    <div className={`flex h-full flex-col gap-7 ${bare ? "" : "p-6 sm:p-7"}`}>
      <div>
        <p className="text-[14px] font-medium text-ink-3">States claimed</p>
        <div className="mt-1 flex items-baseline gap-2">
          <AnimatedNumber
            value={count}
            pad={2}
            className="font-display text-[5rem] leading-[0.85] tracking-[-0.05em] text-petrol"
          />
          <span className="text-xl font-medium text-ink-3">/ {STATE_COUNT}</span>
        </div>

        {/* Passport strip — one tick per state. */}
        <div className="mt-5 flex h-7 items-end gap-[3px]" aria-hidden>
          {Array.from({ length: STATE_COUNT }, (_, i) => {
            const on = i < count;
            return (
              <motion.span
                key={i}
                className={`h-full flex-1 origin-bottom rounded-full transition-colors duration-500 ${
                  on ? "bg-gradient-to-t from-petrol to-aqua-bright" : "bg-land"
                }`}
                initial={{ scaleY: 0.42 }}
                animate={{ scaleY: on ? 1 : 0.42 }}
                transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: on ? i * 0.012 : 0 }}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {REGIONS.map((region) => {
          const got = claimed.filter((c) => STATES_BY_CODE[c]?.region === region).length;
          const total = REGION_TOTALS[region];
          return (
            <div key={region}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-ink-2">{region}</span>
                <span className="text-[13px] text-ink-3 tabular">
                  {got}/{total}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-land">
                <motion.div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-petrol to-aqua"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: total ? got / total : 0 }}
                  transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-[14px] font-medium text-ink-2">U.S. land explored</span>
        <span className="font-display text-[1.75rem] text-petrol">
          <AnimatedNumber value={landPct} decimals={1} />
          <span className="text-ink-3">%</span>
        </span>
      </div>
    </div>
  );
}
