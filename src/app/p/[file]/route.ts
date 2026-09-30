import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createAuthClient } from "@/lib/auth";
import { getSupabase, PHOTOS_BUCKET } from "@/lib/supabase";

/** Widths next/image asks for, capped at the stored size (2400px). */
const MAX_WIDTH = 2400;

/**
 * Serves a photo from the private bucket to someone in its family, resized
 * to ?w=. File names are random and never change, so the browser keeps each
 * one forever (privately, never in a shared cache).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[0-9a-f-]{36}\.webp$/.test(file)) return new NextResponse(null, { status: 404 });

  const auth = await createAuthClient();
  // getClaims verifies the session JWT locally when the project signs with asymmetric keys.
  const { data: claims } = await auth.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return new NextResponse(null, { status: 401 });

  const supabase = getSupabase();
  const [{ data: photo }, { data: profile }] = await Promise.all([
    supabase.from("photos").select("family_id, width").eq("file_name", file).maybeSingle(),
    supabase.from("profiles").select("family_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (!photo || !profile || photo.family_id !== profile.family_id) return new NextResponse(null, { status: 404 });

  const { data: blob, error } = await supabase.storage.from(PHOTOS_BUCKET).download(file);
  if (error || !blob) return new NextResponse(null, { status: 404 });
  let body: Buffer = Buffer.from(await blob.arrayBuffer());

  const w = Math.round(Number(req.nextUrl.searchParams.get("w")));
  const q = Math.min(95, Math.max(30, Math.round(Number(req.nextUrl.searchParams.get("q")) || 75)));
  if (Number.isFinite(w) && w >= 16 && w < Math.min(MAX_WIDTH, photo.width ?? MAX_WIDTH)) {
    body = await sharp(body).resize({ width: w, withoutEnlargement: true }).webp({ quality: q }).toBuffer();
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(body.length),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
