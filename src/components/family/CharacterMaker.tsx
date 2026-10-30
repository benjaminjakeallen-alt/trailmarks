"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@phosphor-icons/react";
import Sheet from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFamily } from "@/components/family/FamilyProvider";
import {
  BODIES,
  BODY_LABELS,
  HAIR_COLORS,
  HAT_LABELS,
  OUTFIT_COLORS,
  SKIN_TONES,
  lookOf,
  type Look,
} from "@/lib/look";
import { HAPTICS, haptic } from "@/lib/motion";

// three.js only loads when someone opens this.
const CharacterPreview = dynamic(() => import("@/components/stage3d/CharacterPreview"), {
  ssr: false,
  loading: () => <Skeleton className="h-[240px] w-[240px] rounded-full" />,
});

function Swatches({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: string[];
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[14px] font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => {
          const on = c.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-label={`${label} ${c}`}
              aria-pressed={on}
              onClick={() => onPick(c)}
              className={`flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition-transform active:scale-90 ${
                on ? "ring-fg" : "ring-line-strong"
              }`}
              style={{ background: c }}
            >
              {on && <CheckIcon size={16} weight="bold" color={c === "#ececec" || c === "#f2ece0" || c === "#f8d9c0" ? "#0e1b1f" : "#fff"} />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Make the 3D character who acts out the state scenes: body, hat, skin, hair, outfit. */
export default function CharacterMaker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { viewer, members } = useFamily();
  const me = members.find((m) => m.userId === viewer?.userId) ?? viewer;
  const [look, setLook] = useState<Look | null>(me ? lookOf(me) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  if (!me || !look) return null;

  const set = (patch: Partial<Look>) => {
    haptic(HAPTICS.select);
    setLook({ ...look, ...patch });
  };

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/character", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(look),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setError("Couldn't save. Try again.");
      return;
    }
    haptic(HAPTICS.claim);
    router.refresh();
    onClose();
  }

  const hatLabel = HAT_LABELS[look.body];
  return (
    <Sheet open={open} onClose={onClose} label="Your character">
      <h2 className="pr-10 font-display text-[1.8rem] leading-tight">Your character</h2>
      <div className="mt-4 flex justify-center">
        <CharacterPreview member={me} look={look} />
      </div>

      <div className="mt-4 space-y-5">
        <fieldset>
          <legend className="mb-2 text-[14px] font-semibold">Look</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BODIES.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={look.body === b}
                onClick={() => set({ body: b })}
                className={`min-h-11 rounded-full px-3 text-[14px] font-semibold ring-1 transition-colors ${
                  look.body === b ? "bg-accent text-on-accent ring-accent" : "bg-surface ring-line-strong hover:bg-surface-sunken"
                }`}
              >
                {BODY_LABELS[b]}
              </button>
            ))}
          </div>
          {hatLabel && (
            <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={look.hat}
                onChange={(e) => set({ hat: e.target.checked })}
                className="h-5 w-5 accent-[var(--accent)]"
              />
              {hatLabel}
            </label>
          )}
        </fieldset>
        <Swatches label="Skin" colors={SKIN_TONES} value={look.skin} onPick={(skin) => set({ skin })} />
        <Swatches label="Hair" colors={HAIR_COLORS} value={look.hair} onPick={(hair) => set({ hair })} />
        <Swatches label="Outfit" colors={[me.color, ...OUTFIT_COLORS.filter((c) => c !== me.color)]} value={look.outfit} onPick={(outfit) => set({ outfit })} />
      </div>

      {error && <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-[14px] text-danger-fg">{error}</p>}
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save character"}
      </Button>
    </Sheet>
  );
}
