import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabase, unwrap } from "@/lib/supabase";
import { SUPABASE_PUBLISHABLE_KEY, supabaseUrl } from "@/lib/supabaseConfig";
import { AccountError } from "@/lib/family";
import type { Viewer } from "@/lib/types";

/**
 * Password resets without an email service: anyone in your family can make
 * you a one-time link (Family → your name → Reset password) and send it the
 * same way they'd send the invite. Only a hash of the token is stored.
 */

const RESET_TTL_MS = 48 * 60 * 60 * 1000;
export const MIN_PASSWORD = 8;

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

interface ResetRow {
  id: number;
  user_id: string;
  created_by: string | null;
  expires_at: string;
  used_at: string | null;
}

/** A fresh link for a family member; any older unused link for them stops working. */
export async function createResetToken(viewer: Viewer, userId: string): Promise<string> {
  const supabase = getSupabase();
  const target = unwrap(
    await supabase.from("profiles").select("family_id").eq("user_id", userId).maybeSingle(),
  ) as { family_id: string } | null;
  if (!target || target.family_id !== viewer.familyId) throw new AccountError("That person isn't in your family.", 404);
  if (userId === viewer.userId) throw new AccountError("Change your own password from your family page instead.");

  await supabase.from("password_resets").delete().eq("user_id", userId).is("used_at", null);
  const token = crypto.randomBytes(24).toString("base64url");
  unwrap(
    await supabase
      .from("password_resets")
      .insert({
        token_hash: hash(token),
        user_id: userId,
        created_by: viewer.userId,
        expires_at: new Date(Date.now() + RESET_TTL_MS).toISOString(),
      })
      .select("id")
      .single(),
  );
  return token;
}

async function findLive(token: string): Promise<ResetRow | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const row = unwrap(
    await getSupabase()
      .from("password_resets")
      .select("id, user_id, created_by, expires_at, used_at")
      .eq("token_hash", hash(token))
      .maybeSingle(),
  ) as ResetRow | null;
  if (!row || row.used_at || Date.parse(row.expires_at) < Date.now()) return null;
  return row;
}

/** Who a still-valid link is for, and who made it, for the reset page. */
export async function describeReset(token: string): Promise<{ name: string; madeBy: string | null } | null> {
  const row = await findLive(token);
  if (!row) return null;
  const ids = [row.user_id, row.created_by].filter((id): id is string => Boolean(id));
  const people = unwrap(
    await getSupabase().from("profiles").select("user_id, display_name").in("user_id", ids),
  ) as { user_id: string; display_name: string }[];
  const name = (id: string | null) => people.find((p) => p.user_id === id)?.display_name ?? null;
  return { name: name(row.user_id) ?? "you", madeBy: name(row.created_by) };
}

/** Uses the link: sets the new password and returns the account's email so the caller can sign in. */
export async function redeemResetToken(token: string, password: string): Promise<string> {
  if (password.length < MIN_PASSWORD) throw new AccountError(`Use at least ${MIN_PASSWORD} characters.`);
  const row = await findLive(token);
  if (!row) throw new AccountError("This reset link has expired or was already used. Ask for a new one.", 410);

  const supabase = getSupabase();
  // Claim it first, so the same link can't be used twice at once.
  const claimed = unwrap(
    await supabase
      .from("password_resets")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("used_at", null)
      .select("id"),
  ) as { id: number }[];
  if (!claimed.length) throw new AccountError("This reset link was already used.", 410);

  const { data, error } = await supabase.auth.admin.updateUserById(row.user_id, { password });
  if (error || !data.user?.email) throw new AccountError("Couldn't set the new password. Try again.", 500);
  return data.user.email;
}

/** Changing your own password: the current one has to check out first. */
export async function changeOwnPassword(viewer: Viewer, current: string, next: string) {
  if (next.length < MIN_PASSWORD) throw new AccountError(`Use at least ${MIN_PASSWORD} characters.`);
  const check = createClient(supabaseUrl(), SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await check.auth.signInWithPassword({ email: viewer.email, password: current });
  if (error) throw new AccountError("Your current password isn't right.", 401);
  // Drop just the throwaway session this check made.
  await check.auth.signOut({ scope: "local" }).catch(() => {});

  const { error: updateError } = await getSupabase().auth.admin.updateUserById(viewer.userId, { password: next });
  if (updateError) throw new AccountError("Couldn't change the password. Try again.", 500);
}
