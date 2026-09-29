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
    <div className={`rounded-[1.75rem] bg-elevated shadow-[var(--shadow-card)] ring-1 ring-line ${className}`}>
      <div className={`h-full rounded-[1.75rem] ${innerClassName}`}>{children}</div>
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-petrol ${className}`}
    >
      {children}
    </span>
  );
}
