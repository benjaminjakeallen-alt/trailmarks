"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowsClockwiseIcon,
  CameraIcon,
  ChatCircleTextIcon,
  CheckIcon,
  CopyIcon,
  EnvelopeSimpleIcon,
  PaperPlaneTiltIcon,
  QrCodeIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { encode } from "uqr";
import Avatar, { AvatarStack } from "@/components/family/Avatar";
import { useFamily } from "@/components/family/FamilyProvider";
import { Button } from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import { EASE_OUT_EXPO, HAPTICS, haptic } from "@/lib/motion";

/** A QR code drawn as rounded petrol dots, with solid finder squares so every camera still reads it. */
export function QrCode({ text, className = "" }: { text: string; className?: string }) {
  const { size, data, types } = useMemo(() => encode(text, { ecc: "M", border: 0 }), [text]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.8} fill="none" stroke="currentColor" strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.9} fill="currentColor" />
    </g>
  );
  const dots: React.ReactNode[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Position patterns (type 2) are drawn as whole squares below.
      if (!data[y][x] || types[y][x] === 2) continue;
      dots.push(<rect key={`${x},${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.3} />);
    }
  }
  return (
    <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} className={className} role="img" aria-label="QR code for the invite link">
      <rect x={-2} y={-2} width={size + 4} height={size + 4} rx={3} fill="#fff" />
      <g fill="currentColor">{dots}</g>
      {finder(0, 0)}
      {finder(size - 7, 0)}
      {finder(0, size - 7)}
    </svg>
  );
}

const noSubscribe = () => () => {};

function inviteUrl(code: string) {
  return `${window.location.origin}/join?code=${code}`;
}

/** Every way to hand someone the invite: share sheet, text, email, copy, or scan in person. */
export function InviteOptions({ compact = false }: { compact?: boolean }) {
  const { viewer, family, setInviteCode } = useFamily();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(!compact);
  const [rotating, setRotating] = useState<"idle" | "confirm" | "busy">("idle");
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  // The link needs window.location; the server render shows the code only.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  if (!family || !viewer) return null;

  const url = `${origin}/join?code=${family.inviteCode}`;
  const message = `${viewer.displayName} invited you to ${family.name} on Trailmarks. Claim the states you've been to and see the family's trips and photos:`;

  async function copy() {
    await navigator.clipboard.writeText(inviteUrl(family!.inviteCode)).catch(() => {});
    haptic(HAPTICS.select);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    haptic(HAPTICS.select);
    await navigator.share({ title: `Join ${family!.name}`, text: message, url: inviteUrl(family!.inviteCode) }).catch(() => {});
  }

  async function rotate() {
    setRotating("busy");
    const res = await fetch("/api/family/invite", { method: "POST" }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (data?.inviteCode) setInviteCode(data.inviteCode);
    setRotating("idle");
  }

  const smsHref = `sms:?&body=${encodeURIComponent(`${message} ${url}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(`Join ${family.name} on Trailmarks`)}&body=${encodeURIComponent(`${message}\n\n${url}`)}`;
  const round =
    "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-bg hover:text-ink active:scale-[0.97]";
  const bubble = "flex h-12 w-12 items-center justify-center rounded-full";

  return (
    <div>
      {canShare ? (
        <Button onClick={share} icon={<PaperPlaneTiltIcon size={18} weight="fill" />} className="w-full">
          Send the invite
        </Button>
      ) : (
        <Button
          onClick={copy}
          icon={copied ? <CheckIcon size={18} weight="bold" /> : <CopyIcon size={18} />}
          className="w-full"
        >
          {copied ? "Link copied" : "Copy invite link"}
        </Button>
      )}

      <div className="mt-3 grid grid-cols-4 gap-1">
        <a href={smsHref} className={round}>
          <span className={`${bubble} bg-[#e3f6e8] text-[#138a4a]`}>
            <ChatCircleTextIcon size={22} weight="fill" />
          </span>
          Text
        </a>
        <a href={mailHref} className={round}>
          <span className={`${bubble} bg-petrol-soft text-petrol`}>
            <EnvelopeSimpleIcon size={22} weight="fill" />
          </span>
          Email
        </a>
        <button type="button" onClick={copy} className={round}>
          <span className={`${bubble} bg-sun-soft text-[#b36b00]`}>
            {copied ? <CheckIcon size={22} weight="bold" /> : <CopyIcon size={22} weight="fill" />}
          </span>
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          aria-expanded={showQr}
          className={`${round} ${showQr ? "text-ink" : ""}`}
        >
          <span className={`${bubble} ${showQr ? "bg-ink text-bg" : "bg-sunken text-ink"}`}>
            <QrCodeIcon size={22} weight="fill" />
          </span>
          QR code
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showQr && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center gap-4 rounded-3xl bg-bg p-4 ring-1 ring-line">
              {origin && <QrCode text={url} className="h-32 w-32 shrink-0 text-petrol-strong" />}
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">Together right now?</p>
                <p className="mt-1 text-[14px] leading-snug text-ink-3">
                  Have them point their phone camera here. Or type the code at the join page:
                </p>
                <p className="mt-2 font-display text-[1.35rem] tracking-[0.14em] text-petrol">{family.inviteCode}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
        <span>Anyone with this link can join {family.name}.</span>
        {rotating === "confirm" ? (
          <span className="flex items-center gap-2">
            <span className="text-ink-2">Old links stop working.</span>
            <button type="button" onClick={rotate} className="font-semibold text-coral">
              Make a new link
            </button>
            <button type="button" onClick={() => setRotating("idle")} className="font-semibold text-ink-2">
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setRotating("confirm")}
            disabled={rotating === "busy"}
            className="inline-flex items-center gap-1 font-semibold text-petrol hover:text-petrol-strong disabled:opacity-50"
          >
            <ArrowsClockwiseIcon size={13} className={rotating === "busy" ? "animate-spin" : ""} />
            {rotating === "busy" ? "Making a new link…" : "New link"}
          </button>
        )}
      </div>
    </div>
  );
}

/** The invite, as a sheet any screen can open with `useFamily().openInvite()`. */
export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { members } = useFamily();
  return (
    <Sheet open={open} onClose={onClose} label="Invite the family">
      <div className="pr-10">
        <AvatarStack members={members} size={34} max={6} />
        <h2 className="mt-4 font-display text-[1.8rem] leading-tight">Invite the family</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-3">
          Everyone gets their own login and their own states on the family map. Trips, memories and photos
          are shared.
        </p>
      </div>
      <div className="mt-5">
        <InviteOptions compact />
      </div>
    </Sheet>
  );
}

/** The small "+" person button in the nav. */
export function InviteButton({ className = "" }: { className?: string }) {
  const { openInvite } = useFamily();
  return (
    <button
      type="button"
      onClick={() => {
        haptic(HAPTICS.select);
        openInvite();
      }}
      aria-label="Invite family"
      className={`flex h-10 items-center gap-2 rounded-full bg-elevated px-3 text-[15px] font-medium text-petrol ring-1 ring-line transition-[box-shadow,transform] hover:ring-petrol/40 active:scale-[0.97] ${className}`}
    >
      <UserPlusIcon size={19} weight="bold" />
      <span className="hidden md:inline">Invite</span>
    </button>
  );
}

/** Shown under the map while the viewer is the only one in the family. */
export function InviteNudge() {
  const { viewer, openInvite } = useFamily();
  if (!viewer) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.6 }}
      className="mt-4 flex flex-col gap-4 rounded-[1.75rem] bg-elevated p-4 shadow-[var(--shadow-card)] ring-1 ring-line sm:flex-row sm:items-center sm:px-6"
    >
      <div className="flex items-center gap-4">
        <span className="flex shrink-0 items-center">
          <Avatar member={viewer} size={40} ring />
          {[0, 1].map((i) => (
            <span
              key={i}
              className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-line-strong bg-bg text-ink-3"
            >
              <UserPlusIcon size={16} />
            </span>
          ))}
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold">Just you on the map so far</p>
          <p className="text-[14px] leading-snug text-ink-3">
            Invite the family: their states show up here too, and the places you&apos;ve all been turn gold.
          </p>
        </div>
      </div>
      <Button
        onClick={() => {
          haptic(HAPTICS.select);
          openInvite();
        }}
        icon={<UserPlusIcon size={17} weight="bold" />}
        className="shrink-0 sm:ml-auto"
      >
        Invite family
      </Button>
    </motion.div>
  );
}

/** Shown under the map until the viewer has made their adventurer avatar. */
export function AdventurerNudge() {
  const { viewer, openAdventurer } = useFamily();
  if (!viewer || viewer.avatarUrl) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.5 }}
      className="mt-4 flex flex-col gap-4 rounded-[1.75rem] bg-elevated p-4 shadow-[var(--shadow-card)] ring-1 ring-line sm:flex-row sm:items-center sm:px-6"
    >
      <div className="flex items-center gap-4">
        <span className="relative shrink-0">
          <Avatar member={viewer} size={48} />
          <CameraIcon
            size={22}
            weight="fill"
            className="absolute -bottom-1 -right-1 rounded-full bg-elevated p-0.5 text-petrol"
          />
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold">Be an adventurer on the map</p>
          <p className="text-[14px] leading-snug text-ink-3">
            Snap a selfie and get an explorer avatar. Tap a state to see who&apos;s been, gathered round the campfire.
          </p>
        </div>
      </div>
      <Button
        onClick={() => {
          haptic(HAPTICS.select);
          openAdventurer();
        }}
        icon={<CameraIcon size={17} weight="fill" />}
        className="shrink-0 sm:ml-auto"
      >
        Take a selfie
      </Button>
    </motion.div>
  );
}
