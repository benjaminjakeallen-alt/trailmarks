import { NextRequest, NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { AccountError } from "@/lib/family";
import { changeOwnPassword } from "@/lib/passwordReset";

export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const body = await req.json().catch(() => ({}));
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    await changeOwnPassword(viewer, str(body.current), str(body.next));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err instanceof AccountError ? err : new AccountError("Couldn't change the password.", 500);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
