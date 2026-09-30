"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Records the microphone while you dictate, so a voice journal keeps the
 * voice. Low bitrate (32 kbps) keeps even a long entry small, and a level
 * meter drives the live bars. `peak` tells the caller if anything was heard:
 * some phones hand the mic to speech recognition and record silence.
 */

export interface Clip {
  blob: Blob;
  seconds: number;
  /** Loudest level seen, 0..1. */
  peak: number;
  url: string;
}

const MAX_SECONDS = 10 * 60;
const TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
const noSubscribe = () => () => {};

function pickType() {
  return TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "";
}

export function useRecorder() {
  const supported = useSyncExternalStore(
    noSubscribe,
    () => typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
    () => false,
  );
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const session = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    ctx: AudioContext;
    chunks: Blob[];
    started: number;
    peak: number;
    raf: number;
    done: Promise<Clip | null>;
  } | null>(null);

  const teardown = useCallback(() => {
    const s = session.current;
    if (!s) return;
    cancelAnimationFrame(s.raf);
    s.stream.getTracks().forEach((t) => t.stop());
    s.ctx.close().catch(() => {});
  }, []);

  useEffect(() => () => {
    if (session.current?.recorder.state === "recording") session.current.recorder.stop();
    teardown();
  }, [teardown]);

  /** Resolves false if the mic couldn't be opened (denied, none, unsupported). */
  const start = useCallback(async () => {
    if (!supported || session.current?.recorder.state === "recording") return false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return false;
    }
    const mimeType = pickType();
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    const chunks: Blob[] = [];
    const started = performance.now();

    const done = new Promise<Clip | null>((resolve) => {
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        const s = session.current;
        const seconds = (performance.now() - started) / 1000;
        teardown();
        setRecording(false);
        setLevel(0);
        if (!chunks.length) return resolve(null);
        const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0].type });
        resolve({ blob, seconds, peak: s?.peak ?? 0, url: URL.createObjectURL(blob) });
      };
    });

    session.current = { recorder, stream, ctx, chunks, started, peak: 0, raf: 0, done };
    let frame = 0;
    const tick = () => {
      const s = session.current;
      if (!s) return;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / buf.length);
      s.peak = Math.max(s.peak, rms);
      if (frame++ % 4 === 0) {
        setLevel(Math.min(1, rms * 4));
        const secs = (performance.now() - started) / 1000;
        setElapsed(secs);
        if (secs >= MAX_SECONDS) recorder.stop();
      }
      s.raf = requestAnimationFrame(tick);
    };
    recorder.start(1000);
    setRecording(true);
    setElapsed(0);
    session.current.raf = requestAnimationFrame(tick);
    return true;
  }, [supported, teardown]);

  /** Stops and hands back the clip (null if nothing was recorded). */
  const stop = useCallback(async (): Promise<Clip | null> => {
    const s = session.current;
    if (!s) return null;
    if (s.recorder.state !== "inactive") s.recorder.stop();
    const clip = await s.done;
    session.current = null;
    return clip;
  }, []);

  return { supported, recording, level, elapsed, start, stop };
}

export function formatSeconds(total: number) {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
