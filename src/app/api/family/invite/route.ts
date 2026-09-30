import { NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { rotateInviteCode } from "@/lib/family";

/** Replaces the family's invite link (anyone in the family can), so an old, overshared one stops working. */
export async function POST() {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const inviteCode = await rotateInviteCode(viewer.familyId);
  return NextResponse.json({ inviteCode });
}
