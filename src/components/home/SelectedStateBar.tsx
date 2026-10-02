"use client";

import { ArrowUpRightIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import StateSilhouette from "@/components/map/StateSilhouette";
import Visitors from "@/components/family/Visitors";
import { useFamily } from "@/components/family/FamilyProvider";
import { STATES_BY_CODE } from "@/lib/statesData";
import { originOf, type JournalOrigin } from "@/components/home/JournalPanel";

/** Desktop: the tapped state takes over the map's top bar instead of a side panel, so the map keeps its full width. */
export default function SelectedStateBar({
  code,
  claimed,
  visitorIds,
  onToggle,
  onOpenJournal,
  onClose,
}: {
  code: string;
  claimed: boolean;
  visitorIds: string[];
  onToggle: (code: string) => void;
  /** With the button's box, so the journal can grow out of it. */
  onOpenJournal: (code: string, origin: JournalOrigin) => void;
  onClose: () => void;
}) {
  const { members } = useFamily();
  const info = STATES_BY_CODE[code];
  if (!info) return null;

  return (
    <div className="flex w-full items-center gap-5">
      <StateSilhouette
        code={info.code}
        claimed={claimed}
        gold={members.length > 1 && visitorIds.length === members.length}
        width={80}
        height={60}
        className="h-12 w-16 shrink-0"
      />
      <div className="min-w-0 shrink-0">
        <h2 className="font-display text-[1.6rem] leading-tight">{info.name}</h2>
      </div>
      {members.length > 1 && <Visitors userIds={visitorIds} className="hidden min-w-0 xl:flex" />}

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-3 rounded-full bg-canvas py-1.5 pl-4 pr-1.5 ring-1 ring-line">
          <span className="text-[14px] font-semibold">{claimed ? "Claimed" : "Not yet"}</span>
          <Switch on={claimed} onChange={() => onToggle(info.code)} label={`Claim ${info.name}`} />
        </div>
        <Button
          onClick={(e) => onOpenJournal(info.code, originOf(e.currentTarget))}
          trailingIcon={<ArrowUpRightIcon size={14} />}
        >
          Open journal
        </Button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-canvas hover:text-fg"
        >
          <XIcon size={18} />
        </button>
      </div>
    </div>
  );
}
