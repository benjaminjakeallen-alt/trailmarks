"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { geoArea, geoCentroid, geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { GeometryObject, Topology } from "topojson-specification";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import Campfire from "@/components/family/Campfire";
import { Cheer, HoldRing, LONG_PRESS_MS, PRESS_SLOP_PX } from "@/components/map/UsMap";
import { COUNTRIES, COUNTRIES_BY_CODE, type ContinentCode } from "@/lib/countriesData";
import { HAPTICS, SPRING_STAMP, haptic } from "@/lib/motion";
import type { Member } from "@/lib/types";

/**
 * The world, as a globe. Drag to spin it, pick a continent and it turns to
 * face you, tap a country to claim it, hold to unclaim. Same colors as the
 * US map: aqua for you, pale aqua for family, gold when everyone has been.
 */

const W = 800;
const H = 600;
const R = 270;

export const CONTINENTS: { key: "WORLD" | ContinentCode; label: string; lon: number; lat: number; zoom: number }[] = [
  { key: "WORLD", label: "World", lon: -40, lat: 20, zoom: 1 },
  { key: "NA", label: "North America", lon: -98, lat: 38, zoom: 1.7 },
  { key: "SA", label: "South America", lon: -60, lat: -18, zoom: 1.75 },
  { key: "EU", label: "Europe", lon: 14, lat: 51, zoom: 2.9 },
  { key: "AF", label: "Africa", lon: 19, lat: 3, zoom: 1.75 },
  { key: "AS", label: "Asia", lon: 92, lat: 32, zoom: 1.55 },
  { key: "OC", label: "Oceania", lon: 150, lat: -22, zoom: 2 },
];

type View = { lon: number; lat: number; zoom: number };
type Shape = { code: string; feature: Feature<Geometry> };

let shapesCache: Shape[] | null = null;

/**
 * d3 reads ring order as "which side is inside" on a sphere; the simplifier
 * can flip it, turning a country into everything-but-the-country. A shape
 * covering more than half the globe is inside out, so flip its rings back.
 */
function rewind(f: Feature<Geometry>): Feature<Geometry> {
  const g = f.geometry;
  if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) return f;
  const polys: Position[][][] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  const fixed = polys.map((rings) => {
    const poly = { type: "Polygon" as const, coordinates: rings };
    return geoArea(poly) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
  });
  return {
    ...f,
    geometry: g.type === "Polygon" ? { type: "Polygon", coordinates: fixed[0] } : { type: "MultiPolygon", coordinates: fixed },
  };
}
async function loadShapes(): Promise<Shape[]> {
  if (shapesCache) return shapesCache;
  const topo = (await import("@/data/world-countries.json")).default as unknown as Topology;
  const fc = feature(topo, topo.objects.countries as GeometryObject) as FeatureCollection<Geometry>;
  shapesCache = fc.features.map((f) => ({ code: String(f.id), feature: rewind(f) }));
  return shapesCache;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export default function WorldGlobe({
  visited,
  family,
  members,
  viewerId,
  selectedCode,
  onClaim,
  onUnclaim,
  onSelect,
}: {
  visited: Set<string>;
  family: Record<string, string[]>;
  members: Member[];
  viewerId: string;
  selectedCode: string | null;
  onClaim: (code: string) => void;
  onUnclaim: (code: string) => void;
  onSelect: (code: string | null) => void;
}) {
  const reduce = useReducedMotion();
  const [shapes, setShapes] = useState<Shape[] | null>(shapesCache);
  const [view, setView] = useState<View>({ lon: CONTINENTS[1].lon, lat: CONTINENTS[1].lat, zoom: 1.15 });
  const [continent, setContinent] = useState<string>("WORLD");
  const [hold, setHold] = useState<{ code: string; x: number; y: number } | null>(null);
  const [cheer, setCheer] = useState<{ id: number; x: number; y: number } | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; gold: boolean }[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const spin = useRef<{ stop: () => void } | null>(null);
  const press = useRef<{
    x: number;
    y: number;
    view: View;
    moved: boolean;
    code: string | null;
    timer: number | null;
    held: boolean;
  } | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!shapes) loadShapes().then(setShapes);
  }, [shapes]);

  const isFamily = members.length > 1;
  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.userId, m])), [members]);
  const everyone = (code: string) => isFamily && members.every((m) => family[code]?.includes(m.userId));

  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([W / 2, H / 2])
        .scale(R * view.zoom)
        .rotate([-view.lon, -view.lat])
        .clipAngle(90)
        .precision(0.6),
    [view],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => geoGraticule10(), []);
  const centroids = useMemo(
    () => Object.fromEntries((shapes ?? []).map((s) => [s.code, s.code in COUNTRIES_BY_CODE ? COUNTRIES_BY_CODE[s.code].latlng : null])),
    [shapes],
  );

  function flyTo(target: View) {
    spin.current?.stop();
    const from = viewRef.current;
    const dLon = ((target.lon - from.lon + 540) % 360) - 180;
    if (reduce) {
      setView(target);
      return;
    }
    spin.current = animate(0, 1, {
      duration: 1.25,
      ease: easeInOut,
      onUpdate: (t) =>
        setView({
          lon: from.lon + dLon * t,
          lat: from.lat + (target.lat - from.lat) * t,
          // Pull back a little mid-flight, like a camera, then settle in.
          zoom: from.zoom + (target.zoom - from.zoom) * t - Math.sin(Math.PI * t) * 0.18 * Math.min(from.zoom, target.zoom),
        }),
    });
  }

  // Phones: the country sheet covers the lower half, so turn the selected country up into view.
  useEffect(() => {
    const info = selectedCode ? COUNTRIES_BY_CODE[selectedCode] : null;
    if (!info || window.innerWidth >= 1024) return;
    const zoom = Math.max(viewRef.current.zoom, 1.6);
    const lift = (Math.asin(Math.min(1, (0.2 * H) / (R * zoom))) * 180) / Math.PI;
    flyTo({ lon: info.latlng[1], lat: Math.max(-70, Math.min(75, info.latlng[0] - lift)), zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCode]);

  function pickContinent(key: string) {
    const c = CONTINENTS.find((x) => x.key === key)!;
    setContinent(key);
    haptic(HAPTICS.select);
    flyTo({ lon: c.lon, lat: c.lat, zoom: c.zoom });
  }

  function focusCountry(code: string) {
    const info = COUNTRIES_BY_CODE[code];
    if (!info) return;
    setQuery("");
    setSearching(false);
    onSelect(code);
    const zoom = Math.max(viewRef.current.zoom, 2.4);
    flyTo({ lon: info.latlng[1], lat: info.latlng[0], zoom });
  }

  function svgPoint(clientX: number, clientY: number) {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }
  function wrapPoint(clientX: number, clientY: number) {
    const r = wrapRef.current?.getBoundingClientRect();
    return r ? { x: clientX - r.left, y: clientY - r.top } : { x: 0, y: 0 };
  }
  const codeAt = (clientX: number, clientY: number) =>
    (document.elementFromPoint(clientX, clientY) as Element | null)?.closest("[data-country]")?.getAttribute("data-country") ?? null;

  function claim(code: string, clientX: number, clientY: number) {
    if (visited.has(code)) {
      haptic(HAPTICS.select);
      onSelect(code);
      return;
    }
    const gold = isFamily && members.every((m) => m.userId === viewerId || family[code]?.includes(m.userId));
    const id = ++seq.current;
    setRipples((r) => [...r, { id, ...svgPoint(clientX, clientY), gold }]);
    window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 1100);
    if (gold) {
      setCheer({ id, ...wrapPoint(clientX, clientY) });
      window.setTimeout(() => setCheer((c) => (c?.id === id ? null : c)), 2000);
    }
    haptic(gold ? HAPTICS.everyone : HAPTICS.claim);
    onClaim(code);
    onSelect(code);
  }

  function endPress() {
    if (press.current?.timer) window.clearTimeout(press.current.timer);
    press.current = null;
    setHold(null);
  }

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      spin.current?.stop();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      const code = codeAt(e.clientX, e.clientY);
      const p = { x: e.clientX, y: e.clientY, view: viewRef.current, moved: false, code, timer: null as number | null, held: false };
      if (code && visited.has(code) && code !== "US") {
        const at = wrapPoint(e.clientX, e.clientY);
        p.timer = window.setTimeout(() => {
          if (!press.current || press.current.moved) return;
          press.current.held = true;
          setHold(null);
          haptic(HAPTICS.unclaim);
          onUnclaim(code);
        }, LONG_PRESS_MS);
        window.setTimeout(() => press.current === p && !p.moved && setHold({ code, ...at }), 120);
      }
      press.current = p;
    },
    onPointerMove: (e: React.PointerEvent) => {
      const p = press.current;
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.moved && Math.hypot(dx, dy) > PRESS_SLOP_PX) {
        p.moved = true;
        if (p.timer) window.clearTimeout(p.timer);
        setHold(null);
      }
      if (p.moved) {
        const rect = svgRef.current!.getBoundingClientRect();
        const perPx = (180 / Math.PI / (R * p.view.zoom)) * (W / rect.width);
        setView({
          zoom: p.view.zoom,
          lon: p.view.lon - dx * perPx,
          lat: Math.max(-70, Math.min(75, p.view.lat + dy * perPx)),
        });
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      const p = press.current;
      if (p && !p.moved && !p.held) {
        if (p.code) claim(p.code, e.clientX, e.clientY);
        else onSelect(null);
      }
      endPress();
    },
    onPointerCancel: endPress,
    onWheel: (e: React.WheelEvent) => {
      spin.current?.stop();
      setView((v) => ({ ...v, zoom: Math.max(0.9, Math.min(8, v.zoom * (e.deltaY < 0 ? 1.1 : 0.91))) }));
    },
  };

  // Where the selected country's campfire goes, if it's on this side of the globe.
  const selectedPoint = (() => {
    const ll = selectedCode ? centroids[selectedCode] : null;
    const shape = selectedCode ? shapes?.find((s) => s.code === selectedCode) : null;
    const lonlat: [number, number] | null = ll ? [ll[1], ll[0]] : shape ? (geoCentroid(shape.feature) as [number, number]) : null;
    if (!lonlat) return null;
    if (geoDistance(lonlat, [view.lon, view.lat]) > Math.PI / 2 - 0.08) return null;
    const xy = projection(lonlat);
    return xy ? { x: xy[0], y: xy[1] } : null;
  })();
  const campers = selectedCode ? (family[selectedCode] ?? []).map((id) => byId[id]).filter(Boolean) : [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { WORLD: 0 };
    for (const code of visited) {
      const info = COUNTRIES_BY_CODE[code];
      if (!info) continue;
      c.WORLD++;
      c[info.continent] = (c[info.continent] ?? 0) + 1;
    }
    return c;
  }, [visited]);

  const matches = query.trim()
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];
  const sphere = path({ type: "Sphere" }) ?? "";

  return (
    <div>
      {/* Continents, above the globe so a country sheet never hides them: tap one and the globe turns to it. */}
      <div className="-mx-2 mb-2 flex gap-1.5 overflow-x-auto px-2 pb-1 [scrollbar-width:none] sm:justify-center">
        {CONTINENTS.map((c) => {
          const active = continent === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => pickContinent(c.key)}
              aria-pressed={active}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-colors ${
                active ? "text-white" : "bg-bg text-ink-2 ring-1 ring-line hover:text-ink"
              }`}
            >
              {active && (
                <motion.span layoutId="continent-active" className="absolute inset-0 rounded-full bg-petrol" transition={SPRING_STAMP} />
              )}
              <span className="relative">{c.label}</span>
              {(counts[c.key] ?? 0) > 0 && (
                <span className={`relative rounded-full px-1.5 text-[11.5px] tabular-nums ${active ? "bg-white/20" : "bg-aqua-soft text-petrol"}`}>
                  {counts[c.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div ref={wrapRef} className="relative mx-auto w-full max-w-[720px] select-none overflow-hidden rounded-[1.5rem] [-webkit-touch-callout:none]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full cursor-grab touch-none active:cursor-grabbing"
          role="img"
          aria-label={`Globe: ${counts.WORLD} countries claimed`}
          {...handlers}
        >
          <defs>
            <radialGradient id="wg-ocean" cx="38%" cy="32%" r="75%">
              <stop offset="0" stopColor="var(--aqua-soft)" />
              <stop offset="1" stopColor="var(--petrol-soft)" />
            </radialGradient>
            <radialGradient id="wg-shade" cx="35%" cy="30%" r="80%">
              <stop offset="0.55" stopColor="rgb(0 0 0 / 0)" />
              <stop offset="1" stopColor="rgb(8 40 44 / 0.28)" />
            </radialGradient>
            <radialGradient id="wg-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0.86" stopColor="var(--aqua-bright)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--aqua-bright)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wg-visited" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--petrol)" }} />
              <stop offset="0.55" style={{ stopColor: "var(--aqua)" }} />
              <stop offset="1" style={{ stopColor: "var(--aqua-bright)" }} />
            </linearGradient>
            <linearGradient id="wg-gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="220" y2="140" spreadMethod="reflect">
              <stop offset="0" stopColor="#9c6a05" />
              <stop offset="0.35" stopColor="#e9a818" />
              <stop offset="0.5" stopColor="#fff4c4" />
              <stop offset="0.65" stopColor="#f2b624" />
              <stop offset="1" stopColor="#a87306" />
              {!reduce && (
                <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="440 280" dur="7s" repeatCount="indefinite" />
              )}
            </linearGradient>
          </defs>

          <circle cx={W / 2} cy={H / 2} r={R * view.zoom * 1.06} fill="url(#wg-glow)" />
          <path d={sphere} fill="url(#wg-ocean)" />
          <path d={path(graticule) ?? ""} fill="none" stroke="var(--petrol)" strokeOpacity={0.08} strokeWidth={0.8} />

          {shapes?.map(({ code, feature: f }, i) => {
            const d = path(f);
            if (!d) return null;
            const mine = visited.has(code);
            const fam = !mine && (family[code]?.length ?? 0) > 0;
            const fill = everyone(code) ? "url(#wg-gold)" : mine ? "url(#wg-visited)" : fam ? "color-mix(in srgb, var(--aqua-bright) 45%, var(--land))" : "var(--land)";
            return (
              <path
                key={`${code}-${i}`}
                d={d}
                data-country={code}
                fill={fill}
                stroke="var(--land-edge)"
                strokeWidth={0.7}
                strokeLinejoin="round"
                className="transition-[fill] duration-300 hover:brightness-95"
              >
                <title>{COUNTRIES_BY_CODE[code]?.name ?? code}</title>
              </path>
            );
          })}

          {/* Islands too small to see still get a dot once someone's been. */}
          {shapes?.map(({ code, feature: f }, i) => {
            const colored = visited.has(code) || (family[code]?.length ?? 0) > 0;
            if (!colored || path.area(f) > 30) return null;
            const ll = COUNTRIES_BY_CODE[code]?.latlng;
            const lonlat: [number, number] | null = ll ? [ll[1], ll[0]] : null;
            if (!lonlat || geoDistance(lonlat, [view.lon, view.lat]) > Math.PI / 2 - 0.05) return null;
            const xy = projection(lonlat);
            if (!xy) return null;
            const fill = everyone(code) ? "#f2b624" : visited.has(code) ? "var(--aqua)" : "var(--aqua-bright)";
            return (
              <circle
                key={`dot-${code}-${i}`}
                cx={xy[0]}
                cy={xy[1]}
                r={5}
                data-country={code}
                fill={fill}
                stroke="#fff"
                strokeWidth={2}
              />
            );
          })}

          {selectedCode &&
            shapes
              ?.filter((s) => s.code === selectedCode)
              .map((s, i) => (
                <path key={`sel-${i}`} d={path(s.feature) ?? ""} fill="none" stroke="var(--sun)" strokeWidth={2.4} strokeLinejoin="round" pointerEvents="none" />
              ))}

          <path d={sphere} fill="url(#wg-shade)" pointerEvents="none" />

          {ripples.map((r) => (
            <motion.circle
              key={r.id}
              cx={r.x}
              cy={r.y}
              fill="none"
              stroke={r.gold ? "#f5c542" : "var(--aqua-bright)"}
              strokeWidth={3}
              initial={{ r: 4, opacity: 0.9 }}
              animate={{ r: 70, opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              pointerEvents="none"
            />
          ))}
        </svg>

        {!shapes && (
          <div className="absolute inset-0 flex items-center justify-center text-[14px] text-ink-3">Unrolling the globe…</div>
        )}

        <AnimatePresence>
          {selectedPoint && campers.length > 0 && selectedCode && (
            <motion.div
              key={`camp-${selectedCode}`}
              className="pointer-events-none absolute z-[5]"
              style={{ left: `${(selectedPoint.x / W) * 100}%`, top: `${(selectedPoint.y / H) * 100}%` }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.18 } }}
              transition={SPRING_STAMP}
            >
              <div className="-translate-x-1/2 -translate-y-[64%] max-sm:scale-[0.82]">
                <Campfire members={campers} variant="map" gold={everyone(selectedCode)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>{hold && <HoldRing key={`${hold.code}-${hold.x}`} x={hold.x} y={hold.y} />}</AnimatePresence>
        <AnimatePresence>{cheer && <Cheer key={cheer.id} x={cheer.x} y={cheer.y} />}</AnimatePresence>

        {/* Find a country: the way to reach the small ones. */}
        <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          {searching ? (
            <div className="w-[min(260px,70vw)] rounded-2xl bg-elevated/95 p-1.5 shadow-[var(--shadow-float)] ring-1 ring-line backdrop-blur-xl">
              <div className="flex items-center gap-2 px-2">
                <MagnifyingGlassIcon size={16} className="shrink-0 text-ink-3" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matches[0]) focusCountry(matches[0].code);
                    if (e.key === "Escape") setSearching(false);
                  }}
                  placeholder="Find a country"
                  aria-label="Find a country"
                  className="min-h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
                />
                <button type="button" onClick={() => setSearching(false)} aria-label="Close search" className="text-ink-3 hover:text-ink">
                  <XIcon size={16} />
                </button>
              </div>
              {matches.length > 0 && (
                <ul className="mt-1 border-t border-line pt-1">
                  {matches.map((c) => (
                    <li key={c.code}>
                      <button
                        type="button"
                        onClick={() => focusCountry(c.code)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-[14.5px] hover:bg-bg"
                      >
                        <span className="text-[18px] leading-none">{c.flag}</span>
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        {visited.has(c.code) && <span className="h-2 w-2 rounded-full bg-aqua" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearching(true)}
              aria-label="Find a country"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated/90 text-ink-2 shadow-[var(--shadow-card)] ring-1 ring-line backdrop-blur-xl hover:text-ink"
            >
              <MagnifyingGlassIcon size={18} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
