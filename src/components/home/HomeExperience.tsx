"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRightIcon, ImagesIcon, MapPinIcon } from "@phosphor-icons/react";
import UsMap from "@/components/map/UsMap";
import StatsPanel from "@/components/home/StatsPanel";
import { StateCardBody, StateSheet } from "@/components/home/StateCard";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { WordReveal } from "@/components/motion/Reveal";
import { STATE_COUNT, STATES_BY_CODE } from "@/lib/statesData";
import { EASE_OUT_EXPO } from "@/lib/motion";

export interface HeroPhoto {
  url: string;
  title: string;
  stateCode: string | null;
}

function GlassStat({ label, value, suffix, delay }: { label: string; value: number; suffix?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay }}
      className="glass rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4"
    >
      <p className="text-[12.5px] font-medium text-white/75">{label}</p>
      <p className="mt-0.5 font-display text-[1.9rem] leading-none sm:text-[2.2rem]">
        <AnimatedNumber value={value} />
        {suffix && <span className="ml-1 text-[0.55em] font-medium text-white/60">{suffix}</span>}
      </p>
    </motion.div>
  );
}

export default function HomeExperience({
  initialVisited,
  hero,
  memoryCount,
}: {
  initialVisited: string[];
  hero: HeroPhoto | null;
  memoryCount: number;
}) {
  const [visited, setVisited] = useState<Set<string>>(() => new Set(initialVisited));
  const [selected, setSelected] = useState<string | null>(null);

  async function toggle(code: string) {
    const claim = !visited.has(code);
    const apply = (on: boolean) =>
      setVisited((prev) => {
        const next = new Set(prev);
        if (on) next.add(code);
        else next.delete(code);
        return next;
      });

    apply(claim);
    setSelected(code);

    const res = await fetch(`/api/states/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: claim, firstVisitedOn: claim ? new Date().toISOString().slice(0, 10) : null }),
    }).catch(() => null);

    if (!res?.ok) apply(!claim);
  }

  const visitedList = Array.from(visited);
  const claimedCount = visitedList.filter((c) => c !== "DC").length;
  const heroState = hero?.stateCode ? STATES_BY_CODE[hero.stateCode] : null;

  return (
    <>
      <section className="mx-auto max-w-[1400px] px-3 pt-2 sm:px-8 sm:pt-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: EASE_OUT_EXPO }}
          className="relative isolate flex min-h-[560px] overflow-hidden rounded-[2rem] text-white sm:min-h-[600px] lg:min-h-[620px]"
        >
          {hero ? (
            <motion.div
              className="absolute inset-0 -z-10"
              initial={{ scale: 1.12 }}
              animate={{ scale: 1 }}
              transition={{ duration: 2.6, ease: EASE_OUT_EXPO }}
            >
              <Image src={hero.url} alt="" fill priority sizes="(min-width: 1400px) 1400px, 100vw" className="object-cover" />
            </motion.div>
          ) : (
            <div className="brand-gradient absolute inset-0 -z-10" />
          )}
          <div className="photo-scrim absolute inset-0 -z-10" />

          <div className="grid w-full grid-cols-1 content-end gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:items-end lg:p-14">
            <div className="lg:col-span-8">
              {hero && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: 0.2 }}
                  className="glass mb-6 inline-flex max-w-full items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium"
                >
                  <MapPinIcon size={15} weight="fill" className="shrink-0 text-sun" />
                  <span className="truncate">
                    {hero.title}
                    {heroState && <span className="text-white/65"> · {heroState.name}</span>}
                  </span>
                </motion.p>
              )}

              <WordReveal
                text={"Every state,\nremembered."}
                delay={0.1}
                className="font-display text-[clamp(3.2rem,8vw,6.75rem)] leading-[0.95] tracking-[-0.04em] [&>span:last-child]:text-aqua-bright"
              />

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.55 }}
                className="mt-5 max-w-[42ch] text-[17px] leading-[1.6] text-white/80"
              >
                Claim the states you&apos;ve stood in. Record a trip and Trailmarks draws the route, fills in
                the map, and turns your photos into a story.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.7 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <ButtonLink href="/trips/new" variant="light" trailingIcon={<ArrowUpRightIcon size={15} />}>
                  Start a trip
                </ButtonLink>
                <ButtonLink href="/memories" variant="glass" icon={<ImagesIcon size={18} />}>
                  Replay memories
                </ButtonLink>
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:col-span-4 lg:w-full lg:max-w-[260px] lg:grid-cols-1 lg:justify-self-end">
              <GlassStat label="States claimed" value={claimedCount} suffix={`/ ${STATE_COUNT}`} delay={0.8} />
              <GlassStat label="Memories" value={memoryCount} delay={0.9} />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1400px] px-3 pb-6 pt-4 sm:px-8 sm:pt-6 lg:pb-8">
        <Panel innerClassName="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="relative p-3 sm:p-8 lg:p-10">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2 pt-2 sm:mb-6 sm:px-0 sm:pt-0">
                <div>
                  <h2 className="font-display text-2xl sm:text-[1.75rem]">Your map</h2>
                  <p className="text-[14px] text-ink-3">Tap a state to claim it. Tap again to undo.</p>
                </div>
                <div className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-aqua-soft px-3 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-aqua-bright to-petrol" /> Claimed
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-land ring-1 ring-line-strong" /> Not yet
                  </span>
                </div>
              </div>
              <UsMap visited={visited} selectedCode={selected} onStateTap={toggle} />
            </div>

            <aside className="hidden border-l border-line p-7 lg:block">
              <StateCardBody
                code={selected}
                claimed={selected ? visited.has(selected) : false}
                onToggle={toggle}
                fallback={<StatsPanel visitedCodes={visitedList} bare />}
              />
            </aside>
          </div>
        </Panel>
      </section>

      {/* On phones the stats follow the map; the selected state rides in a sheet. */}
      <section className="mx-auto max-w-[1400px] px-3 sm:px-8 lg:hidden">
        <Panel>
          <StatsPanel visitedCodes={visitedList} />
        </Panel>
      </section>

      <StateSheet
        code={selected}
        claimed={selected ? visited.has(selected) : false}
        onToggle={toggle}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
