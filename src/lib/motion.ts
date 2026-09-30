export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_GLIDE = [0.32, 0.72, 0, 1] as const;

export const SPRING_SNAPPY = { type: "spring", stiffness: 420, damping: 30 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 170, damping: 24 } as const;
/** Overshoots on purpose — used for the "stamp" when a state is claimed. */
export const SPRING_STAMP = { type: "spring", stiffness: 520, damping: 16, mass: 0.8 } as const;

/** Named patterns so claim, unclaim and the long-press threshold each feel different. */
export const HAPTICS = {
  select: 6,
  claim: [12, 40, 24],
  holdThreshold: 28,
  unclaim: [8, 30, 8],
  everyone: [15, 45, 15, 45, 60],
} as const;

/**
 * Android: navigator.vibrate plays the pattern. iOS Safari has no vibrate
 * API, but toggling a hidden `<input type="checkbox" switch>` (Safari 17.4+)
 * plays the system haptic tick, so iPhones get one tick. Both need to run
 * inside a user gesture to be felt.
 */
export function haptic(pattern: number | readonly number[]) {
  if (typeof navigator === "undefined" || typeof document === "undefined") return;
  if ("vibrate" in navigator && navigator.vibrate(pattern as number | number[])) return;
  try {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.append(input);
    label.style.display = "none";
    document.body.append(label);
    label.click();
    label.remove();
  } catch {
    // No haptics available; nothing to do.
  }
}
