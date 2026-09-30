import { NextRequest, NextResponse } from "next/server";
import { experimental_transcribe as transcribe } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { apiViewer } from "@/lib/auth";
import { audioExtension, MAX_AUDIO_BYTES } from "@/lib/audio";

export const maxDuration = 120;

const MODEL = process.env.TRANSCRIBE_MODEL ?? "openai/gpt-4o-mini-transcribe";

/**
 * Speech to text on the server, for when the browser couldn't do it live
 * (Firefox has no speech recognition; some phones won't run it alongside
 * the recorder). Nothing is stored here.
 */
export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !audioExtension(file.type) || file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Send a recording under 4 MB" }, { status: 400 });
  }
  try {
    const { text } = await transcribe({
      model: gateway.transcription(MODEL),
      audio: new Uint8Array(await file.arrayBuffer()),
      abortSignal: AbortSignal.timeout(100_000),
    });
    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("transcribe failed:", message);
    const reason = /authenticat|api key|oidc/i.test(message)
      ? "not-configured"
      : /credit|quota|payment|billing|insufficient/i.test(message)
        ? "no-credits"
        : "failed";
    return NextResponse.json({ error: "Couldn't transcribe that right now.", reason }, { status: 503 });
  }
}
