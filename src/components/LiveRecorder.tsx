"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FlagCheckeredIcon, PauseIcon, WarningIcon } from "@phosphor-icons/react";
import TripMap, { type TripMapPin, type TripMapPoint } from "@/components/TripMap";
import { haversineMiles } from "@/lib/geo";
import { EASE_OUT_EXPO, haptic } from "@/lib/motion";
import type { TripDetail } from "@/lib/types";

const MIN_SECONDS_BETWEEN_POINTS = 10;
const MIN_MILES_BETWEEN_POINTS = 0.008; // ~13 meters

interface LiveRecorderProps {
  trip: TripDetail;
  /** Only the person who owns the trip gets the record/finish dock. */
  canRecord: boolean;
  pins: TripMapPin[];
  onPinClick?: (id: number | string) => void;
  onFinished: (newStateCodes: string[]) => void;
  onPointsChange?: (points: TripMapPoint[]) => void;
  onRecordingChange?: (recording: boolean) => void;
}

type GeoState = "idle" | "recording" | "unsupported" | "denied" | "error";

const GEO_ERRORS: Partial<Record<GeoState, string>> = {
  denied: "Location access is off for this site. Turn it on in your browser settings to record a route.",
  unsupported: "This browser can't share GPS location.",
  error: "Couldn't get a location fix. Try again with a clearer view of the sky.",
};

export default function LiveRecorder({
  trip,
  canRecord,
  pins,
  onPinClick,
  onFinished,
  onPointsChange,
  onRecordingChange,
}: LiveRecorderProps) {
  const [points, setPoints] = useState<TripMapPoint[]>(() => trip.points.map((p) => ({ lat: p.lat, lng: p.lng })));
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [finishing, setFinishing] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSavedRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  useEffect(() => {
    onPointsChange?.(points);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  const recording = geoState === "recording";
  useEffect(() => {
    onRecordingChange?.(recording);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("unsupported");
      return;
    }
    haptic(12);
    if (trip.status === "planned") {
      await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
    }
    setGeoState("recording");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const now = Date.now();
        const last = lastSavedRef.current;
        const seconds = last ? (now - last.time) / 1000 : Infinity;
        const miles = last ? haversineMiles(last, { lat, lng }) : Infinity;
        if (seconds < MIN_SECONDS_BETWEEN_POINTS && miles < MIN_MILES_BETWEEN_POINTS) return;

        lastSavedRef.current = { lat, lng, time: now };
        setPoints((prev) => [...prev, { lat, lng }]);
        fetch(`/api/trips/${trip.id}/points`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, recordedAt: new Date().toISOString() }),
        }).catch(() => {});
      },
      (error) => {
        setGeoState(error.code === error.PERMISSION_DENIED ? "denied" : "error");
        stopWatching();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }

  function pauseRecording() {
    haptic(8);
    stopWatching();
    setGeoState("idle");
  }

  async function finishTrip() {
    stopWatching();
    setGeoState("idle");
    setFinishing(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish" }),
      });
      const data = await res.json();
      haptic([10, 50, 10, 50, 24]);
      onFinished(data.newStateCodes ?? []);
    } finally {
      setFinishing(false);
    }
  }

  const completed = trip.status === "completed";
  const statusText = recording
    ? "Recording — keep this screen open"
    : points.length > 0
      ? "Paused"
      : "Ready when you are";

  return (
    <div>
      <div className="rounded-[2rem] bg-surface p-1.5 shadow-[var(--shadow-card)] ring-1 ring-line">
        <div className="relative h-[62dvh] min-h-[380px] overflow-hidden rounded-[calc(2rem-0.375rem)] bg-surface-sunken sm:h-[560px]">
          <TripMap points={points} pins={pins} onPinClick={onPinClick} followLatest={recording} />

          {!completed && canRecord && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 sm:p-5">
              <motion.div
                layout
                transition={{ layout: { duration: 0.45, ease: EASE_OUT_EXPO } }}
                className="pointer-events-auto flex items-center gap-3 rounded-full bg-surface/85 p-2 pr-3 shadow-[var(--shadow-float)] ring-1 ring-line backdrop-blur-xl"
              >
                <button
                  type="button"
                  onClick={recording ? pauseRecording : startRecording}
                  aria-label={recording ? "Pause recording" : points.length ? "Resume recording" : "Start recording"}
                  className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-danger text-on-danger shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_10px_22px_-10px_var(--danger)] transition-transform duration-200 active:scale-95"
                >
                  {recording && <span className="record-pulse absolute inset-0 rounded-full bg-danger" />}
                  <AnimatePresence mode="wait" initial={false}>
                    {recording ? (
                      <motion.span
                        key="pause"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        className="relative"
                      >
                        <PauseIcon size={22} weight="fill" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="rec"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        className="relative h-5 w-5 rounded-full bg-white"
                      />
                    )}
                  </AnimatePresence>
                </button>

                <div className="min-w-0 pr-1">
                  <p className="text-[12px] font-medium text-fg-subtle">
                    {recording ? "Live" : "Route"}
                  </p>
                  <p className="truncate text-[15px] font-semibold">{statusText}</p>
                </div>

                {points.length > 0 && (
                  <button
                    type="button"
                    onClick={finishTrip}
                    disabled={finishing}
                    className="ml-1 flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-medium text-on-accent transition-transform hover:bg-accent-strong active:scale-95 disabled:opacity-50"
                  >
                    <FlagCheckeredIcon size={16} />
                    {finishing ? "Finishing…" : "Finish"}
                  </button>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {GEO_ERRORS[geoState] && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-fg"
          >
            <WarningIcon size={18} className="mt-px shrink-0 text-danger-fg" />
            {GEO_ERRORS[geoState]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
