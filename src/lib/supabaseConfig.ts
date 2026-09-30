/**
 * Settings shared by the server data layer and proxy.ts. Kept free of any
 * server-only imports so the proxy can use it too.
 */

/**
 * The project's publishable key. It is public by design (Supabase ships it
 * to browsers) and on its own reads nothing here: every table has RLS on
 * with no policies. We use it only to talk to Supabase Auth (sign-in,
 * session cookies); data still goes through the server-side service role
 * client in lib/supabase.ts.
 */
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_1jKUB-L9vBuM6fcrBVlH1w_GoKgrUw0";

export function supabaseUrl(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL must be set");
  return url;
}

/** Paths reachable without signing in. Everything else sends you to /login. */
export const PUBLIC_PATHS = ["/login", "/join", "/api/auth/"];
