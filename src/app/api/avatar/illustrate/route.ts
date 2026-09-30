import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import sharp from "sharp";
import { apiViewer } from "@/lib/auth";

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
 * Selfie in, illustrated adventurer out (through Vercel AI Gateway). Nothing
 * is stored here: the person sees the result and chooses whether to save it.
 * Any failure returns 503, and the app falls back to its in-browser photo badge.
 */
export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 4_000_000) {
    return NextResponse.json({ error: "Send a photo under 4 MB" }, { status: 400 });
  }

  try {
    const photo = await sharp(Buffer.from(await file.arrayBuffer())).resize(1024, 1024, { fit: "cover" }).png().toBuffer();
    const { image } = await generateImage({
      model: gateway.image(MODEL),
      prompt: { images: [photo], text: prompt(viewer.color) },
      size: "1024x1024",
      abortSignal: AbortSignal.timeout(110_000),
    });
    const png = await sharp(Buffer.from(image.uint8Array)).resize(512, 512).png().toBuffer();
    return NextResponse.json({ image: `data:image/png;base64,${png.toString("base64")}` });
  } catch (err) {
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
