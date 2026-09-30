import type { ImageLoaderProps } from "next/image";

/**
 * next/image loader for our private photos: the browser asks /p/<file>
 * directly (with its session cookie) for the width it needs, and the route
 * resizes. Anything else passes through untouched.
 */
export default function photoLoader({ src, width, quality }: ImageLoaderProps) {
  if (!src.startsWith("/p/")) return src;
  return `${src}?w=${width}&q=${quality ?? 75}`;
}
