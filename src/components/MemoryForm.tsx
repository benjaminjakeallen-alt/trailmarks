"use client";

import { useRef, useState } from "react";
import type { Memory } from "@/lib/types";

interface MemoryFormProps {
  stateCode: string;
  onCreated: (memory: Memory) => void;
}

export default function MemoryForm({ stateCode, onCreated }: MemoryFormProps) {
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
      setError("Give this memory a title.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/states/${stateCode}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, memoryDate: memoryDate || null }),
      });
      if (!res.ok) throw new Error("Could not save memory");
      const { memory } = (await res.json()) as { memory: Memory };

      const uploadedPhotos = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("stateCode", stateCode);
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
      setError("Something went wrong saving that memory. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <h3 className="font-display text-lg font-semibold">Add a memory</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          placeholder="Title — e.g. Hiking Zion at sunrise"
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
        placeholder="What happened? Write the story while it's fresh…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
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
          {submitting ? "Saving…" : "Save memory"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
