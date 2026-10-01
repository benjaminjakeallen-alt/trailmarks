// Rebuilds src/data/world-countries.json and src/lib/countriesData.ts.
// Run from a scratch dir with: npm i world-atlas world-countries mapshaper
//   npx mapshaper node_modules/world-atlas/countries-50m.json -simplify 18% keep-shapes weighted -o target=countries format=topojson quantization=8000 world.json
//   node build-world.mjs   (then copy the two outputs into the repo)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const topo = require("./world.json");
const wc = require("world-countries");
const byNum = Object.fromEntries(wc.filter((c) => c.ccn3).map((c) => [c.ccn3, c]));
const byCode = Object.fromEntries(wc.map((c) => [c.cca2, c]));
const special = { Somaliland: "SO", Kosovo: "XK", "N. Cyprus": "CY", "Indian Ocean Ter.": "AU", "Siachen Glacier": "IN" };
const continent = (c) =>
  c.region === "Americas" ? (c.subregion === "South America" ? "SA" : "NA")
  : c.region === "Europe" ? "EU" : c.region === "Africa" ? "AF" : c.region === "Asia" ? "AS" : c.region === "Oceania" ? "OC" : "AN";
const geos = topo.objects.countries.geometries;
const unmatched = [];
for (const g of geos) {
  const c = special[g.properties.name] ? byCode[special[g.properties.name]] : byNum[g.id];
  if (!c) { unmatched.push([g.id, g.properties.name]); continue; }
  g.id = c.cca2;
  g.properties = {};
}
console.error("unmatched", unmatched);
topo.objects.countries.geometries = geos.filter((g) => byCode[g.id]);
const codes = [...new Set(topo.objects.countries.geometries.map((g) => g.id))];
const rows = codes.map((code) => {
  const c = byCode[code];
  return [code, c.name.common, continent(c), c.flag, c.independent ? 1 : 0, Math.round(c.latlng[0] * 10) / 10, Math.round(c.latlng[1] * 10) / 10];
}).sort((a, b) => a[1].localeCompare(b[1]));
require("fs").writeFileSync("world-countries.json", JSON.stringify(topo));
const ts = `/**
 * Every country on the globe: ISO 3166 alpha-2 code, name, continent, flag,
 * whether it's independent (counted toward the ${rows.filter((r) => r[4]).length}), and a
 * label point [lat, lng]. Generated from world-countries (ODbL) to match the
 * world-atlas shapes in src/data/world-countries.json; rebuild with scripts/build-world.mjs.
 */

export type ContinentCode = "NA" | "SA" | "EU" | "AF" | "AS" | "OC" | "AN";

export interface CountryInfo {
  code: string;
  name: string;
  continent: ContinentCode;
  flag: string;
  independent: boolean;
  latlng: [number, number];
}

const ROWS: [string, string, ContinentCode, string, 0 | 1, number, number][] = ${JSON.stringify(rows)};

export const COUNTRIES: CountryInfo[] = ROWS.map(([code, name, continent, flag, independent, lat, lng]) => ({
  code,
  name,
  continent,
  flag,
  independent: independent === 1,
  latlng: [lat, lng],
}));

export const COUNTRIES_BY_CODE: Record<string, CountryInfo> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

export const COUNTRY_COUNT = COUNTRIES.filter((c) => c.independent).length;
`;
require("fs").writeFileSync("countriesData.ts", ts);
console.error(rows.length, "countries;", rows.filter((r) => r[4]).length, "independent", rows.filter(r=>r[2]==="AN").map(r=>r[1]));
