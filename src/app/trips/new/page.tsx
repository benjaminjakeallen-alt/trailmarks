"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon, NavigationArrowIcon } from "@phosphor-icons/react";
import RouteSketch from "@/components/trips/RouteSketch";
import { Button } from "@/components/ui/Button";
import { Label, TextArea } from "@/components/ui/Field";
import { Eyebrow } from "@/components/ui/Panel";
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
        <Link href="/trips" className="group inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
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
          <Eyebrow>New trip</Eyebrow>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name this trip"
            aria-label="Trip name"
            className="mt-5 w-full bg-transparent font-display text-[clamp(2.4rem,5.5vw,4.25rem)] font-light leading-[1] tracking-[-0.04em] outline-none placeholder:text-ink-3/60"
          />
          <div className="mt-3 h-px w-full bg-gradient-to-r from-line-strong to-transparent" />

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

          {error && <p className="mt-4 text-sm text-ember-strong">{error}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={submitting} trailingIcon={<ArrowRightIcon size={15} />}>
              {submitting ? "Creating…" : "Create trip"}
            </Button>
            <p className="flex max-w-[34ch] items-start gap-2 text-[13px] leading-relaxed text-ink-3">
              <NavigationArrowIcon size={15} className="mt-0.5 shrink-0" />
              You&apos;ll start recording from the trip page. Location is only used while it&apos;s open.
            </p>
          </div>
        </motion.form>
      </div>

      <motion.div
        className="hidden lg:col-span-6 lg:block"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.1 }}
      >
        <div className="rounded-[2rem] bg-ink/[0.03] p-1.5 ring-1 ring-line">
          <div className="bg-topo aspect-[4/3] overflow-hidden rounded-[calc(2rem-0.375rem)] bg-elevated ring-1 ring-line">
            <RouteSketch points={[]} demo className="h-full w-full" />
          </div>
        </div>
        <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
          Your route draws itself as you drive
        </p>
      </motion.div>
    </div>
  );
}
