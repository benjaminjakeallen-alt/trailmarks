// MapLibre finds its web worker relative to its own module URL, which breaks once
// Next bundles it (the worker lands nowhere and the trip map never starts). We
// serve the worker and the chunk it imports from /vendor/maplibre instead, and
// TripMap points MapLibre there with setWorkerUrl(). Runs before dev and build,
// so the copy always matches the installed maplibre-gl version.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist");
const to = join(root, "public", "vendor", "maplibre");

mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(from, file), join(to, file));
}
