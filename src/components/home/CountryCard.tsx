"use client";

import { MapTrifoldIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import Visitors from "@/components/family/Visitors";
import { useFamily } from "@/components/family/FamilyProvider";
import { COUNTRIES_BY_CODE } from "@/lib/countriesData";
import { CONTINENTS } from "@/components/map/WorldGlobe";

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
