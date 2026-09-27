"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTripPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give your trip a name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error("Failed");
      const { trip } = await res.json();
      router.push(`/trips/${trip.id}`);
    } catch {
      setError("Something went wrong creating that trip. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <Link href="/trips" className="text-sm font-medium text-foreground-muted hover:text-accent">
        ← Back to trips
      </Link>

      <h1 className="mt-4 mb-6 font-display text-3xl font-semibold tracking-tight">New trip</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground-muted">Trip name</label>
          <input
            type="text"
            autoFocus
            placeholder="e.g. Appalachian road trip"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none ring-accent/40 placeholder:text-foreground-muted focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
            Description <span className="text-foreground-muted/60">(optional)</span>
          </label>
          <textarea
            placeholder="What's the plan?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none ring-accent/40 placeholder:text-foreground-muted focus:ring-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create trip"}
        </button>

        <p className="text-center text-xs text-foreground-muted">
          You&apos;ll start recording your route from the trip page — location access is only used
          while that page is open.
        </p>
      </form>
    </div>
  );
}
