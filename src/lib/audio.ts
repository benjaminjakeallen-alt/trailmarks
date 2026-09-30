/** Recordings the browser makes (Chrome/Firefox: WebM/Opus or Ogg; Safari: MP4/AAC), by file extension. */
export const AUDIO_TYPES: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
};

export function audioExtension(mime: string): string | null {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base === "audio/webm" || base === "video/webm") return "webm";
  if (base === "audio/ogg") return "ogg";
  if (base === "audio/mp4" || base === "audio/x-m4a" || base === "audio/aac" || base === "video/mp4") return "m4a";
  return null;
}

/** Vercel caps request bodies at 4.5 MB; at 32 kbps that's well over the 10-minute recording limit. */
export const MAX_AUDIO_BYTES = 4_200_000;
