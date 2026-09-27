# Trailmarks

A fun, interactive way to track every state you've visited in North America —
mark states off on a live map, capture the memories and photos from each
trip, and relive them in a slideshow. Photo book printing is on the roadmap.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4, using
Node's built-in `node:sqlite` (`DatabaseSync`) — no external database
service to configure. **Requires Node >= 22.5** for `node:sqlite`.

- **Map**: [`react-simple-maps`](https://www.react-simple-maps.io/) +
  [`us-atlas`](https://github.com/topojson/us-atlas) TopoJSON — a real,
  accurate geographic map (not a hand-drawn approximation), rendered with
  `geoAlbersUsa` so Alaska and Hawaii sit as insets like on a printed map.
- **Animation**: Framer Motion for the mark-visited pop, stat bar fills, the
  slideshow's Ken Burns pan/zoom, and page transitions.
- **Images**: uploads are resized (max 2400px) and re-encoded to WebP with
  `sharp` on upload, then served through Next's image optimizer.

## Architecture

- `src/lib/db.ts` — single `getDb()` singleton, creates the schema on first
  call (`CREATE TABLE IF NOT EXISTS`). All API routes import `getDb()` from
  here.
- `DB_PATH` env var overrides the SQLite file location (default
  `data/trailmarks.db`). `PHOTOS_DIR` overrides where uploaded photos are
  stored on disk (default `data/photos`).
- **Both are gitignored and must live on a persistent volume in
  production**, or every redeploy wipes your trip data — this bit a sibling
  project (see the note below) and is worth avoiding from day one.
- `src/lib/statesData.ts` — the 50 states + DC, keyed by USPS code, with a
  FIPS code for matching against the TopoJSON `id`, region, land area (for
  the "% of North America explored" stat), and a fun fact.
- Data model: `state_visits` (one row per state, visited flag + first-visited
  date), `memories` (title/body/date per state), `photos` (file name +
  caption, optionally linked to a memory). No user accounts in this first
  version — it's a personal/family travel log, not a multi-tenant app.

### Deploying with a persistent volume

If you deploy on a platform with ephemeral filesystems (Railway, Render,
Fly.io, etc.), attach a persistent volume and point **both** `DB_PATH` and
`PHOTOS_DIR` at paths inside it, e.g. a volume mounted at `/app/data` with:

```
DB_PATH=/app/data/trailmarks.db
PHOTOS_DIR=/app/data/photos
```

Double-check the volume's *actual* mount path matches these env vars exactly
— a mismatch fails silently (the app still runs, it just quietly resets on
every deploy). Verify persistence by adding a state/memory, redeploying, and
confirming it's still there — don't just trust that the volume is attached.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The map starts empty —
click any state to mark it visited, which takes you to that state's page to
add your first memory and photos.

## Roadmap

- **Photo books** — export a state's (or a whole trip's) memories and photos
  into a printable photo book via a print-on-demand API (e.g. Mixbook,
  Printful, or Artifact Uprising's API where available).
- **Canada & Mexico** — the data model and map component are built to
  extend beyond the US 50; adding provinces/states just means new entries
  in `statesData.ts` and swapping in a North America TopoJSON.
- **Multi-user / family accounts** — shared trip tracking, so a family can
  fill in the same map together (mirrors the auth pattern in the Robinson
  reunion app: individual logins, no external auth service).
- **Trip grouping** — group memories across multiple states into a single
  "trip" with its own cover photo and combined slideshow.
- **Map themes** — swap the color palette (national-park poster, vintage
  postcard, night sky) as a fun customization.
- **Offline-friendly PWA** — so photos can be added from the road before
  reception comes back.
