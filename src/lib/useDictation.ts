"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Voice-to-text with the browser's own speech recognition: Safari/iOS routes
 * it through Apple's dictation, Chrome through Google's. Free, no key, text
 * streams in while you talk. Firefox has none, so `supported` is false there.
 */

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is off for this site. Turn it on in your browser settings.",
  "service-not-allowed": "Dictation is turned off on this device (Settings → General → Keyboard → Enable Dictation).",
  "audio-capture": "No microphone found.",
  network: "Dictation needs a connection right now. Try again when you're back online.",
};

/** Joins dictated phrases with sensible spacing and a capital letter to start. */
function joinText(base: string, addition: string) {
  const add = addition.trim();
  if (!add) return base;
  const sep = !base || /\s$/.test(base) ? "" : " ";
  const needsCap = !base.trim() || /[.!?]\s*$/.test(base);
  return base + sep + (needsCap ? add[0].toUpperCase() + add.slice(1) : add);
}

const noSubscribe = () => () => {};

export function useDictation(onText: (text: string) => void) {
  // False on the server and in the first client render, then the real answer: no hydration mismatch.
  const supported = useSyncExternalStore(noSubscribe, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    return () => {
      wanted.current = false;
      rec.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    rec.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) onTextRef.current(result[0].transcript);
        else live += result[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(ERRORS[e.error] ?? "Dictation stopped. Tap the mic to try again.");
      wanted.current = false;
    };
    // Safari ends a session after a pause; keep going until the person taps stop.
    r.onend = () => {
      if (wanted.current) {
        try {
          r.start();
          return;
        } catch {
          // fall through to stopped
        }
      }
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    wanted.current = true;
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Couldn't start dictation.");
    }
  }, []);

  return { supported, listening, interim, error, start, stop, toggle: listening ? stop : start };
}

export { joinText };
