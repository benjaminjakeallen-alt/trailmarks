"use client";

import { motion } from "framer-motion";
import { STATE_COUNT, STATES_BY_CODE, totalAreaSqMi, type Region } from "@/lib/statesData";

const NORTH_AMERICA_LAND_AREA_SQ_MI = 3_531_905; // contiguous 50 states + DC land area

const REGIONS: Region[] = ["Northeast", "Midwest", "South", "West"];

interface StatsBarProps {
  visitedCodes: string[];
}

export default function StatsBar({ visitedCodes }: StatsBarProps) {
  const visited = visitedCodes.filter((c) => c !== "DC");
  const pctStates = Math.round((visited.length / STATE_COUNT) * 100);
  const areaCovered = totalAreaSqMi(visited);
  const pctArea = Math.min(100, Math.round((areaCovered / NORTH_AMERICA_LAND_AREA_SQ_MI) * 100));
  const regionsCovered = REGIONS.filter((region) =>
    visited.some((code) => STATES_BY_CODE[code]?.region === region),
  ).length;

  const stats = [
    { label: "States visited", value: `${visited.length}`, sub: `of ${STATE_COUNT}`, pct: pctStates },
    { label: "Land explored", value: `${pctArea}%`, sub: "by area", pct: pctArea },
    { label: "Regions reached", value: `${regionsCovered}`, sub: "of 4", pct: (regionsCovered / 4) * 100 },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
        >
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-semibold text-foreground">
              {stat.value}
            </span>
            <span className="text-sm text-foreground-muted">{stat.sub}</span>
          </div>
          <p className="mt-0.5 text-sm text-foreground-muted">{stat.label}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, stat.pct)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
