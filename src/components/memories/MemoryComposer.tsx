"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MicrophoneIcon, PencilSimpleIcon, MapPinIcon, StopIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { DateInput, Label, TextArea } from "@/components/ui/Field";
import PhotoDropzone from "@/components/memories/PhotoDropzone";
import VoiceNote from "@/components/memories/VoiceNote";
import { appendMeta, localDay, readPhotoMeta } from "@/lib/photoMeta";
import { EASE_OUT_EXPO, HAPTICS, haptic } from "@/lib/motion";
import { joinText, useDictation } from "@/lib/useDictation";
import { formatSeconds, useRecorder, type Clip } from "@/lib/useRecorder";
import { audioExtension } from "@/lib/audio";
import type { Memory, Photo } from "@/lib/types";

interface MemoryComposerProps {
  /** POST target for the memory itself, e.g. /api/states/tn/memories */
  endpoint: string;
  /** Tag uploaded photos with a state, when the memory belongs to one. */
  photoStateCode?: string;
  /** Pin the memory to the device's current location (trip steps). */
  captureLocation?: boolean;
  fallbackPoint?: { lat: number; lng: number } | null;
  prompt: string;
  titlePlaceholder: string;
  onCreated: (memory: Memory) => void;
  /** Open straight into the form (e.g. inside the journal panel). */
  startOpen?: boolean;
}

/** A dictated entry with no title gets its first sentence (trimmed) as one. */
function titleFrom(body: string) {
  const first = body.trim().split(/(?<=[.!?])\s/)[0] ?? "";
  const words = first.replace(/[.!?]+$/, "").split(/\s+/);
  return words.length > 8 ? `${words.slice(0, 8).join(" ")}…` : words.join(" ");
}

function currentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 10000,
    });
  });
}

export default function MemoryComposer({
  endpoint,
  photoStateCode,
  captureLocation = false,
  fallbackPoint,
  prompt,
  titlePlaceholder,
  onCreated,
  startOpen = false,
}: MemoryComposerProps) {
  const [open, setOpen] = useState(startOpen);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Live words come from the browser's speech recognition; the recorder keeps the voice itself.
  const heard = useRef(false);
  const dictation = useDictation((text) => {
    heard.current = true;
    setBody((prev) => joinText(prev, text));
  });
  const recorder = useRecorder();
  const [clip, setClip] = useState<Clip | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const listening = dictation.listening || recorder.recording;
  const voiceSupported = dictation.supported || recorder.supported;

  async function startVoice() {
    haptic(HAPTICS.holdThreshold);
    heard.current = false;
    setVoiceNote(null);
    const recording = recorder.supported ? await recorder.start() : false;
    if (dictation.supported) dictation.start();
    else if (!recording) setVoiceNote("Microphone access is off for this site. Turn it on in your browser settings.");
  }

  async function transcribe(c: Clip) {
    setVoiceNote("Turning your recording into words…");
    const form = new FormData();
    form.append("file", c.blob, `note.${audioExtension(c.blob.type) ?? "webm"}`);
    const res = await fetch("/api/transcribe", { method: "POST", body: form }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (data?.text) {
      setBody((prev) => joinText(prev, data.text));
      setVoiceNote(null);
    } else {
      setVoiceNote("Recording kept. It couldn't be turned into words right now, so add a line about it.");
    }
  }

  async function stopVoice() {
    haptic(HAPTICS.select);
    dictation.stop();
    const c = await recorder.stop();
    if (!c) return;
    // Near-silent: the mic went to speech recognition instead. Keep the words, skip the empty audio.
    if (c.peak < 0.015) {
      URL.revokeObjectURL(c.url);
      if (!heard.current) setVoiceNote("Didn't catch anything. Try again a little closer to the mic.");
      return;
    }
    setClip((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return c;
    });
    if (!heard.current) await transcribe(c);
  }

  const toggleVoice = () => (listening ? stopVoice() : startVoice());

  function dropClip() {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
  }

  function reset() {
    dictation.stop();
    recorder.stop();
    dropClip();
    setVoiceNote(null);
    setTitle("");
    setBody("");
    setMemoryDate("");
    setFiles([]);
    setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (listening) await stopVoice();
    const finalTitle = title.trim() || titleFrom(body) || (clip ? "Voice note" : "");
    if (!finalTitle) {
      setError("Give it a title, or say a few words.");
      return;
    }
    setError(null);
    setStatus("Saving…");

    try {
      let coords: { lat: number | null; lng: number | null } = { lat: null, lng: null };
      if (captureLocation) {
        setStatus("Pinning your location…");
        const pos = await currentPosition();
        coords = {
          lat: pos?.coords.latitude ?? fallbackPoint?.lat ?? null,
          lng: pos?.coords.longitude ?? fallbackPoint?.lng ?? null,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: finalTitle, body, memoryDate: memoryDate || null, ...coords }),
      });
      if (!res.ok) throw new Error();
      const { memory } = (await res.json()) as { memory: Memory };

      let audio: Pick<Memory, "audioUrl" | "audioSeconds"> = { audioUrl: null, audioSeconds: null };
      if (clip) {
        setStatus("Saving the recording…");
        const form = new FormData();
        form.append("file", clip.blob, `note.${audioExtension(clip.blob.type) ?? "webm"}`);
        form.append("seconds", String(Math.round(clip.seconds)));
        const up = await fetch(`/api/memories/${memory.id}/audio`, { method: "POST", body: form }).catch(() => null);
        if (up?.ok) audio = await up.json();
      }

      const photos: Photo[] = [];
      for (const [i, file] of files.entries()) {
        setStatus(`Uploading photo ${i + 1} of ${files.length}…`);
        const form = new FormData();
        form.append("file", file);
        appendMeta(form, await readPhotoMeta(file));
        form.append("memoryId", String(memory.id));
        if (photoStateCode) form.append("stateCode", photoStateCode);
        const up = await fetch("/api/photos", { method: "POST", body: form });
        if (up.ok) photos.push((await up.json()).photo);
      }

      onCreated({ ...memory, ...audio, photos });
      reset();
    } catch {
      setError("That didn't save. Check your connection and try again.");
    } finally {
      setStatus(null);
    }
  }

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.5, ease: EASE_OUT_EXPO } }}
      className="overflow-hidden rounded-[1.75rem] bg-elevated shadow-[var(--shadow-card)] ring-1 ring-line"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {!open ? (
          <motion.div
            key="closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3"
          >
            <button type="button" onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-petrol text-white">
                <PencilSimpleIcon size={18} weight="regular" />
              </span>
              <span className="flex-1 truncate text-[15px] text-ink-3">{prompt}</span>
              {captureLocation && <MapPinIcon size={18} className="shrink-0 text-ink-3" />}
            </button>
            {voiceSupported && (
              <button
                type="button"
                onClick={() => {
                  setOpen(true);
                  toggleVoice();
                }}
                className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-coral-soft px-4 text-[14px] font-semibold text-coral transition-transform active:scale-95"
              >
                <MicrophoneIcon size={18} weight="fill" /> Speak it
              </button>
            )}
          </motion.div>
        ) : (
          <motion.form
            key="open"
            onSubmit={submit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            className="space-y-4 p-5 sm:p-6"
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder}
              aria-label="Title"
              className="w-full bg-transparent font-display text-[1.7rem] leading-tight outline-none placeholder:text-ink-3/70"
            />

            <div>
              <div className="relative">
                <TextArea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    listening
                      ? "Listening… say what happened."
                      : "What happened here? Write it, or tap the mic and say it."
                  }
                  aria-label="Story"
                  className="pr-16"
                />
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    aria-label={listening ? "Stop recording" : "Record with your voice"}
                    aria-pressed={listening}
                    className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                      listening ? "bg-coral text-white" : "bg-coral-soft text-coral hover:bg-coral hover:text-white"
                    }`}
                  >
                    {listening && (
                      <span
                        className="absolute inset-0 rounded-full bg-coral/35 transition-transform duration-100"
                        style={{ transform: `scale(${1 + recorder.level * 0.9})` }}
                      />
                    )}
                    <span className="relative">
                      {listening ? <StopIcon size={16} weight="fill" /> : <MicrophoneIcon size={19} weight="fill" />}
                    </span>
                  </button>
                )}
              </div>
              <AnimatePresence>
                {(listening || voiceNote || (dictation.error && !recorder.recording)) && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-2 flex items-start gap-2 text-[13.5px] ${
                      !listening && (voiceNote || dictation.error) ? "text-coral" : "text-ink-3"
                    }`}
                  >
                    {listening ? (
                      <>
                        <span className="mt-1.5 flex h-2 w-2 shrink-0">
                          <span className="record-pulse absolute h-2 w-2 rounded-full bg-coral" />
                          <span className="relative h-2 w-2 rounded-full bg-coral" />
                        </span>
                        {recorder.recording && (
                          <span className="shrink-0 font-semibold tabular-nums text-coral">
                            {formatSeconds(recorder.elapsed)}
                          </span>
                        )}
                        <span className="italic">
                          {dictation.interim || (dictation.listening ? "Listening…" : "Recording… you'll get the words when you stop.")}
                        </span>
                      </>
                    ) : (
                      (voiceNote ?? dictation.error)
                    )}
                  </motion.p>
                )}
              </AnimatePresence>
              {clip && !listening && (
                <VoiceNote src={clip.url} seconds={clip.seconds} label="your recording" onRemove={dropClip} className="mt-3" />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
              <div>
                <Label htmlFor="memory-date">When</Label>
                <DateInput id="memory-date" value={memoryDate} onChange={(e) => setMemoryDate(e.target.value)} />
              </div>
              <div>
                <Label>Photos</Label>
                <PhotoDropzone
                  files={files}
                  onChange={async (next) => {
                    setFiles(next);
                    // No date yet? Use the day the earliest photo was taken.
                    if (!memoryDate && next.length) {
                      const dates = (await Promise.all(next.map(readPhotoMeta)))
                        .map((m) => m.takenAt)
                        .filter((d): d is Date => d != null);
                      if (dates.length) {
                        setMemoryDate((current) => current || localDay(new Date(Math.min(...dates.map(Number)))));
                      }
                    }
                  }}
                />
              </div>
            </div>

            {captureLocation && (
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
                <MapPinIcon size={13} /> Pinned to where you are when you save
              </p>
            )}

            {error && <p className="text-sm text-coral">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              {status && <span className="mr-auto text-[13px] font-medium text-ink-3">{status}</span>}
              <Button type="button" variant="quiet" onClick={reset} disabled={!!status}>
                Cancel
              </Button>
              <Button type="submit" disabled={!!status}>
                Save memory
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
