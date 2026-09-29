# Backlog

Ideas captured 2026-09-28 after the first design pass. Not started — each
entry notes what it changes and the open questions to settle before building.

## 1. Long-press to deselect a state

Tap claims a state; a long press (~500 ms) unclaims it. Replaces today's
tap-to-toggle, which makes accidental unclaims too easy.

- Show a progress ring filling under the finger during the press so it's
  discoverable, and cancel if the finger moves.
- Keyboard and screen-reader users still need a non-press path (the state
  card's switch already covers this).

## 2. Stronger haptics

Distinct patterns for claim, unclaim and long-press threshold.

- `navigator.vibrate` works on Android only; **iOS Safari has no web haptics
  API**. Real haptics on iPhone need the native app (see the native
  companion note in the README).

## 3. Claim hero animation: glow + outward gradient fill

When a state is claimed, the fill should bloom outward from the tap point to
the state's edges, with a soft glow, instead of the current stamp/spark burst.

- Likely approach: a radial gradient or expanding circle clipped to the
  state's own path, plus a blurred copy of the path for the glow.

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

## 7. Import photos by metadata

Pick photos and have them auto-sort into the right trip and step, using the
EXIF capture date and GPS, with no scrolling or manual tagging.

- Read EXIF on the client before upload (for example with `exifr`, which
  handles JPEG and HEIC). The server currently re-encodes to WebP with
  `sharp`, which strips metadata, so it must be read first and stored
  (`taken_at`, `lat`, `lng` on `photos`).
- Match each photo to a trip by date range, attach it to the nearest step in
  time and place, and suggest new steps for clusters with no step.
- **Platform limits:**
  - The iOS web photo picker can strip location unless the user turns on
    "Location" in the picker's Options.
  - A website can't query the photo library by date, so "show me only this
    trip's photos" without scrolling really needs the native app (PhotoKit).
  - The web version can still do multi-select plus automatic sorting.
