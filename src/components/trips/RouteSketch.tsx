"use client";

import { useId, useMemo } from "react";
import { motion } from "framer-motion";

interface LatLng {
  lat: number;
  lng: number;
}

const DEMO_ROUTE: LatLng[] = [
  { lat: 36.16, lng: -86.78 },
  { lat: 35.96, lng: -83.92 },
  { lat: 35.71, lng: -83.51 },
  { lat: 35.6, lng: -82.55 },
  { lat: 36.1, lng: -81.7 },
  { lat: 37.27, lng: -79.94 },
  { lat: 38.03, lng: -78.48 },
];

/** Equirectangular fit with cos(lat) correction — plenty accurate at trip scale. */
function project(points: LatLng[], width: number, height: number, pad: number) {
  const meanLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const k = Math.cos((meanLat * Math.PI) / 180);
  const xs = points.map((p) => p.lng * k);
  const ys = points.map((p) => -p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  // Rounded so server and browser math (which can differ in the last ulp) hydrate identically.
  const r = (n: number) => Math.round(n * 10) / 10;
  return xs.map((x, i) => [r(offX + (x - minX) * scale), r(offY + (ys[i] - minY) * scale)] as const);
}

/** Catmull-Rom → cubic Bézier, so sparse GPS points still read as a road. */
function smoothPath(pts: ReadonlyArray<readonly [number, number]>) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export default function RouteSketch({
  points,
  live = false,
  demo = false,
  onPhoto = false,
  className,
}: {
  points: LatLng[];
  live?: boolean;
  demo?: boolean;
  /** White route for photos and the brand gradient, like a trail drawn over the landscape. */
  onPhoto?: boolean;
  className?: string;
}) {
  const W = 400;
  const H = 260;
  const rawId = useId();
  const gradId = `route-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const source = demo || points.length < 2 ? DEMO_ROUTE : points;
  const isPlaceholder = !demo && points.length < 2;

  const { d, start, end } = useMemo(() => {
    const pts = project(source, W, H, 34);
    return { d: smoothPath(pts), start: pts[0], end: pts[pts.length - 1] };
  }, [source]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      // On photos the whole route must stay inside its band so it never runs under the title.
      preserveAspectRatio={onPhoto ? "xMidYMid meet" : "xMidYMid slice"}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]}>
          <stop offset="0" style={{ stopColor: onPhoto ? "#ffffff" : "var(--aqua)" }} />
          <stop offset="1" style={{ stopColor: onPhoto ? "#ffffff" : "var(--petrol)" }} />
        </linearGradient>
      </defs>

      {isPlaceholder ? (
        <path
          d={d}
          fill="none"
          stroke={onPhoto ? "#ffffff" : "var(--ink-3)"}
          strokeOpacity={onPhoto ? 0.55 : 0.5}
          strokeWidth={2.5}
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d={d}
            fill="none"
            stroke={onPhoto ? "rgb(0 0 0 / 0.2)" : "var(--bg-elevated)"}
            strokeWidth={onPhoto ? 7 : 9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <motion.path
            d={d}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1] }}
          />
          {onPhoto ? (
            <>
              <circle cx={start[0]} cy={start[1]} r={11} fill="rgb(255 255 255 / 0.22)" />
              <circle cx={start[0]} cy={start[1]} r={5} fill="#ffffff" />
            </>
          ) : (
            <circle cx={start[0]} cy={start[1]} r={5} fill="var(--bg-elevated)" stroke="var(--aqua)" strokeWidth={2.5} />
          )}
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.6, type: "spring", stiffness: 400, damping: 18 }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            {live && <circle cx={end[0]} cy={end[1]} r={7} fill="var(--coral)" className="record-pulse state-path" />}
            <circle
              cx={end[0]}
              cy={end[1]}
              r={7}
              fill={live ? "var(--coral)" : onPhoto ? "var(--sun)" : "var(--petrol)"}
              stroke={onPhoto ? "#ffffff" : "var(--bg-elevated)"}
              strokeWidth={3}
            />
          </motion.g>
        </>
      )}
    </svg>
  );
}
