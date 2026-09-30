import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth";
import { AccountError } from "@/lib/family";
import { redeemResetToken } from "@/lib/passwordReset";

/** Sets a new password from a family-made reset link, then signs that person in. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  let email: string;
  try {
    email = await redeemResetToken(token, password);
  } catch (err) {
    const e = err instanceof AccountError ? err : new AccountError("Couldn't reset the password.", 500);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const auth = await createAuthClient();
  await auth.auth.signOut({ scope: "local" }).catch(() => {});
  const { error } = await auth.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: "Password changed. Sign in with it now." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
