import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth";
import { AccountError, createAccount } from "@/lib/family";

/** Creates an account in a new family, or in an existing one via its invite code, then signs in. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const email = str(body.email);
  const password = str(body.password);

  try {
    await createAccount({
      displayName: str(body.displayName),
      email,
      password,
      familyName: str(body.familyName) || undefined,
      inviteCode: str(body.inviteCode) || undefined,
    });
  } catch (err) {
    const e = err instanceof AccountError ? err : new AccountError("Couldn't create the account.", 500);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  const auth = await createAuthClient();
  const { error } = await auth.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    return NextResponse.json({ error: "Account created. Sign in to continue." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
