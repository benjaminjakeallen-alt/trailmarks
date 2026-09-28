"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRightIcon, HandTapIcon, PathIcon } from "@phosphor-icons/react";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Panel";
import Switch from "@/components/ui/Switch";
import StateSilhouette from "@/components/map/StateSilhouette";
import { STATES_BY_CODE } from "@/lib/statesData";
import { EASE_OUT_EXPO } from "@/lib/motion";

interface StateCardProps {
  code: string | null;
  claimed: boolean;
  onToggle: (code: string) => void;
  compact?: boolean;
}

export function StateCardBody({ code, claimed, onToggle, compact = false }: StateCardProps) {
  const info = code ? STATES_BY_CODE[code] : null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {info ? (
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
              <h3 className={`mt-3 font-display leading-[1] tracking-[-0.03em] ${compact ? "text-[1.75rem]" : "text-[2.1rem]"}`}>
                {info.name}
              </h3>
              <p className="mt-1.5 font-mono text-[12px] text-ink-3">Capital · {info.capital}</p>
            </div>
            <StateSilhouette code={info.code} claimed={claimed} width={96} height={72} className="h-16 w-24 shrink-0" />
          </div>

          <div className={`flex items-center justify-between rounded-2xl bg-bg px-4 py-3 ring-1 ring-line ${compact ? "mt-4" : "mt-6"}`}>
            <div>
              <p className="text-sm font-medium">{claimed ? "Claimed" : "Not yet"}</p>
              <p className="text-[12.5px] text-ink-3">
                {claimed ? "On your map. Tap again to undo." : "Flip it once you've been."}
              </p>
            </div>
            <Switch on={claimed} onChange={() => onToggle(info.code)} label={`Claim ${info.name}`} />
          </div>

          {!compact && (
            <p className="mt-5 border-l-2 border-gold/70 pl-3 text-[14px] leading-relaxed text-ink-2">
              {info.funFact}
            </p>
          )}

          <div className={`mt-auto ${compact ? "pt-4" : "pt-6"}`}>
            <ButtonLink
              href={`/states/${info.code.toLowerCase()}`}
              variant="secondary"
              trailingIcon={<ArrowUpRightIcon size={14} />}
              className="w-full justify-between"
            >
              Open {info.name} journal
            </ButtonLink>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex h-full flex-col"
        >
          <Eyebrow>How it works</Eyebrow>
          <ul className="mt-5 space-y-5">
            <li className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember-soft text-ember">
                <HandTapIcon size={18} />
              </span>
              <div>
                <p className="text-sm font-medium">Tap a state to claim it</p>
                <p className="text-[13px] leading-relaxed text-ink-3">Tap again to take it back. Nothing is lost.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lagoon-soft text-lagoon">
                <PathIcon size={18} />
              </span>
              <div>
                <p className="text-sm font-medium">Or let a trip do it</p>
                <p className="text-[13px] leading-relaxed text-ink-3">
                  Record a route and every state it crosses fills in on its own.
                </p>
              </div>
            </li>
          </ul>
          <div className="mt-auto flex items-center gap-4 pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-lagoon to-lagoon-bright" /> Claimed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-land ring-1 ring-line-strong" /> Not yet
            </span>
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
  onToggle,
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
            <StateCardBody code={code} claimed={claimed} onToggle={onToggle} compact />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
