import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth";
import { AUDIO_TYPES } from "@/lib/audio";
import { getSupabase, VOICE_BUCKET } from "@/lib/supabase";

/**
 * A voice note, for the family its memory belongs to. Answers range requests
 * (Safari won't play audio without them) and lets the browser cache it privately.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = file.match(/^[0-9a-f-]{36}\.(webm|ogg|m4a|mp4)$/);
  if (!m) return new NextResponse(null, { status: 404 });

  const auth = await createAuthClient();
  const { data: claims } = await auth.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return new NextResponse(null, { status: 401 });

  const supabase = getSupabase();
  const [{ data: memory }, { data: viewer }] = await Promise.all([
    supabase.from("memories").select("family_id").eq("audio_file", file).maybeSingle(),
    supabase.from("profiles").select("family_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (!memory || !viewer || memory.family_id !== viewer.family_id) return new NextResponse(null, { status: 404 });

  const { data: blob, error } = await supabase.storage.from(VOICE_BUCKET).download(file);
  if (error || !blob) return new NextResponse(null, { status: 404 });
  const all = new Uint8Array(await blob.arrayBuffer());
  const headers: Record<string, string> = {
    "Content-Type": AUDIO_TYPES[m[1]],
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
  };

  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const size = all.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(size - 1, end);
    if (start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const part = all.subarray(start, end + 1);
    return new NextResponse(part, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(part.length) },
    });
  }
  return new NextResponse(all, { headers: { ...headers, "Content-Length": String(all.length) } });
}
