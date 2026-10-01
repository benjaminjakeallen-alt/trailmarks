import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { avatarUrl, getSupabase, unwrap } from "@/lib/supabase";
import { SUPABASE_PUBLISHABLE_KEY, supabaseUrl } from "@/lib/supabaseConfig";
import type { Viewer } from "@/lib/types";

/**
 * Supabase Auth client bound to this request's cookies. Used only for
 * sign-in, sign-out and "who is this?"; data access stays on the service
 * role client, scoped by the viewer's family in lib/*.ts.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't write cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

interface ProfileRow {
  family_id: string;
  display_name: string;
  color: string;
  avatar_file: string | null;
  illustrated_at: string | null;
  illustrated_file: string | null;
}

/** The signed-in person with their family, or null. Cached for the request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return null;

  const profile = unwrap(
    await getSupabase().from("profiles").select("family_id, display_name, color, avatar_file, illustrated_at, illustrated_file").eq("user_id", user.id).maybeSingle(),
  ) as ProfileRow | null;
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    familyId: profile.family_id,
    displayName: profile.display_name,
    color: profile.color,
    avatarUrl: avatarUrl(profile.avatar_file),
    illustratedUrl: avatarUrl(profile.illustrated_file),
    illustrationUsed: Boolean(profile.illustrated_at),
  };
});

/** For pages: the viewer, or off to the sign-in page. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/** For route handlers: the viewer, or a 401 to return as-is. */
export async function apiViewer(): Promise<Viewer | NextResponse> {
  const viewer = await getViewer();
  return viewer ?? NextResponse.json({ error: "Sign in first" }, { status: 401 });
}

export function forbidden(message = "That belongs to someone else") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}
