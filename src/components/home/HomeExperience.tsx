"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import UsMap from "@/components/map/UsMap";
import WorldGlobe from "@/components/map/WorldGlobe";
import { CountryBar } from "@/components/home/CountryCard";
import { COUNTRIES_BY_CODE, COUNTRY_COUNT } from "@/lib/countriesData";
import { GlobeHemisphereWestIcon, MapTrifoldIcon, NotebookIcon, XIcon } from "@phosphor-icons/react";
import { StatsDrawer, StatsPill } from "@/components/home/StatsDrawer";
import SelectedStateBar from "@/components/home/SelectedStateBar";
import JournalPanel, { originOf, type JournalOrigin } from "@/components/home/JournalPanel";
import { STATES_BY_CODE } from "@/lib/statesData";
import { useFamily } from "@/components/family/FamilyProvider";
import CrewDock from "@/components/family/CrewDock";
import { Panel } from "@/components/ui/Panel";
import { WordReveal } from "@/components/motion/Reveal";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { FamilyCountryVisit, FamilyVisit } from "@/lib/types";

const barMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.35, ease: EASE_OUT_EXPO },
};

function Legend({ family }: { family: boolean }) {
  const chip = "flex items-center gap-1.5 rounded-full px-3 py-1";
  const dot = "h-2.5 w-2.5 rounded-full";
  if (!family) {
    return (
      <>
        <span className={`${chip} bg-success-soft`}>
          <span className={`${dot} bg-gradient-to-br from-success-bright to-accent`} /> Claimed
        </span>
        <span className={`${chip} bg-canvas`}>
          <span className={`${dot} bg-map-land ring-1 ring-line-strong`} /> Not yet
        </span>
      </>
    );
  }
  return (
    <>
      <span className={`${chip} bg-success-soft`}>
        <span className={`${dot} bg-gradient-to-br from-success-bright to-accent`} /> You
      </span>
      <span className={`${chip} bg-canvas`}>
        <span className={`${dot} bg-success-bright/45`} /> Family
      </span>
      <span className={`${chip} bg-reward-soft`}>
        <span className={`${dot} bg-gradient-to-br from-[#fff1b8] via-[#f5b929] to-[#b47a06]`} /> Everyone
      </span>
    </>
  );
}

/** World view's counter: countries you've been to, out of the independent ones. */
function WorldPill({ count }: { count: number }) {
  return (
    <div className="flex h-11 items-center gap-2.5 rounded-full bg-accent pl-2 pr-4 text-on-accent shadow-[0_12px_24px_-14px_var(--accent)]">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
        <GlobeHemisphereWestIcon size={16} weight="bold" />
      </span>
      <span className="flex items-baseline gap-1">
        <span className="font-display text-[1.2rem] leading-none">{count}</span>
        <span className="text-[13px] font-medium text-on-accent/90">/ {COUNTRY_COUNT} countries</span>
      </span>
    </div>
  );
}

/** USA ⇄ World. */
function ViewSwitch({ view, onChange }: { view: "us" | "world"; onChange: (v: "us" | "world") => void }) {
  return (
    <div className="inline-flex rounded-full bg-canvas p-1 ring-1 ring-line" role="tablist" aria-label="Map">
      {(["us", "world"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={view === v}
          onClick={() => onChange(v)}
          className={`relative rounded-full px-4 py-1.5 text-[13.5px] font-semibold transition-colors ${view === v ? "text-white" : "text-fg-muted hover:text-fg"}`}
        >
          {view === v && <motion.span layoutId="map-view" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
          <span className="relative">{v === "us" ? "USA" : "World"}</span>
        </button>
      ))}
    </div>
  );
}

export default function HomeExperience({
  initialVisits,
  initialCountryVisits,
}: {
  initialVisits: FamilyVisit[];
  initialCountryVisits: FamilyCountryVisit[];
}) {
  const { viewer, members } = useFamily();
  const me = viewer?.userId ?? "";
  const [visits, setVisits] = useState(initialVisits);
  const [selected, setSelected] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [journal, setJournal] = useState<{ code: string; origin: JournalOrigin | null } | null>(null);
  const openJournal = (code: string, origin: JournalOrigin) => setJournal({ code, origin });
  const [view, setView] = useState<"us" | "world">("us");
  const [countryVisits, setCountryVisits] = useState(initialCountryVisits);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  // The last double-tap on a state: it lifts and plays that state's activity.
  const [played, setPlayed] = useState<{ code: string; n: number } | null>(null);
  const onTap = (code: string | null) => setPlayed((p) => (code ? { code, n: (p?.n ?? -1) + 1 } : null));

  // Mine drives claiming; byState (member ids per state, in family order) drives the family view.
  const { mine, byState } = useMemo(() => {
    const order = new Map(members.map((m, i) => [m.userId, i]));
    const grouped: Record<string, string[]> = {};
    for (const v of visits) (grouped[v.stateCode] ??= []).push(v.userId);
    for (const ids of Object.values(grouped)) ids.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
    return { mine: new Set(visits.filter((v) => v.userId === me).map((v) => v.stateCode)), byState: grouped };
  }, [visits, members, me]);

  // The world: country claims, plus the US for anyone who has claimed a state.
  const world = useMemo(() => {
    const order = new Map(members.map((m, i) => [m.userId, i]));
    const grouped: Record<string, string[]> = {};
    const dates: Record<string, Record<string, string | null>> = {};
    for (const v of countryVisits) {
      (grouped[v.countryCode] ??= []).push(v.userId);
      (dates[v.countryCode] ??= {})[v.userId] = v.firstVisitedOn;
    }
    for (const v of visits) {
      if (!(grouped.US ??= []).includes(v.userId)) grouped.US.push(v.userId);
      const us = (dates.US ??= {});
      if (v.firstVisitedOn && (!us[v.userId] || v.firstVisitedOn < us[v.userId]!)) us[v.userId] = v.firstVisitedOn;
      else us[v.userId] ??= null;
    }
    for (const ids of Object.values(grouped)) ids.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
    const mineSet = new Set(countryVisits.filter((v) => v.userId === me).map((v) => v.countryCode));
    if (mine.size > 0) mineSet.add("US");
    const count = [...mineSet].filter((c) => COUNTRIES_BY_CODE[c]?.independent).length;
    return { mine: mineSet, byCountry: grouped, dates, count };
  }, [countryVisits, visits, members, me, mine]);

  async function setCountryClaimed(code: string, claim: boolean) {
    if (code === "US") {
      setSelectedCountry("US");
      return;
    }
    if (claim === world.mine.has(code)) return;
    const today = new Date().toISOString().slice(0, 10);
    const before = countryVisits;
    setCountryVisits(
      claim
        ? [...countryVisits, { userId: me, countryCode: code, firstVisitedOn: today }]
        : countryVisits.filter((v) => !(v.userId === me && v.countryCode === code)),
    );
    setSelectedCountry(code);
    const res = await fetch(`/api/countries/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: claim, firstVisitedOn: claim ? today : null }),
    }).catch(() => null);
    if (!res?.ok) setCountryVisits(before);
  }
  const toggleCountry = (code: string) => setCountryClaimed(code, !world.mine.has(code));
  const openStates = () => {
    setSelectedCountry(null);
    setView("us");
  };

  async function setClaimed(code: string, claim: boolean) {
    if (claim === mine.has(code)) return;
    const before = visits;
    setVisits(
      claim
        ? [...visits, { userId: me, stateCode: code, firstVisitedOn: new Date().toISOString().slice(0, 10) }]
        : visits.filter((v) => !(v.userId === me && v.stateCode === code)),
    );
    setSelected(code);

    const res = await fetch(`/api/states/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: claim, firstVisitedOn: claim ? new Date().toISOString().slice(0, 10) : null }),
    }).catch(() => null);

    if (!res?.ok) setVisits(before);
  }

  /** Writing a memory claims the state for its author on the server; mirror that here. */
  function markWritten(code: string) {
    if (mine.has(code)) return;
    setVisits((prev) => [...prev, { userId: me, stateCode: code, firstVisitedOn: new Date().toISOString().slice(0, 10) }]);
  }

  /** The switch in the state bar/sheet: the keyboard- and screen-reader-friendly way to undo. */
  const toggle = (code: string) => setClaimed(code, !mine.has(code));

  const mineList = Array.from(mine);
  const isFamily = members.length > 1;

  return (
    <>
      {/* You land on the map: a one-line headline, then the map. Stats live in a pill that expands into a drawer. */}
      <section className="mx-auto max-w-[1400px] px-3 pt-2 sm:px-8 sm:pt-3">
        <WordReveal
          text="Every Memory, Remembered"
          className="mb-4 px-1 font-display text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1] tracking-[-0.035em] sm:mb-5 [&>span>span:last-child]:text-accent-fg"
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.2 }}
        >
          <Panel innerClassName="relative overflow-hidden">
            <div className="flex min-h-[76px] items-center gap-4 border-b border-line px-3 py-3 sm:px-6">
              {/* Holds the pill's footprint while it is expanded, so the bar never jumps. */}
              <div className="w-[176px] shrink-0">
                {view === "world" ? (
                  <WorldPill count={world.count} />
                ) : (
                  !statsOpen && <StatsPill visitedCodes={mineList} onOpen={() => setStatsOpen(true)} />
                )}
              </div>

              <div className="hidden min-w-0 flex-1 lg:block">
                <AnimatePresence mode="wait" initial={false}>
                  {view === "world" ? (
                    selectedCountry ? (
                      <motion.div key={`c-${selectedCountry}`} {...barMotion}>
                        <CountryBar
                          code={selectedCountry}
                          claimed={world.mine.has(selectedCountry)}
                          visitorIds={world.byCountry[selectedCountry] ?? []}
                          stateCount={mine.size}
                          onToggle={toggleCountry}
                          onOpenStates={openStates}
                          onClose={() => setSelectedCountry(null)}
                        />
                      </motion.div>
                    ) : (
                      <motion.p key="world-hint" {...barMotion} className="text-[14px] text-fg-subtle">
                        Tap a continent to zoom in, then a country to claim it.
                      </motion.p>
                    )
                  ) : selected ? (
                    <motion.div key={selected} {...barMotion}>
                      <SelectedStateBar
                        code={selected}
                        claimed={mine.has(selected)}
                        visitorIds={byState[selected] ?? []}
                        onToggle={toggle}
                        onOpenJournal={openJournal}
                        onClose={() => setSelected(null)}
                      />
                    </motion.div>
                  ) : (
                    <motion.p key="hint" {...barMotion} className="text-[14px] text-fg-subtle">
                      Tap a state to claim it. Press and hold to unclaim.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="ml-auto shrink-0">
                <CrewDock />
              </div>
            </div>

            <div className="px-2 pb-3 pt-3 sm:px-6 sm:pb-6 sm:pt-5 lg:px-10">
              {/* Sized so the whole map fits above the fold on a laptop. */}
              <div
                className={`mb-2 flex min-h-11 items-center gap-2 sm:mb-0 ${
                  (view === "us" ? selected : selectedCountry) ? "justify-between lg:justify-start" : "justify-center sm:justify-start"
                }`}
              >
                <ViewSwitch
                  view={view}
                  onChange={(v) => {
                    setView(v);
                    setSelected(null);
                    setSelectedCountry(null);
                    setStatsOpen(false);
                  }}
                />
                {/* Phones: the selected place, with its journal, right here on the map (desktop has the header bar). */}
                <AnimatePresence mode="wait" initial={false}>
                  {view === "us" && selected && STATES_BY_CODE[selected] && (
                    <motion.div key={`m-${selected}`} {...barMotion} className="flex min-w-0 items-center gap-1.5 lg:hidden">
                      <span className="truncate font-display text-[1.15rem] leading-none">{STATES_BY_CODE[selected].name}</span>
                      <button
                        type="button"
                        onClick={(e) => openJournal(selected, originOf(e.currentTarget))}
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent pl-3 pr-2.5 text-[13.5px] font-semibold text-on-accent active:scale-95"
                      >
                        <NotebookIcon size={15} weight="fill" /> Journal
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        aria-label="Deselect"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-subtle"
                      >
                        <XIcon size={16} />
                      </button>
                    </motion.div>
                  )}
                  {view === "world" && selectedCountry && COUNTRIES_BY_CODE[selectedCountry] && (
                    <motion.div key={`m-${selectedCountry}`} {...barMotion} className="flex min-w-0 items-center gap-1.5 lg:hidden">
                      <span className="text-[1.4rem] leading-none" aria-hidden>
                        {COUNTRIES_BY_CODE[selectedCountry].flag}
                      </span>
                      <span className="truncate font-display text-[1.15rem] leading-none">
                        {COUNTRIES_BY_CODE[selectedCountry].name}
                      </span>
                      {selectedCountry === "US" && (
                        <button
                          type="button"
                          onClick={openStates}
                          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 text-[13.5px] font-semibold text-on-accent active:scale-95"
                        >
                          <MapTrifoldIcon size={15} weight="fill" /> States
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedCountry(null)}
                        aria-label="Deselect"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-subtle"
                      >
                        <XIcon size={16} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {view === "us" ? (
                  <motion.div
                    key="us"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                    className="mx-auto w-full"
                    style={{ maxWidth: "max(560px, calc((100dvh - 19rem) * 1.6))" }}
                  >
                    <UsMap
                      visited={mine}
                      family={byState}
                      members={members}
                      viewerId={me}
                      selectedCode={selected}
                      onClaim={(code) => setClaimed(code, true)}
                      onUnclaim={(code) => setClaimed(code, false)}
                      onSelect={setSelected}
                      played={played}
                      onTap={onTap}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="world"
                    initial={{ opacity: 0, scale: 0.9, rotate: -8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                    className="mx-auto w-full"
                    style={{ maxWidth: "max(480px, calc((100dvh - 22rem) * 1.33))" }}
                  >
                    <WorldGlobe
                      visited={world.mine}
                      family={world.byCountry}
                      members={members}
                      viewerId={me}
                      selectedCode={selectedCountry}
                      onClaim={(code) => setCountryClaimed(code, true)}
                      onUnclaim={(code) => setCountryClaimed(code, false)}
                      onSelect={setSelectedCountry}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] font-medium text-fg-muted lg:justify-between">
                <div className="flex items-center gap-2 lg:ml-auto">
                  <Legend family={isFamily} />
                </div>
              </div>
            </div>

            <StatsDrawer
              open={statsOpen}
              visitedCodes={mineList}
              family={byState}
              onClose={() => setStatsOpen(false)}
            />
          </Panel>
        </motion.div>
      </section>

      <JournalPanel
        code={journal?.code ?? null}
        origin={journal?.origin ?? null}
        claimed={journal ? mine.has(journal.code) : false}
        visitorIds={journal ? (byState[journal.code] ?? []) : []}
        onClose={() => setJournal(null)}
        onWrote={markWritten}
      />
    </>
  );
}
