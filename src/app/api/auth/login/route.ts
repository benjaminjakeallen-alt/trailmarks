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
    return NextResponse.json({ error: "That email and password don't match." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
