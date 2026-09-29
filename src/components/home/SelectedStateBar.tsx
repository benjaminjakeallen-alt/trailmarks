"use client";

import { ArrowUpRightIcon, XIcon } from "@phosphor-icons/react";
import { ButtonLink } from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import StateSilhouette from "@/components/map/StateSilhouette";
import { STATES_BY_CODE } from "@/lib/statesData";

/** Desktop: the tapped state takes over the map's top bar instead of a side panel, so the map keeps its full width. */
export default function SelectedStateBar({
  code,
  claimed,
  onToggle,
  onClose,
}: {
  code: string;
  claimed: boolean;
  onToggle: (code: string) => void;
  onClose: () => void;
}) {
  const info = STATES_BY_CODE[code];
  if (!info) return null;

  return (
    <div className="flex w-full items-center gap-5">
      <StateSilhouette code={info.code} claimed={claimed} width={80} height={60} className="h-12 w-16 shrink-0" />
      <div className="min-w-0 shrink-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-petrol">{info.region}</p>
        <h3 className="font-display text-[1.6rem] leading-tight">{info.name}</h3>
      </div>
      <p className="line-clamp-2 hidden max-w-[46ch] text-[13.5px] leading-snug text-ink-3 xl:block">{info.funFact}</p>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-3 rounded-full bg-bg py-1.5 pl-4 pr-1.5 ring-1 ring-line">
          <span className="text-[14px] font-semibold">{claimed ? "Claimed" : "Not yet"}</span>
          <Switch on={claimed} onChange={() => onToggle(info.code)} label={`Claim ${info.name}`} />
        </div>
        <ButtonLink href={`/states/${info.code.toLowerCase()}`} trailingIcon={<ArrowUpRightIcon size={14} />}>
          Open journal
        </ButtonLink>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-bg hover:text-ink"
        >
          <XIcon size={18} />
        </button>
      </div>
    </div>
  );
}
