import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import sharp from "sharp";
import crypto from "node:crypto";
import { apiViewer } from "@/lib/auth";
import { AVATARS_BUCKET, avatarUrl, getSupabase } from "@/lib/supabase";

/** Image editing can take a while. */
export const maxDuration = 120;

const MODEL = process.env.AVATAR_IMAGE_MODEL ?? "openai/gpt-image-1-mini";

function prompt(color: string) {
  return [
    "Turn the person in this photo into a friendly illustrated adventurer avatar.",
    "Keep their likeness: face shape, skin tone, hair color and style, facial hair and glasses exactly as in the photo.",
    "Head and shoulders, facing forward, warm smile, wearing a tan canvas explorer hat and a scarf.",
    "Style: modern flat vector sticker illustration, bold clean outlines, soft cel shading, cheerful.",
    `Centered on a plain solid ${color} background. No text, no border, no other people.`,
  ].join(" ");
}

/**
 * Selfie in, illustrated adventurer out (through Vercel AI Gateway, medium
 * quality, about a cent). Each person gets one: the try is claimed before the
 * call and handed back if the call fails, and the result is stored straight
 * away so it's never lost. The selfie itself isn't kept. If the illustrator
 * is unavailable the app falls back to its in-browser photo badge.
 */
export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 4_000_000) {
    return NextResponse.json({ error: "Send a photo under 4 MB" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: claimed } = await supabase
    .from("profiles")
    .update({ illustrated_at: new Date().toISOString() })
    .eq("user_id", viewer.userId)
    .is("illustrated_at", null)
    .select("user_id");
  if (!claimed?.length) {
    return NextResponse.json({ error: "You've already made your illustrated adventurer.", reason: "used" }, { status: 409 });
  }

  try {
    const photo = await sharp(Buffer.from(await file.arrayBuffer())).resize(1024, 1024, { fit: "cover" }).png().toBuffer();
    const { image } = await generateImage({
      model: gateway.image(MODEL),
      prompt: { images: [photo], text: prompt(viewer.color) },
      size: "1024x1024",
      // Shown at 25-50px: medium is plenty, and about a third the price of high.
      providerOptions: { openai: { quality: "medium" } },
      abortSignal: AbortSignal.timeout(110_000),
    });
    const webp = await sharp(Buffer.from(image.uint8Array)).resize(512, 512).webp({ quality: 88 }).toBuffer();
    const name = `${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(name, webp, { contentType: "image/webp" });
    if (error) throw new Error(`storage: ${error.message}`);
    await supabase.from("profiles").update({ illustrated_file: name }).eq("user_id", viewer.userId);
    return NextResponse.json({ illustratedUrl: avatarUrl(name) }, { status: 201 });
  } catch (err) {
    // Hand the try back: a failure shouldn't use up someone's one illustration.
    await supabase.from("profiles").update({ illustrated_at: null }).eq("user_id", viewer.userId);
    const message = err instanceof Error ? err.message : String(err);
    console.error("avatar illustrate failed:", message);
    // Say why (without details), so "AI Gateway isn't set up for this project" is easy to spot.
    const reason = /authenticat|api key|oidc/i.test(message)
      ? "not-configured"
      : /credit|quota|payment|billing|insufficient/i.test(message)
        ? "no-credits"
        : "failed";
    return NextResponse.json({ error: "The illustrator isn't available right now.", reason }, { status: 503 });
  }
}
