import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiViewer, forbidden, notFound } from "@/lib/auth";
import { audioExtension, MAX_AUDIO_BYTES } from "@/lib/audio";
import { getMemoryOwner } from "@/lib/memories";
import { getSupabase, voiceUrl, VOICE_BUCKET } from "@/lib/supabase";

async function ownMemory(id: string) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const memoryId = Number(id);
  if (!Number.isInteger(memoryId)) return notFound();
  const owner = await getMemoryOwner(memoryId);
  if (!owner || owner.familyId !== viewer.familyId) return notFound();
  if (owner.userId !== viewer.userId) return forbidden("Only the person who wrote this can change its recording");
  return { viewer, memoryId };
}

async function currentAudio(memoryId: number) {
  const { data } = await getSupabase().from("memories").select("audio_file").eq("id", memoryId).maybeSingle();
  return (data?.audio_file as string | null) ?? null;
}

/** Attaches the voice recording a memory was dictated from. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const own = await ownMemory((await params).id);
  if (own instanceof NextResponse) return own;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const ext = file instanceof File ? audioExtension(file.type) : null;
  if (!(file instanceof File) || !ext) return NextResponse.json({ error: "Send a WebM, Ogg or MP4 recording" }, { status: 400 });
  if (file.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "That recording is too long" }, { status: 413 });
  const secondsRaw = Number(form?.get("seconds"));
  const seconds = Number.isFinite(secondsRaw) && secondsRaw > 0 ? Math.min(secondsRaw, 3600) : null;

  const supabase = getSupabase();
  const name = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(VOICE_BUCKET)
    .upload(name, Buffer.from(await file.arrayBuffer()), { contentType: file.type.split(";")[0] });
  if (error) return NextResponse.json({ error: "Could not store the recording" }, { status: 500 });

  const previous = await currentAudio(own.memoryId);
  const { error: updateError } = await supabase
    .from("memories")
    .update({ audio_file: name, audio_seconds: seconds })
    .eq("id", own.memoryId);
  if (updateError) {
    await supabase.storage.from(VOICE_BUCKET).remove([name]);
    return NextResponse.json({ error: "Could not save the recording" }, { status: 500 });
  }
  if (previous) await supabase.storage.from(VOICE_BUCKET).remove([previous]);
  return NextResponse.json({ audioUrl: voiceUrl(name), audioSeconds: seconds }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const own = await ownMemory((await params).id);
  if (own instanceof NextResponse) return own;
  const supabase = getSupabase();
  const previous = await currentAudio(own.memoryId);
  await supabase.from("memories").update({ audio_file: null, audio_seconds: null }).eq("id", own.memoryId);
  if (previous) await supabase.storage.from(VOICE_BUCKET).remove([previous]);
  return NextResponse.json({ ok: true });
}
