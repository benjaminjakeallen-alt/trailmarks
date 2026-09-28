"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRightIcon, MapPinIcon } from "@phosphor-icons/react";
import { Eyebrow } from "@/components/ui/Panel";
import { STATES_BY_CODE } from "@/lib/statesData";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { Memory } from "@/lib/types";

function hrefFor(memory: Memory) {
  if (memory.stateCode) return `/states/${memory.stateCode.toLowerCase()}`;
  if (memory.tripId) return `/trips/${memory.tripId}`;
  return "/memories";
}

export default function MemoryRail({ memories }: { memories: Memory[] }) {
  if (memories.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-8 lg:py-28">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Eyebrow>Lately</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-light tracking-[-0.03em] sm:text-5xl">Recent memories</h2>
        </div>
        <Link href="/memories" className="group flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-ink-2 hover:text-ink">
          All memories
          <ArrowRightIcon size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-8 sm:px-8">
        {memories.map((memory, i) => {
          const cover = memory.photos[0];
          const state = memory.stateCode ? STATES_BY_CODE[memory.stateCode] : null;
          return (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: i * 0.08 }}
              className="w-[78%] shrink-0 snap-start sm:w-[340px]"
            >
              <Link href={hrefFor(memory)} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-sunken ring-1 ring-line">
                  {cover ? (
                    <Image
                      src={cover.url}
                      alt={memory.title}
                      fill
                      sizes="340px"
                      className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                    />
                  ) : (
                    <div className="bg-topo flex h-full items-center justify-center text-ink-3">
                      <MapPinIcon size={34} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent p-5 pt-16 text-white">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">
                      {state?.name ?? "On the road"}
                    </p>
                    <p className="mt-1 font-display text-xl leading-tight">{memory.title}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
