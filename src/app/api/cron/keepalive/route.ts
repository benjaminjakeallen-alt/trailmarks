import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron calls this once a day (vercel.json) so the free Supabase project
 * always has recent activity and never auto-pauses after a quiet week.
 * If CRON_SECRET is set in Vercel, only Vercel's own cron call is accepted.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await getSupabase().from("families").select("id").limit(1);
  if (error) {
    console.error("keepalive: database query failed", error.message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
