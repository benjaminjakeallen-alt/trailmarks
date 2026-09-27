"use client";

import { useRef, useState } from "react";
import type { Memory } from "@/lib/types";

interface TripStepFormProps {
  tripId: number;
  lastKnownPoint?: { lat: number; lng: number } | null;
  onCreated: (memory: Memory) => void;
}

function getCurrentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
    );
  });
}

export default function TripStepForm({ tripId, lastKnownPoint, onCreated }: TripStepFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give this step a title.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const position = await getCurrentPosition();
      const lat = position?.coords.latitude ?? lastKnownPoint?.lat ?? null;
      const lng = position?.coords.longitude ?? lastKnownPoint?.lng ?? null;

      const res = await fetch(`/api/trips/${tripId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, memoryDate: memoryDate || null, lat, lng }),
      });
      if (!res.ok) throw new Error("Could not save step");
      const { memory } = (await res.json()) as { memory: Memory };

      const uploadedPhotos = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("memoryId", String(memory.id));
        const photoRes = await fetch("/api/photos", { method: "POST", body: form });
        if (photoRes.ok) {
          const { photo } = await photoRes.json();
          uploadedPhotos.push(photo);
        }
      }

      onCreated({ ...memory, photos: uploadedPhotos });
      setTitle("");
      setBody("");
      setMemoryDate("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Something went wrong saving that step. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <h3 className="font-display text-lg font-semibold">Add a step</h3>
      <p className="text-xs text-foreground-muted">
        Drops a pin at your current location on the trip map.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          placeholder="Title — e.g. Lunch stop in Asheville"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none ring-accent/40 placeholder:text-foreground-muted focus:ring-2"
        />
        <input
          type="date"
          value={memoryDate}
          onChange={(e) => setMemoryDate(e.target.value)}
          className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none ring-accent/40 focus:ring-2"
        />
      </div>

      <textarea
        placeholder="What happened here?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none ring-accent/40 placeholder:text-foreground-muted focus:ring-2"
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-xl border border-dashed border-border px-3.5 py-2 text-sm text-foreground-muted transition-colors hover:border-accent hover:text-accent">
          📷 {files.length > 0 ? `${files.length} photo${files.length > 1 ? "s" : ""} selected` : "Add photos"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="ml-auto rounded-xl bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save step"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
