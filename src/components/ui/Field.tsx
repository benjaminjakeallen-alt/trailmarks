import type { ComponentProps } from "react";

const control =
  "w-full rounded-2xl bg-bg px-4 text-[15px] text-ink ring-1 ring-line-strong outline-none transition-shadow duration-300 placeholder:text-ink-3 focus:ring-2 focus:ring-ember/70";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
      {children}
    </label>
  );
}

export function TextInput({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${control} h-12 ${className}`} {...rest} />;
}

export function TextArea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`${control} resize-none py-3 leading-relaxed ${className}`} {...rest} />;
}

export function DateInput({ className = "", ...rest }: ComponentProps<"input">) {
  return (
    <input
      type="date"
      className={`${control} h-12 font-mono text-[13px] [color-scheme:light] dark:[color-scheme:dark] ${className}`}
      {...rest}
    />
  );
}
