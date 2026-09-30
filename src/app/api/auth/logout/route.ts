import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth";

export async function POST() {
  const auth = await createAuthClient();
  await auth.auth.signOut();
  return NextResponse.json({ ok: true });
}
