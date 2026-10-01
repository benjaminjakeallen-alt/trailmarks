"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapTrifoldIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import Visitors from "@/components/family/Visitors";
import { useFamily } from "@/components/family/FamilyProvider";
import { COUNTRIES_BY_CODE } from "@/lib/countriesData";
import { CONTINENTS } from "@/components/map/WorldGlobe";
import { EASE_OUT_EXPO } from "@/lib/motion";

interface Props {
  code: string;
  claimed: boolean;
  visitorIds: string[];
  visitorDates?: Record<string, string | null>;
  /** For the US: how many states you've claimed. */
  stateCount: number;
  onToggle: (code: string) => void;
  onOpenStates: () => void;
}

const continentName = (key: string) => CONTINENTS.find((c) => c.key === key)?.label ?? "";

/** The US isn't claimed directly: it follows your states, so it offers the states map instead of a switch. */
function Claim({ code, claimed, stateCount, onToggle, onOpenStates }: Omit<Props, "visitorIds" | "visitorDates">) {
  const info = COUNTRIES_BY_CODE[code];
  if (code === "US") {
    return (
      <Button onClick={onOpenStates} icon={<MapTrifoldIcon size={17} weight="fill" />} className="shrink-0">
        {stateCount > 0 ? `${stateCount} states · open the map` : "Claim states"}
      </Button>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-full bg-bg py-1.5 pl-4 pr-1.5 ring-1 ring-line">
      <span className="text-[14px] font-semibold">{claimed ? "Been" : "Not yet"}</span>
      <Switch on={claimed} onChange={() => onToggle(code)} label={`Claim ${info?.name}`} />
    </div>
  );
}

/** Desktop: the selected country in the map's header bar. */
export function CountryBar(props: Props & { onClose: () => void }) {
  const { members } = useFamily();
  const info = COUNTRIES_BY_CODE[props.code];
  if (!info) return null;
  return (
    <div className="flex w-full items-center gap-4">
      <span className="text-[2.6rem] leading-none" aria-hidden>
        {info.flag}
      </span>
      <div className="min-w-0 shrink">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-petrol">{continentName(info.continent)}</p>
        <h3 className="truncate font-display text-[1.6rem] leading-tight">{info.name}</h3>
      </div>
      {members.length > 1 && <Visitors userIds={props.visitorIds} className="hidden min-w-0 xl:flex" />}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Claim {...props} />
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-bg hover:text-ink"
        >
          <XIcon size={18} />
        </button>
      </div>
    </div>
  );
}

/** Phones: a bottom sheet, with the family campfire. */
export function CountrySheet(props: Omit<Props, "code"> & { code: string | null; onClose: () => void }) {
  const info = props.code ? COUNTRIES_BY_CODE[props.code] : null;
  return (
    <AnimatePresence>
      {info && props.code && (
        <motion.div
          key="country-sheet"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-30 lg:hidden"
          initial={{ y: "120%" }}
          animate={{ y: 0 }}
          exit={{ y: "120%" }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.6 }}
          onDragEnd={(_, i) => {
            if (i.offset.y > 80 || i.velocity.y > 500) props.onClose();
          }}
        >
          <div className="rounded-[1.75rem] bg-elevated/95 p-5 shadow-[var(--shadow-float)] ring-1 ring-line backdrop-blur-xl">
            <div className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-ink/15" />
            <motion.div
              key={info.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[2.6rem] leading-none" aria-hidden>
                  {info.flag}
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-petrol">
                    {continentName(info.continent)}
                  </p>
                  <h3 className="truncate font-display text-[1.75rem] leading-tight">{info.name}</h3>
                </div>
              </div>
              {/* Compact on purpose: the campfire is on the globe, just above. */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <Visitors userIds={props.visitorIds} size={28} />
                <div className="ml-auto">
                  <Claim {...props} code={info.code} />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
