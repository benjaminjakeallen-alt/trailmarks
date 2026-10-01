/** Dark mode is a per-device choice (a cookie), off by default; it never follows the phone's system setting. */
export const THEME_COOKIE = "tm-theme";
export type Theme = "light" | "dark";
export const THEME_COLORS: Record<Theme, string> = { light: "#f2f5f6", dark: "#0a1316" };

export function themeFrom(value: string | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}
