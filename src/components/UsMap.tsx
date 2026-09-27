"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import type { GeoJsonObject } from "geojson";
import statesTopology from "us-atlas/states-10m.json";
import { STATES_BY_FIPS } from "@/lib/statesData";

const geography = statesTopology as unknown as GeoJsonObject;

interface RsmGeography {
  rsmKey: string;
  id: string;
  properties: { name: string };
}

interface UsMapProps {
  visited: Set<string>;
  selectedCode?: string | null;
  onSelect?: (code: string) => void;
  justVisitedCode?: string | null;
}

export default function UsMap({ visited, selectedCode, onSelect, justVisitedCode }: UsMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const hoveredName = useMemo(() => {
    if (!hovered) return null;
    return STATES_BY_FIPS[hovered]?.name ?? null;
  }, [hovered]);

  return (
    <div
      className="relative w-full"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      <ComposableMap
        projection="geoAlbersUsa"
        width={975}
        height={610}
        className="w-full h-auto select-none"
      >
        <Geographies geography={geography}>
          {({ geographies }) =>
            (geographies as unknown as RsmGeography[]).map((geo) => {
              const info = STATES_BY_FIPS[geo.id];
              if (!info) return null;

              const isVisited = visited.has(info.code);
              const isSelected = selectedCode === info.code;
              const isHovered = hovered === geo.id;
              const justVisited = justVisitedCode === info.code;

              const fill = isVisited
                ? "var(--visited)"
                : isHovered
                  ? "var(--accent-soft)"
                  : "var(--unvisited)";

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo as never}
                  onMouseEnter={() => setHovered(geo.id)}
                  onMouseLeave={() => setHovered((prev) => (prev === geo.id ? null : prev))}
                  onClick={() => onSelect?.(info.code)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${info.name}${isVisited ? ", visited" : ", not visited yet"}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(info.code);
                    }
                  }}
                  fill={fill}
                  stroke={isSelected ? "var(--accent)" : "var(--background)"}
                  strokeWidth={isSelected ? 1.75 : 0.75}
                  className={`cursor-pointer outline-none transition-[fill,stroke-width] duration-150 ease-out ${
                    justVisited ? "state-just-visited" : ""
                  }`}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {hoveredName && tooltipPos && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {hoveredName}
          {visited.has(STATES_BY_FIPS[hovered!]?.code ?? "") ? " · visited" : ""}
        </div>
      )}
    </div>
  );
}
