"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon, XIcon } from "@phosphor-icons/react";
import { formatSeconds } from "@/lib/useRecorder";

/** Fixed pseudo-waveform, so every note has its own shape without decoding the audio. */
function bars(seed: string, n: number) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const wave = Math.sin(i / 2.3) * 0.25 + 0.55;
    return Math.max(0.18, Math.min(1, wave + ((h % 100) / 100 - 0.5) * 0.6));
  });
}

/** A voice note: play/pause, a waveform that fills as it plays, and the time. */
export default function VoiceNote({
  src,
  seconds,
  label = "Voice note",
  onRemove,
  className = "",
}: {
  src: string;
  seconds: number | null;
  label?: string;
  onRemove?: () => void;
  className?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(seconds ?? 0);
  const shape = bars(src, 36);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onTime = () => setProgress(a.duration && Number.isFinite(a.duration) ? a.currentTime / a.duration : 0);
    const onMeta = () => Number.isFinite(a.duration) && setDuration(a.duration);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("pause", () => setPlaying(false));
    a.addEventListener("play", () => setPlaying(true));
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }

  function seek(e: React.PointerEvent<HTMLDivElement>) {
    const a = audio.current;
    if (!a || !Number.isFinite(a.duration)) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
    setProgress(a.currentTime / a.duration);
  }

  return (
    <div className={`flex items-center gap-3 rounded-full bg-coral-soft py-1.5 pl-1.5 pr-4 ${className}`}>
      <audio ref={audio} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral text-white transition-transform active:scale-95"
      >
        {playing ? <PauseIcon size={16} weight="fill" /> : <PlayIcon size={16} weight="fill" />}
      </button>
      <div className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[2px]" onPointerDown={seek} aria-hidden>
        {shape.map((v, i) => (
          <span
            key={i}
            className={`w-[3px] shrink-0 rounded-full transition-colors ${i / shape.length < progress ? "bg-coral" : "bg-coral/30"}`}
            style={{ height: `${v * 100}%` }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-coral">
        {formatSeconds(playing || progress ? duration * progress : duration)}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove recording"
          className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-coral/70 hover:bg-coral/10 hover:text-coral"
        >
          <XIcon size={15} />
        </button>
      )}
    </div>
  );
}
