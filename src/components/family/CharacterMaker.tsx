"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { CheckIcon, DiceFiveIcon } from "@phosphor-icons/react";
import Sheet from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFamily } from "@/components/family/FamilyProvider";
import {
  EXTRAS_FOR,
  EXTRA_LABELS,
  FACIAL_HAIR,
  FACIAL_HAIR_LABELS,
  GENDERS,
  GENDER_LABELS,
  HAIR_FOR,
  HAIR_LABELS,
  BODIES,
  BODY_LABELS,
  BUILDS,
  BUILD_LABELS,
  GEAR,
  GEAR_LABELS,
  GLASSES,
  GLASSES_LABELS,
  HAIR_COLORS,
  HAS_PANTS,
  HAT_LABELS,
  HEADWEAR,
  HEADWEAR_LABELS,
  OUTFIT_COLORS,
  PANTS_COLORS,
  SIZES,
  SIZE_LABELS,
  SKIN_TONES,
  lookOf,
  randomLook,
  type Look,
} from "@/lib/look";
import { HAPTICS, haptic } from "@/lib/motion";

// three.js only loads when someone opens this.
const CharacterPreview = dynamic(() => import("@/components/stage3d/CharacterPreview"), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-[260px] rounded-full" />,
});

const TABS = ["Body", "Face", "Hair", "Outfit", "Hat", "Extras"] as const;
type Tab = (typeof TABS)[number];

const LIGHT = new Set(["#ececec", "#f2ece0", "#f8d9c0", "#e6c77f", "#f5c542"]);

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[14px] font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((c) => {
          const on = c.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-label={`${label} ${c}`}
              aria-pressed={on}
              onClick={() => onPick(c)}
              className={`flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition-transform active:scale-90 ${
                on ? "ring-fg" : "ring-line-strong"
              }`}
              style={{ background: c }}
            >
              {on && <CheckIcon size={16} weight="bold" color={LIGHT.has(c) ? "#0e1b1f" : "#fff"} />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Choices<T extends string>({
  label,
  options,
  value,
  labels,
  onPick,
}: {
  label: string;
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  onPick: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[14px] font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onPick(o)}
            className={`min-h-11 rounded-full px-4 text-[14px] font-semibold ring-1 transition-colors ${
              value === o ? "bg-accent text-on-accent ring-accent" : "bg-surface ring-line-strong hover:bg-surface-sunken"
            }`}
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Design your 3D self: the same character acts out every state's scene and,
 * as a portrait, is your picture everywhere in the app.
 */
export default function CharacterMaker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { viewer, members } = useFamily();
  const me = members.find((m) => m.userId === viewer?.userId) ?? viewer;
  const [look, setLook] = useState<Look | null>(me ? lookOf(me) : null);
  const [tab, setTab] = useState<Tab>("Body");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  if (!me || !look) return null;

  const set = (patch: Partial<Look>) => {
    haptic(HAPTICS.select);
    setLook({ ...look, ...patch });
  };

  async function save() {
    if (!me || !look) return;
    setSaving(true);
    setError(null);
    const form = new FormData();
    form.set("look", JSON.stringify(look));
    try {
      const { renderPortrait } = await import("@/components/stage3d/portrait");
      form.set("portrait", await renderPortrait(me, look), "portrait.png");
    } catch {
      // No portrait (no WebGL): the character still saves.
    }
    const res = await fetch("/api/character", { method: "POST", body: form }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setError("Couldn't save. Try again.");
      return;
    }
    haptic(HAPTICS.claim);
    router.refresh();
    onClose();
  }

  const hatName = HAT_LABELS[look.body];
  // The body's own hat is one of the headwear choices.
  const headOptions = hatName ? (["none", "own", ...HEADWEAR.filter((h) => h !== "none")] as const) : HEADWEAR;
  const headValue = look.hat ? "own" : look.headwear;
  const headLabels = { ...HEADWEAR_LABELS, own: hatName ?? "" } as Record<string, string>;

  return (
    <Sheet open={open} onClose={onClose} label="Your character">
      <div className="flex items-center justify-between gap-3 pr-10">
        <h2 className="font-display text-[1.6rem] leading-tight sm:text-[1.8rem]">Your character</h2>
        <button
          type="button"
          onClick={() => set(randomLook())}
          className="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[14px] font-semibold text-accent-fg ring-1 ring-line-strong hover:bg-surface-sunken"
        >
          <DiceFiveIcon size={18} weight="fill" /> Shuffle
        </button>
      </div>

      <div className="mt-2 flex justify-center">
        <CharacterPreview member={me} look={look} size={260} />
      </div>

      <div role="tablist" aria-label="Customize" className="mt-3 flex gap-1 overflow-x-auto rounded-full bg-surface-sunken p-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-10 flex-1 rounded-full px-3 text-[14px] font-semibold transition-colors ${
              tab === t ? "bg-surface text-fg shadow-[var(--shadow-card)]" : "text-fg-muted hover:text-fg"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-4 min-h-[260px] space-y-5">
        {tab === "Body" && (
          <>
            <Choices
              label="I'm"
              options={GENDERS}
              value={look.gender}
              labels={GENDER_LABELS}
              onPick={(gender) =>
                set({
                  gender,
                  // Keep what still fits; swap what doesn't.
                  hairStyle: HAIR_FOR[gender].includes(look.hairStyle) ? look.hairStyle : HAIR_FOR[gender][0],
                  facialHair: gender === "male" ? look.facialHair : "none",
                  extra: EXTRAS_FOR[gender].includes(look.extra) ? look.extra : "none",
                })
              }
            />
            <Choices label="Outfit style" options={BODIES} value={look.body} labels={BODY_LABELS} onPick={(body) => set({ body, hat: false })} />
            <Choices label="Size" options={SIZES} value={look.size} labels={SIZE_LABELS} onPick={(size) => set({ size })} />
            <Choices label="Build" options={BUILDS} value={look.build} labels={BUILD_LABELS} onPick={(build) => set({ build })} />
          </>
        )}
        {tab === "Face" && (
          <>
            <Swatches label="Skin" colors={SKIN_TONES} value={look.skin} onPick={(skin) => set({ skin })} />
            <Choices label="Glasses" options={GLASSES} value={look.glasses} labels={GLASSES_LABELS} onPick={(glasses) => set({ glasses })} />
            {look.gender === "male" && (
              <Choices
                label="Facial hair"
                options={FACIAL_HAIR}
                value={look.facialHair}
                labels={FACIAL_HAIR_LABELS}
                onPick={(facialHair) => set({ facialHair })}
              />
            )}
          </>
        )}
        {tab === "Hair" && (
          <>
            <Choices
              label="Hairstyle"
              options={HAIR_FOR[look.gender]}
              value={look.hairStyle}
              labels={HAIR_LABELS}
              onPick={(hairStyle) => set({ hairStyle })}
            />
            <Swatches label="Hair color" colors={HAIR_COLORS} value={look.hair} onPick={(hair) => set({ hair })} />
          </>
        )}
        {tab === "Outfit" && (
          <>
            <Swatches
              label="Top"
              colors={[me.color, ...OUTFIT_COLORS.filter((c) => c !== me.color)]}
              value={look.outfit}
              onPick={(outfit) => set({ outfit })}
            />
            {HAS_PANTS[look.body] && <Swatches label="Pants" colors={PANTS_COLORS} value={look.pants} onPick={(pants) => set({ pants })} />}
          </>
        )}
        {tab === "Extras" && (
          <>
            <Choices label="Accessories" options={EXTRAS_FOR[look.gender]} value={look.extra} labels={EXTRA_LABELS} onPick={(extra) => set({ extra })} />
            <Choices label="Adventure gear" options={GEAR} value={look.gear} labels={GEAR_LABELS} onPick={(gear) => set({ gear })} />
          </>
        )}
        {tab === "Hat" && (
          <Choices
            label="Headwear"
            options={headOptions as readonly string[]}
            value={headValue}
            labels={headLabels}
            onPick={(v) => set(v === "own" ? { hat: true, headwear: "none" } : { hat: false, headwear: v as Look["headwear"] })}
          />
        )}
      </div>

      {error && <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-[14px] text-danger-fg">{error}</p>}
      <Button className="mt-6 w-full" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save character"}
      </Button>
    </Sheet>
  );
}
