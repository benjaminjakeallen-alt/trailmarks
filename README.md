# Trailmarks

**Live at [trailmarks-lovat.vercel.app](https://trailmarks-lovat.vercel.app)**

A fun, interactive way to track every state you've visited in North America —
mark states off on a live map, capture the memories and photos from each
trip, and relive them in a slideshow. Photo book printing is on the roadmap.

Deployed on [Vercel](https://vercel.com/) (auto-deploys from `main`), backed
by [Supabase](https://supabase.com/) for the database and photo storage.

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
  as an actual line over the map like Polarsteps. MapLibre's web worker
  can't be found once Next bundles the library, so
  `scripts/copy-maplibre-worker.mjs` (run by `predev`/`prebuild`) copies it
  into `public/vendor/maplibre/` and `TripMap` points `setWorkerUrl()` there.

## Design system

"Glacier": modeled on the photo-first travel apps the owner picked as
references. Cool mist and white surfaces let the photos carry the color.
**Petrol** (deep teal) is for anything you act on. **Aqua** marks land and
routes you've claimed. **Sun** (amber) is for highlights and achievements,
and **Coral** is used only for recording and errors. There is a true dark mode.
Tokens live in `src/app/globals.css`; never hard-code hex values in components.

- Type: Outfit everywhere, in bold geometric headlines and a plain UI weight.
  Icons: Phosphor, light weight.
- You land on the map: the home page is a one-line headline and the map,
  sized to fit above the fold. Progress lives in a "16 / 50 states" pill that
  grows into a stats drawer (count, region ranking, land explored) over the
  left third of the map; on desktop a tapped state takes over the map's top
  bar instead of a side panel.
- Photos lead everywhere else. Trip cards are the trip's cover (or its first
  step's photo) with the route drawn over it in white, and trip and state
  pages open on a full-bleed photo. With no photo,
  surfaces fall back to the `.brand-gradient`. `.glass` is for stat chips on
  photos, and `.photo-scrim` keeps white type legible on them.
- Cards are one white surface (`Panel`) with a soft cool shadow and a 28px
  radius. Buttons come in `primary`, `secondary` and `quiet` for the page,
  plus `light` and `glass` for photos.
- Motion: `src/lib/motion.ts` holds the shared easings and springs. Respect
  `prefers-reduced-motion` (handled globally via `MotionConfig`).
- The home map (`src/components/map/UsMap.tsx`) is hand-built on `d3-geo` +
  us-atlas's pre-projected Albers file, so every state is its own animatable
  path. It has a sunrise-sweep intro; tap to claim (the edge glows and the
  color blooms outward from your finger, gold when it completes the family),
  press and hold to unclaim (a ring fills under your finger); haptics; and an
  amber outline trace on select.

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
- Data model: `families` (name + invite code), `profiles` (one per person:
  family, display name, map color), `state_visits` (one row per person per
  state, visited flag + first-visited date), `memories` (title/body/date,
  optionally linked to a state and/or a trip, with `lat`/`lng` for trip
  "steps"), `photos` (file name + caption, linked to a memory), `trips`
  (title/status/dates), `trip_points` (the raw GPS breadcrumb trail for a
  trip). Trips, memories and photos carry `user_id` (author) and `family_id`.

## Family accounts

- Everyone has their own login (Supabase Auth, email + password) and belongs
  to one family. `/join` starts a new family; `/join?code=XXXXXXXX` joins one
  from its invite link (on `/family`). Accounts are created server-side as
  already-confirmed users (`src/lib/family.ts` → `createAccount`), so no
  confirmation email or Supabase email setup is needed.
- Claims are per person; trips, memories and photos are shared with the whole
  family and show who added them. Only the author can delete a memory or
  photo, and only a trip's owner can record, add steps to, finish or delete
  it. Nothing crosses families.
- On the map: your states are solid aqua, states only other family members
  have claimed are a lighter tint, and a state everyone in the family has
  claimed turns shimmering gold. Tap a state and the people who've been
  appear round a campfire on it (`Campfire.tsx`). The stats drawer adds a
  family ranking and an "everyone's been" count.
- **Invites**: the dashed "+" seat in the map header (or Invite in the nav)
  opens a sheet with the share sheet, Text, Email, Copy and a QR code; any
  member can make a new link. `/join` also takes a typed code.
- **Adventurer avatars**: tap your own avatar in the map header to make one
  from a selfie. The in-browser comic badge (`src/lib/photoBadge.ts`) is free
  and unlimited; the AI illustration (`/api/avatar/illustrate`, AI Gateway,
  medium quality, about 1 cent) is **one per person**, only when they tap
  "Illustrate me". A failed call doesn't use the try, the result is stored
  at once, and they can switch back to it any time. To give someone another
  try: `update profiles set illustrated_at = null, illustrated_file = null
  where user_id = '…'`. Only finished avatars are stored, never the selfie,
  in the private `avatars` bucket (`/a/<file>`).
- **Password reset** without email: on `/family`, anyone can make another
  member a one-time, 48-hour link (`src/lib/passwordReset.ts`; only a hash is
  stored). You can change your own password there too.
- **Private media**: photos (`/p/<file>`, resized via a custom next/image
  loader), avatars and voice notes are all in private buckets, served only to
  the owner's family.
- `src/proxy.ts` refreshes the session cookie on every request and sends
  anyone signed out to `/login` (API routes get a 401). Pages call
  `requireViewer()` and API routes `apiViewer()` (`src/lib/auth.ts`), then
  scope every query by the viewer's family and check ownership on writes.
- Auth uses the project's publishable key (`src/lib/supabaseConfig.ts`,
  overridable with `SUPABASE_PUBLISHABLE_KEY`). It is public by design and
  reads nothing on its own, since every table has RLS on with no policies;
  data access stays on the server-side service role client.

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

- `families`, `profiles`, `state_visits`, `trips`, `trip_points`,
  `memories`, `photos` — the shapes described above. Migrations since
  family accounts live in `supabase/migrations/`.
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

## Journal and voice

On the map, a state's **Open journal** grows a slide-over panel out of the
button, docked on the right: that state's family memories plus the composer, without leaving the
map (the full `/states/[code]` page is a link away). Every composer has a
mic: speak and the words stream into the entry (browser speech recognition,
`src/lib/useDictation.ts`), while the recording itself is kept and plays back
on the memory (`src/lib/useRecorder.ts`). Without live speech recognition the
clip is transcribed on the server.

## The world

The map's USA / World switch turns to a globe (`WorldGlobe.tsx`): drag to
spin, tap a continent and it turns to face you, tap a country to claim it,
hold to unclaim, search for the small ones. See `docs/BACKLOG.md` item 8.

## Photo import

On a trip page, **Import photos** reads each photo's capture time and GPS in
the browser, joins photos to nearby same-day steps, groups the rest into new
stops, and shows the plan for review before uploading. See
`docs/BACKLOG.md` item 7 for the rules and the iPhone picker's limits.

## Roadmap

Detailed feature ideas awaiting a go-ahead live in [`docs/BACKLOG.md`](docs/BACKLOG.md).

- **Photo books** — export a state's (or a whole trip's) memories and photos
  into a printable photo book via a print-on-demand API (e.g. Mixbook,
  Printful, or Artifact Uprising's API where available).
- **Canada & Mexico** — the data model and map component are built to
  extend beyond the US 50; adding provinces/states just means new entries
  in `statesData.ts` and swapping in a North America TopoJSON.
- **Background GPS tracking** — a native app or PWA with background
  geolocation, so a trip keeps recording without the page staying open.
  This is the biggest gap versus Polarsteps' actual app.
- **GPX import** — for anyone who already recorded a route in another app
  (Strava, Gaia GPS, a Garmin) and wants to bring it in instead of
  re-recording live.
- **Map themes** and **a different activity in every state** — see
  `docs/BACKLOG.md` items 9 and 10.
- **Offline-friendly PWA** — so photos can be added from the road before
  reception comes back.
