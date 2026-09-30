import exifr from "exifr";

export interface PhotoMeta {
  takenAt: Date | null;
  lat: number | null;
  lng: number | null;
}

const NONE: PhotoMeta = { takenAt: null, lat: null, lng: null };

/**
 * Reads the capture time and GPS from a photo's EXIF, in the browser. This
 * has to happen before upload: the server re-encodes to WebP, which strips
 * EXIF. Photos without EXIF (screenshots, or an iPhone picker with Location
 * turned off in its Options) just come back empty.
 */
export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    // exifr.gps() applies the N/S/E/W reference tags; picking raw GPS tags would not.
    const [tags, gps] = await Promise.all([
      exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate"] }).catch(() => null),
      exifr.gps(file).catch(() => null),
    ]);
    const date: unknown = tags?.DateTimeOriginal ?? tags?.CreateDate;
    const takenAt = date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    const lat = typeof gps?.latitude === "number" && Number.isFinite(gps.latitude) ? gps.latitude : null;
    const lng = typeof gps?.longitude === "number" && Number.isFinite(gps.longitude) ? gps.longitude : null;
    // (0, 0) is a camera with no fix, not a photo in the Gulf of Guinea.
    return lat === 0 && lng === 0 ? { takenAt, lat: null, lng: null } : { takenAt, lat, lng };
  } catch {
    return NONE;
  }
}

/** Form fields the photo upload route understands. */
export function appendMeta(form: FormData, meta: PhotoMeta) {
  if (meta.takenAt) form.append("takenAt", meta.takenAt.toISOString());
  if (meta.lat != null && meta.lng != null) {
    form.append("lat", String(meta.lat));
    form.append("lng", String(meta.lng));
  }
}

/** YYYY-MM-DD in the viewer's local time: the day the photo was taken where they were. */
export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
