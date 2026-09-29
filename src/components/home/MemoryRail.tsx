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
    <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-8 lg:py-20">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Eyebrow>Lately</Eyebrow>
          <h2 className="mt-2 font-display text-3xl sm:text-[2.5rem]">Recent memories</h2>
        </div>
        <Link href="/memories" className="group flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[15px] font-semibold text-petrol hover:text-petrol-strong">
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
              className="w-[74%] shrink-0 snap-start sm:w-[300px]"
            >
              <Link href={hrefFor(memory)} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-sunken shadow-[var(--shadow-card)]">
                  {cover ? (
                    <Image
                      src={cover.url}
                      alt={memory.title}
                      fill
                      sizes="300px"
                      className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                    />
                  ) : (
                    <div className="brand-gradient flex h-full items-center justify-center text-white/70">
                      <MapPinIcon size={34} />
                    </div>
                  )}
                  <div className="photo-scrim absolute inset-x-0 bottom-0 p-5 pt-20 text-white">
                    <p className="font-display text-[1.35rem] leading-tight">{memory.title}</p>
                    <p className="mt-1.5 flex items-center gap-1 text-[13px] text-white/75">
                      <MapPinIcon size={14} weight="fill" className="text-sun" />
                      {state?.name ?? "On the road"}
                    </p>
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
