import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const auth = await createAuthClient();
  const { error } = await auth.auth.signInWithPassword({ email, password });
  if (error) {
    // Only a real credentials mismatch is "wrong password". Anything else (the database paused or
    // unreachable, rate limits) used to show the same message and sent people chasing their password.
    if (error.code === "invalid_credentials") {
      return NextResponse.json({ error: "That email and password don't match." }, { status: 401 });
    }
    console.error("login failed", error.status, error.code, error.message);
    return NextResponse.json(
      { error: "Trailmarks can't reach its server right now. Try again in a minute." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true });
}
