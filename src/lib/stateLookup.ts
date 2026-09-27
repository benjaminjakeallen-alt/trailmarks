import { feature } from "topojson-client";
import { geoContains } from "d3-geo";
import type { Topology, GeometryObject } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import statesTopology from "us-atlas/states-10m.json";
import { STATES_BY_FIPS } from "@/lib/statesData";

let cachedFeatures: Feature<Geometry, { name: string }>[] | null = null;

function getStateFeatures(): Feature<Geometry, { name: string }>[] {
  if (cachedFeatures) return cachedFeatures;
  const topology = statesTopology as unknown as Topology;
  const object = topology.objects.states as GeometryObject;
  const collection = feature(topology, object);
  cachedFeatures =
    "features" in collection ? (collection.features as Feature<Geometry, { name: string }>[]) : [];
  return cachedFeatures;
}

/** Point-in-polygon lookup: which US state (if any) contains this lng/lat. */
export function findStateCodeForPoint(lng: number, lat: number): string | null {
  for (const feat of getStateFeatures()) {
    if (geoContains(feat, [lng, lat])) {
      const fips = String(feat.id);
      return STATES_BY_FIPS[fips]?.code ?? null;
    }
  }
  return null;
}

/** Distinct state codes touched by a sequence of [lng, lat] points. */
export function findStateCodesForPoints(points: Array<[number, number]>): string[] {
  const found = new Set<string>();
  for (const [lng, lat] of points) {
    const code = findStateCodeForPoint(lng, lat);
    if (code) found.add(code);
  }
  return Array.from(found);
}
