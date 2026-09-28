# Trailmarks

A fun, interactive way to track every state you've visited in North America —
mark states off on a live map, capture the memories and photos from each
trip, and relive them in a slideshow. Photo book printing is on the roadmap.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4, backed by
[Supabase](https://supabase.com/) (Postgres + Storage). No local database
file, no persistent-volume requirement — the app is stateless and can
deploy to any Node host.

- **Map**: [`react-simple-maps`](https://www.react-simple-maps.io/) +
  [`us-atlas`](https://github.com/topojson/us-atlas) TopoJSON — a real,
  accurate geographic map (not a hand-drawn approximation), rendered with
  `geoAlbersUsa` so Alaska and Hawaii sit as insets like on a printed map.
- **Animation**: Framer Motion for the mark-visited pop, stat bar fills, the
  slideshow's Ken Burns pan/zoom, and page transitions.
- **Images**: uploads are resized (max 2400px) and re-encoded to WebP with
  `sharp` on upload, then served through Next's image optimizer.
- **Trip map**: [`maplibre-gl`](https://maplibre.org/) with free,
  no-API-key tiles from [OpenFreeMap](https://openfreemap.org/) (`positron`
  style) — real streets/terrain, not a choropleth, so a recorded route draws
  as an actual line over the map like Polarsteps.

## Architecture

- `src/lib/supabase.ts` — single `getSupabase()` singleton, a
  `@supabase/supabase-js` client authenticated with the **service_role**
  key. All data access goes through this app's own API routes on the
  server; the browser never talks to Supabase directly, so no key is ever
  exposed client-side and Row Level Security on every table is left "on,
  no policies" as a second lock (the service role bypasses RLS regardless).
- Requires two env vars: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  (Supabase dashboard → your project → **Settings → API**). Put them in
  `.env.local` for local dev (gitignored) and in your host's environment
  variables for production.
- Photos upload to a public Supabase Storage bucket named `photos` (resized
  to max 2400px and re-encoded to WebP with `sharp` first) and are served
  straight from Supabase's CDN — `next.config.ts` allow-lists
  `*.supabase.co/storage/v1/object/public/**` for `next/image`.
- `src/lib/statesData.ts` — the 50 states + DC, keyed by USPS code, with a
  FIPS code for matching against the TopoJSON `id`, region, land area (for
  the "% of North America explored" stat), and a fun fact.
- Data model: `state_visits` (one row per state, visited flag + first-visited
  date), `memories` (title/body/date, optionally linked to a state and/or a
  trip, with `lat`/`lng` for trip "steps"), `photos` (file name + caption,
  linked to a memory), `trips` (title/status/dates), `trip_points` (the raw
  GPS breadcrumb trail for a trip). No user accounts in this first version —
  it's a personal/family travel log, not a multi-tenant app.

## Trips: auto-generated maps from GPS

Starting a trip (`/trips/new` → trip page → "Start recording") begins a
`navigator.geolocation.watchPosition` session that streams points to
`/api/trips/[id]/points`, throttled to roughly one point per ~10 seconds or
~13 meters of movement. `src/components/TripMap.tsx` (MapLibre) draws that
breadcrumb trail as a live route line on a real map, and
`src/lib/stateLookup.ts` does a point-in-polygon check (via `d3-geo`'s
`geoContains` against the same `us-atlas` state polygons the choropleth
map uses) to figure out which states a trip actually passed through.
Finishing a trip (`src/lib/trips.ts` → `finishTrip`) runs that detection
over every recorded point and merges the results into `state_visits` — so a
recorded road trip auto-marks the states/countries it touched, the same way
the manual tap-to-mark map does. Both stay available: manual marking for
quick logging or trips with no GPS data, auto-detection for anything
actually recorded.

**Important limitation — read before assuming this behaves like Life360 or
Polarsteps' native app:** this is a website, not a phone app with background
location permission. GPS recording only runs while that trip's page is open
in the foreground (screen on, tab active) — it stops the moment the tab is
closed or the phone is locked/backgrounded. The UI says "Recording — keep
this tab open" for exactly this reason. True background tracking (recording
a drive while the phone is in your pocket) needs a native app or a PWA with
background geolocation, which is a real follow-up project, not a setting to
flip. Points recorded so far are never lost when recording stops — resuming
just continues appending to the same trip.

## Supabase setup

The `trailmarks` Supabase project (org: `benjaminjakeallen-alt's Org`) already
has this schema applied via migration:

- `state_visits`, `trips`, `trip_points`, `memories`, `photos` — same shape
  described above, Postgres types (`bigint identity` primary keys,
  `timestamptz`/`date` instead of SQLite's text columns).
- A public Storage bucket named `photos`.
- RLS enabled on every table with no policies — nothing but the
  service_role key (used only server-side by this app) can read or write.

To point a fresh checkout at it (or a different Supabase project), set:

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role secret, from Settings → API>
```

Setting up a brand-new Supabase project instead of reusing this one? The
migration SQL is straightforward to reconstruct from `src/lib/supabase.ts`,
`src/lib/trips.ts`, and `src/lib/memories.ts`'s row shapes, or ask Claude to
regenerate it from this repo's history.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The map starts empty —
click any state to mark it visited (or start a trip under **Trips** to
record a real route), which takes you to that page to add memories and
photos.

Geolocation requires a "secure context" (HTTPS, or `localhost` — which
`npm run dev` already is) or the browser will refuse it outright.

## Roadmap

- **Photo books** — export a state's (or a whole trip's) memories and photos
  into a printable photo book via a print-on-demand API (e.g. Mixbook,
  Printful, or Artifact Uprising's API where available).
- **Canada & Mexico** — the data model and map component are built to
  extend beyond the US 50; adding provinces/states just means new entries
  in `statesData.ts` and swapping in a North America TopoJSON.
- **Multi-user / family accounts** — shared trip tracking, so a family can
  fill in the same map together. Now that the backend is Supabase, this is
  Supabase Auth + per-row `user_id` columns and real RLS policies, rather
  than hand-rolling it.
- **Background GPS tracking** — a native app or PWA with background
  geolocation, so a trip keeps recording without the page staying open.
  This is the biggest gap versus Polarsteps' actual app.
- **GPX import** — for anyone who already recorded a route in another app
  (Strava, Gaia GPS, a Garmin) and wants to bring it in instead of
  re-recording live.
- **Map themes** — swap the color palette (national-park poster, vintage
  postcard, night sky) as a fun customization.
- **Offline-friendly PWA** — so photos can be added from the road before
  reception comes back.
