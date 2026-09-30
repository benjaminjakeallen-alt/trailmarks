import crypto from "node:crypto";
import { cache } from "react";
import { avatarUrl, getSupabase, unwrap } from "@/lib/supabase";
import type { Family, Member } from "@/lib/types";

/**
 * Member colors, in the order new members get them. Distinct from the map's
 * aqua (claimed land) and gold (the whole family has been), and dark enough
 * for a white initial on top.
 */
export const MEMBER_COLORS = ["#e5483a", "#2f6fde", "#7c4ddb", "#138a4a", "#d6336c", "#c2610f", "#0e7490", "#5b6b12"];

const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newInviteCode(): string {
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join("");
}

interface FamilyRow {
  id: string;
  name: string;
  invite_code: string;
}

interface ProfileRow {
  user_id: string;
  display_name: string;
  color: string;
  avatar_file: string | null;
  created_at: string;
}

function toMember(row: ProfileRow): Member {
  return { userId: row.user_id, displayName: row.display_name, color: row.color, avatarUrl: avatarUrl(row.avatar_file) };
}

export const getMembers = cache(async (familyId: string): Promise<Member[]> => {
  const rows = unwrap(
    await getSupabase()
      .from("profiles")
      .select("user_id, display_name, color, avatar_file, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
  ) as ProfileRow[];
  return rows.map(toMember);
});

export async function getFamily(familyId: string): Promise<Family> {
  const row = unwrap(
    await getSupabase().from("families").select("id, name, invite_code").eq("id", familyId).single(),
  ) as FamilyRow;
  return { id: row.id, name: row.name, inviteCode: row.invite_code, members: await getMembers(familyId) };
}

/** A fresh invite code for the family; the old link stops working. */
export async function rotateInviteCode(familyId: string): Promise<string> {
  const code = newInviteCode();
  unwrap(await getSupabase().from("families").update({ invite_code: code }).eq("id", familyId).select("id").single());
  return code;
}

export async function findFamilyByInvite(code: string): Promise<{ id: string; name: string } | null> {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(clean)) return null;
  const row = unwrap(
    await getSupabase().from("families").select("id, name").eq("invite_code", clean).maybeSingle(),
  ) as { id: string; name: string } | null;
  return row;
}

export class AccountError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export interface NewAccount {
  displayName: string;
  email: string;
  password: string;
  /** Start a new family with this name… */
  familyName?: string;
  /** …or join an existing one. */
  inviteCode?: string;
}

/**
 * Creates a confirmed Supabase Auth user (no confirmation email, so no
 * email setup is needed), plus their family (new or joined) and profile.
 * Anything half-made is rolled back on failure.
 */
export async function createAccount(input: NewAccount): Promise<{ userId: string }> {
  const displayName = input.displayName.trim().slice(0, 40);
  const email = input.email.trim().toLowerCase();
  if (!displayName) throw new AccountError("Add your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccountError("That email doesn't look right.");
  if (input.password.length < 8) throw new AccountError("Use at least 8 characters for your password.");

  const supabase = getSupabase();

  let joinFamilyId: string | null = null;
  const familyName = input.familyName?.trim().slice(0, 60) ?? "";
  if (input.inviteCode) {
    const family = await findFamilyByInvite(input.inviteCode);
    if (!family) throw new AccountError("That invite link isn't valid anymore. Ask for a new one.");
    joinFamilyId = family.id;
  } else if (!familyName) {
    throw new AccountError("Name your family, or use an invite link to join one.");
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createError || !created.user) {
    const taken = /already|registered|exists/i.test(createError?.message ?? "");
    throw new AccountError(
      taken ? "There's already an account with that email. Sign in instead." : "Couldn't create the account.",
      taken ? 409 : 500,
    );
  }
  const userId = created.user.id;
  let newFamilyId: string | null = null;

  try {
    let familyId = joinFamilyId;
    if (!familyId) {
      const family = unwrap(
        await supabase
          .from("families")
          .insert({ name: familyName, invite_code: newInviteCode(), created_by: userId })
          .select("id")
          .single(),
      ) as { id: string };
      familyId = newFamilyId = family.id;
    }

    const taken = new Set((await getMembers(familyId)).map((m) => m.color));
    const color = MEMBER_COLORS.find((c) => !taken.has(c)) ?? MEMBER_COLORS[taken.size % MEMBER_COLORS.length];

    unwrap(
      await supabase
        .from("profiles")
        .insert({ user_id: userId, family_id: familyId, display_name: displayName, color })
        .select("user_id")
        .single(),
    );
    return { userId };
  } catch (err) {
    if (newFamilyId) await supabase.from("families").delete().eq("id", newFamilyId);
    await supabase.auth.admin.deleteUser(userId);
    throw err instanceof AccountError ? err : new AccountError("Couldn't create the account.", 500);
  }
}
