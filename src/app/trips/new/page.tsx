"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import RouteSketch from "@/components/trips/RouteSketch";
import { Button } from "@/components/ui/Button";
import { Label, TextArea } from "@/components/ui/Field";
import { EASE_OUT_EXPO } from "@/lib/motion";

export default function NewTripPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Every trip needs a name.");
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
      if (!res.ok) throw new Error();
      const { trip } = await res.json();
      router.push(`/trips/${trip.id}`);
    } catch {
      setError("Couldn't create the trip. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-4 pb-24 pt-6 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:pt-10">
      <div className="lg:col-span-6">
        <Link href="/trips" className="group inline-flex items-center gap-2 text-[15px] font-medium text-fg-muted hover:text-fg">
          <ArrowLeftIcon size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
          All trips
        </Link>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          className="mt-10"
        >
          <h1 className="sr-only">New trip</h1>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name this trip"
            aria-label="Trip name"
            className="w-full bg-transparent font-display text-[clamp(2.4rem,5.5vw,4.25rem)] leading-[1] tracking-[-0.035em] outline-none placeholder:text-fg-subtle/50"
          />
          <div className="mt-3 h-0.5 w-full rounded-full bg-gradient-to-r from-success via-accent/30 to-transparent" />

          <div className="mt-8">
            <Label htmlFor="trip-desc">The plan (optional)</Label>
            <TextArea
              id="trip-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nashville to the Blue Ridge, slow roads only"
            />
          </div>

          {error && <p className="mt-4 text-sm text-danger-fg">{error}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={submitting} trailingIcon={<ArrowRightIcon size={15} />}>
              {submitting ? "Creating…" : "Create trip"}
            </Button>
          </div>
        </motion.form>
      </div>

      <motion.div
        className="hidden lg:col-span-6 lg:block"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.1 }}
      >
        <div className="brand-gradient relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-[var(--shadow-card)]">
          <RouteSketch points={[]} demo onPhoto className="h-full w-full" />
        </div>
      </motion.div>
    </div>
  );
}
