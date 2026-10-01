"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Panel";
import Switch from "@/components/ui/Switch";
import StateSilhouette from "@/components/map/StateSilhouette";
import Visitors from "@/components/family/Visitors";
import StateScene from "@/components/scenes/StateScene";
import { useFamily } from "@/components/family/FamilyProvider";
import { STATES_BY_CODE } from "@/lib/statesData";
import { originOf, type JournalOrigin } from "@/components/home/JournalPanel";
import { EASE_OUT_EXPO } from "@/lib/motion";

interface StateCardProps {
  code: string | null;
  claimed: boolean;
  /** Family members who have claimed this state. */
  visitorIds?: string[];
  /** When each of them first went. */
  visitorDates?: Record<string, string | null>;
  /** Set after a quick tap on this state: play its activity. */
  played?: { code: string; n: number } | null;
  onToggle: (code: string) => void;
  /** Open the journal in place (the map's slide-over) instead of navigating. */
  onOpenJournal?: (code: string, origin: JournalOrigin) => void;
  compact?: boolean;
}

export function StateCardBody({
  code,
  claimed,
  visitorIds = [],
  played = null,
  onToggle,
  onOpenJournal,
  compact = false,
}: StateCardProps) {
  const { members, byId } = useFamily();
  const cast = visitorIds.map((id) => byId[id]).filter(Boolean);
  const info = code ? STATES_BY_CODE[code] : null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {info && (
        <motion.div
          key={info.code}
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="flex h-full flex-col"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow>{info.region}</Eyebrow>
              <h3 className={`mt-2 font-display leading-[1] ${compact ? "text-[1.75rem]" : "text-[2.25rem]"}`}>
                {info.name}
              </h3>
              <p className="mt-1.5 text-[14px] text-ink-3">Capital · {info.capital}</p>
            </div>
            <StateSilhouette code={info.code} claimed={claimed} width={96} height={72} className="h-16 w-24 shrink-0" />
          </div>

          {played && cast.length > 0 && (
            <StateScene
              code={info.code}
              members={cast}
              gold={members.length > 1 && cast.length === members.length}
              turn={played.n}
              className="mt-3"
            />
          )}
          <Visitors userIds={visitorIds} className="mt-3" />

          <div className={`flex items-center justify-between rounded-2xl bg-bg px-4 py-3 ring-1 ring-line ${compact ? "mt-4" : "mt-6"}`}>
            <div>
              <p className="text-[15px] font-semibold">{claimed ? "Claimed" : "Not yet"}</p>
              <p className="text-[13px] text-ink-3">
                {claimed ? "On your map. Hold the state, or flip this, to undo." : "Flip it once you've been."}
              </p>
            </div>
            <Switch on={claimed} onChange={() => onToggle(info.code)} label={`Claim ${info.name}`} />
          </div>

          {!compact && (
            <p className="mt-5 rounded-2xl bg-sun-soft px-4 py-3 text-[14px] leading-relaxed text-ink-2">
              {info.funFact}
            </p>
          )}

          <div className={`mt-auto ${compact ? "pt-4" : "pt-6"}`}>
            {onOpenJournal ? (
              <Button
                onClick={(e) => onOpenJournal(info.code, originOf(e.currentTarget))}
                trailingIcon={<ArrowUpRightIcon size={14} />}
                className="w-full justify-between"
              >
                Open {info.name} journal
              </Button>
            ) : (
              <ButtonLink
                href={`/states/${info.code.toLowerCase()}`}
                variant="primary"
                trailingIcon={<ArrowUpRightIcon size={14} />}
                className="w-full justify-between"
              >
                Open {info.name} journal
              </ButtonLink>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Mobile: a draggable bottom sheet that floats above the tab bar. */
export function StateSheet({
  code,
  claimed,
  visitorIds,
  played,
  onToggle,
  onOpenJournal,
  onClose,
}: StateCardProps & { onClose: () => void }) {
  return (
    <AnimatePresence>
      {code && (
        <motion.div
          key="sheet"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-30 lg:hidden"
          initial={{ y: "120%" }}
          animate={{ y: 0 }}
          exit={{ y: "120%" }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80 || info.velocity.y > 500) onClose();
          }}
        >
          <div className="rounded-[1.75rem] bg-elevated/95 p-5 shadow-[var(--shadow-float)] ring-1 ring-line backdrop-blur-xl">
            <div className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-ink/15" />
            <StateCardBody
              code={code}
              claimed={claimed}
              visitorIds={visitorIds}
              played={played}
              onToggle={onToggle}
              onOpenJournal={onOpenJournal}
              compact
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
