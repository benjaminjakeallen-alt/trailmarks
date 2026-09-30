"use client";

import { useId, useMemo } from "react";
import { motion } from "framer-motion";
import { stateSilhouette } from "@/lib/usGeo";
import { EASE_OUT_EXPO, SPRING_STAMP } from "@/lib/motion";

/**
 * A single state's outline. With `draw`, the border traces itself in on
 * mount before the fill settles — used as the state page's hero moment.
 */
export default function StateSilhouette({
  code,
  claimed,
  width = 320,
  height = 240,
  draw = false,
  onPhoto = false,
  gold = false,
  className,
}: {
  code: string;
  claimed: boolean;
  width?: number;
  height?: number;
  draw?: boolean;
  /** White outline and translucent land, for sitting on a photo or the brand gradient. */
  onPhoto?: boolean;
  /** The whole family has been: gold instead of aqua. */
  gold?: boolean;
  className?: string;
}) {
  const rawId = useId();
  const gradId = `sil-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const d = useMemo(() => stateSilhouette(code, width, height, 10), [code, width, height]);
  if (!d) return null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          {gold ? (
            <>
              <stop offset="0" stopColor="#a87306" />
              <stop offset="0.45" stopColor="#f2b624" />
              <stop offset="0.6" stopColor="#fff4c4" />
              <stop offset="1" stopColor="#c68a09" />
            </>
          ) : (
            <>
              <stop offset="0" style={{ stopColor: onPhoto ? "var(--aqua-bright)" : "var(--petrol)" }} />
              <stop offset="1" style={{ stopColor: onPhoto ? "var(--aqua)" : "var(--aqua-bright)" }} />
            </>
          )}
        </linearGradient>
      </defs>

      <motion.path
        d={d}
        fill={onPhoto ? "rgb(255 255 255 / 0.14)" : "var(--land)"}
        initial={{ opacity: draw ? 0 : 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: draw ? 1.1 : 0 }}
      />
      <motion.path
        d={d}
        className="state-path"
        fill={`url(#${gradId})`}
        initial={false}
        animate={{ opacity: claimed ? (onPhoto ? 0.85 : 1) : 0, scale: claimed ? 1 : 0.92 }}
        transition={{ scale: SPRING_STAMP, opacity: { duration: 0.25, delay: draw ? 1.2 : 0 } }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={onPhoto ? "#ffffff" : "var(--ink)"}
        strokeWidth={onPhoto ? 2 : 1.2}
        strokeLinejoin="round"
        strokeOpacity={onPhoto ? 0.95 : 0.55}
        initial={{ pathLength: draw ? 0 : 1 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}
