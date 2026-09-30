import { NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { AccountError } from "@/lib/family";
import { createResetToken } from "@/lib/passwordReset";

/** Makes a one-time password reset link for someone else in your family. */
export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const { userId } = await params;
  try {
    const token = await createResetToken(viewer, userId);
    return NextResponse.json({ token }, { status: 201 });
  } catch (err) {
    const e = err instanceof AccountError ? err : new AccountError("Couldn't make a reset link.", 500);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
