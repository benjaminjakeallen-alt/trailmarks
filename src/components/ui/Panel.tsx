import type { ReactNode } from "react";

/** The one card surface: white on mist, soft cool shadow, generous radius. */
export function Panel({
  children,
  className = "",
  innerClassName = "",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={`rounded-[1.75rem] bg-surface shadow-[var(--shadow-card)] ring-1 ring-line ${className}`}>
      <div className={`h-full rounded-[1.75rem] ${innerClassName}`}>{children}</div>
    </div>
  );
}

