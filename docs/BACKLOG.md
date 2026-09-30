# Backlog

Ideas captured 2026-09-28 after the first design pass. Not started — each
entry notes what it changes and the open questions to settle before building.

## 1. Long-press to deselect a state — done

Tap claims; tapping a claimed state only selects it; press and hold
(550 ms, with a ring filling under the finger) unclaims. Moving the finger
cancels, so scrolling never unclaims. Keyboard: Enter claims, Delete
unclaims; the switch in the state bar/sheet still works both ways.

## 2. Stronger haptics — done

Named patterns in `src/lib/motion.ts` (select, claim, hold threshold,
unclaim, everyone). Android vibrates the pattern; iOS Safari gets a single
system tick through a hidden `<input type="checkbox" switch>` (Safari
17.4+), which only fires inside a user gesture.

## 3. Claim hero animation: glow + outward gradient fill — done

The state's edge glows while a radial gradient blooms from the tap point to
its borders (clipped to the state's own path), then the solid fill settles
beneath it. A claim that completes the family blooms gold with a "The whole
family's been here" pill.

## 4. Remove the background contour lines — done

Shipped with the "Glacier" redesign: the `.bg-topo` contour lines and the
paper grain are gone everywhere.

## 5. New color palette — done

Replaced "Golden Hour" with "Glacier", built from the owner's three reference
shots: deep petrol teal, glacier aqua, amber highlights, and photo-first
cards with frosted-glass chips. See the README's design system section.

## 6. Voice journal with transcription

Record an audio journal entry, keep the audio, and transcribe it to text on
the memory.

- Record in the browser with `MediaRecorder` and store the audio in Supabase
  Storage next to the photos.
- Transcription needs a speech-to-text provider (for example OpenAI Whisper,
  Deepgram or AssemblyAI). The provider and API key are still open; the
  browser's built-in Web Speech API is free but unreliable and doesn't work
  on uploaded files.
- Data model: add `audio_file` and `transcript` columns to `memories`, and
  let the transcript become an editable memory body.

## 7. Import photos by metadata — done (web version)

On a trip page, the owner picks a batch of photos. The browser reads each
photo's EXIF capture time and GPS (`src/lib/photoMeta.ts`, exifr) before
upload, since the server's WebP re-encode strips EXIF. `src/lib/photoImport.ts`
then sorts them: same day and within 5 miles of an existing step joins it;
the rest cluster into new stops (3 hours or 8 miles starts a new one), named
by state and day; photos with no date go last; photos outside the trip's
dates are set aside. The review sheet lets you rename stops or leave groups
out before uploading. Photos now store `taken_at`, `lat`, `lng`, and the
regular composer fills the memory date from its photos.

Still true, and worth a native app later:

- The iOS web photo picker strips location unless "Location" is on in the
  picker's Options (and converts HEIC to JPEG, which the server needs;
  HEIC files picked from Files are skipped).
- A website can't browse the photo library by date, so "show me only this
  trip's photos" needs the native app (PhotoKit).

## 8. The whole world, with a globe that turns to each continent

Grow from U.S. states to every country on every continent. A continent
selector (a segmented control or a row of chips) turns the map like a globe
to face the chosen continent, then settles into that continent's view for
claiming countries.

- Rendering: `d3-geo`'s `geoOrthographic` with an animated `rotate()` gives
  the globe spin in the same SVG approach as the current map, with each
  country still its own animatable path. `world-atlas` TopoJSON (110m for the
  globe, 50m once zoomed in) replaces `us-atlas`.
- Data model: `state_visits` becomes place visits keyed by a region code
  (ISO 3166 for countries, with the U.S. states kept as a subdivision), and
  the stats and ranking extend to countries and continents.
- Trip auto-detection (`stateLookup.ts`) gains country point-in-polygon.

