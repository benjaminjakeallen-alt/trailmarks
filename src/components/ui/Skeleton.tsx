import type { CSSProperties } from "react";

/**
 * A placeholder block in the shape of what's coming. Shimmers unless the
 * person prefers reduced motion; hidden from screen readers (the wrapping
 * `SkeletonPage` announces the load once instead).
 */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={`skeleton rounded-2xl ${className}`} style={style} />;
}

/** Route-level loading shell: one polite "Loading" for assistive tech, skeletons for everyone else. */
export function SkeletonPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}
