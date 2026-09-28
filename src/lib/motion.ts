export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_GLIDE = [0.32, 0.72, 0, 1] as const;

export const SPRING_SNAPPY = { type: "spring", stiffness: 420, damping: 30 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 170, damping: 24 } as const;
/** Overshoots on purpose — used for the "stamp" when a state is claimed. */
export const SPRING_STAMP = { type: "spring", stiffness: 520, damping: 16, mass: 0.8 } as const;

export function haptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
