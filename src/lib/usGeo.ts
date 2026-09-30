import { feature, mesh } from "topojson-client";
import { geoIdentity, geoPath } from "d3-geo";
import type { Topology, GeometryObject } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import albersTopology from "us-atlas/states-albers-10m.json";
import { STATES_BY_FIPS, type StateInfo } from "@/lib/statesData";

/** us-atlas's albers file is pre-projected into this coordinate space. */
export const MAP_WIDTH = 975;
export const MAP_HEIGHT = 610;

export interface StateShape {
  code: string;
  info: StateInfo;
  d: string;
  centroid: [number, number];
  /** [[x0, y0], [x1, y1]] in map units. */
  bounds: [[number, number], [number, number]];
  feature: Feature<Geometry>;
}

interface UsGeometry {
  shapes: StateShape[];
  byCode: Record<string, StateShape>;
  borders: string;
  nation: string;
}

let cache: UsGeometry | null = null;

export function getUsGeometry(): UsGeometry {
  if (cache) return cache;

  const topology = albersTopology as unknown as Topology;
  const statesObject = topology.objects.states as GeometryObject;
  const collection = feature(topology, statesObject) as FeatureCollection<Geometry>;
  const path = geoPath();

  const shapes: StateShape[] = [];
  for (const f of collection.features) {
    const info = STATES_BY_FIPS[String(f.id)];
    if (!info) continue;
    shapes.push({
      code: info.code,
      info,
      d: path(f) ?? "",
      centroid: path.centroid(f) as [number, number],
      bounds: path.bounds(f) as [[number, number], [number, number]],
      feature: f,
    });
  }

  const borders = path(mesh(topology, statesObject, (a, b) => a !== b)) ?? "";
  const nation = path(mesh(topology, topology.objects.nation as GeometryObject)) ?? "";

  cache = {
    shapes,
    byCode: Object.fromEntries(shapes.map((s) => [s.code, s])),
    borders,
    nation,
  };
  return cache;
}

/** A single state's outline, fitted into a width×height box (for hero silhouettes). */
export function stateSilhouette(code: string, width: number, height: number, padding = 8): string | null {
  const shape = getUsGeometry().byCode[code];
  if (!shape) return null;
  const projection = geoIdentity().fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    shape.feature,
  );
  return geoPath(projection)(shape.feature);
}
