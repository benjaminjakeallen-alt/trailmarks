"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TripMap, { type TripMapPin, type TripMapPoint } from "@/components/TripMap";
import { haversineMiles } from "@/lib/geo";
import type { TripDetail } from "@/lib/types";

const MIN_SECONDS_BETWEEN_POINTS = 10;
const MIN_MILES_BETWEEN_POINTS = 0.008; // ~13 meters

interface LiveRecorderProps {
  trip: TripDetail;
  pins: TripMapPin[];
  onPinClick?: (id: number | string) => void;
  onFinished: (newStateCodes: string[]) => void;
  onPointsChange?: (points: TripMapPoint[]) => void;
}

type GeoState = "idle" | "recording" | "unsupported" | "denied" | "error";

export default function LiveRecorder({
  trip,
  pins,
  onPinClick,
  onFinished,
  onPointsChange,
}: LiveRecorderProps) {
  const [points, setPoints] = useState<TripMapPoint[]>(
    trip.points.map((p) => ({ lat: p.lat, lng: p.lng })),
  );

  useEffect(() => {
    onPointsChange?.(points);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [finishing, setFinishing] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSavedRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  async function ensureTripStarted() {
    if (trip.status === "planned") {
      await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
    }
  }

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("unsupported");
      return;
    }

    await ensureTripStarted();
    setGeoState("recording");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const now = Date.now();
        const last = lastSavedRef.current;
        const secondsSince = last ? (now - last.time) / 1000 : Infinity;
        const distanceSince = last ? haversineMiles(last, { lat, lng }) : Infinity;

        if (secondsSince < MIN_SECONDS_BETWEEN_POINTS && distanceSince < MIN_MILES_BETWEEN_POINTS) {
          return;
        }

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
    stopWatching();
    setGeoState("idle");
  }

  async function finishTrip() {
    stopWatching();
    setFinishing(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish" }),
      });
      const data = await res.json();
      onFinished(data.newStateCodes ?? []);
    } finally {
      setFinishing(false);
    }
  }

  const isRecording = geoState === "recording";
  const isCompleted = trip.status === "completed";

  return (
    <div className="space-y-3">
      <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-border shadow-sm sm:h-[480px]">
        <TripMap points={points} pins={pins} onPinClick={onPinClick} followLatest={isRecording} />

        {isRecording && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording — keep this tab open
          </div>
        )}
      </div>

      {!isCompleted && (
        <div className="flex flex-wrap items-center gap-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              ● {points.length > 0 ? "Resume recording" : "Start recording"}
            </button>
          ) : (
            <button
              onClick={pauseRecording}
              className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-border/60"
            >
              ⏸ Pause recording
            </button>
          )}

          {points.length > 0 && (
            <button
              onClick={finishTrip}
              disabled={finishing}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground disabled:opacity-50"
            >
              {finishing ? "Finishing…" : "Finish trip"}
            </button>
          )}

          {geoState === "denied" && (
            <p className="w-full text-sm text-red-600">
              Location access was denied — enable it for this site in your browser settings to record a
              route.
            </p>
          )}
          {geoState === "unsupported" && (
            <p className="w-full text-sm text-red-600">
              This browser doesn&apos;t support GPS location.
            </p>
          )}
          {geoState === "error" && (
            <p className="w-full text-sm text-red-600">
              Couldn&apos;t get a location fix. Try again outdoors or with location services on.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
