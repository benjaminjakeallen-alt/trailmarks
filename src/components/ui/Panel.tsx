import type { ReactNode } from "react";

/**
 * Double-bezel container: a tinted outer tray with a hairline, holding an
 * inner core with its own highlight and a concentric (smaller) radius.
 */
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
    <div className={`rounded-[2rem] bg-ink/[0.03] p-1.5 ring-1 ring-line ${className}`}>
      <div
        className={`h-full rounded-[calc(2rem-0.375rem)] bg-elevated shadow-[var(--highlight)] ring-1 ring-line ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-ink/[0.04] px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-2 ring-1 ring-line ${className}`}
    >
      {children}
    </span>
  );
}
