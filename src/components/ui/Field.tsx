import type { ComponentProps } from "react";

const control =
  "w-full rounded-2xl bg-canvas px-4 text-[15px] text-fg ring-1 ring-line-strong outline-none transition-shadow duration-300 placeholder:text-fg-subtle focus:ring-2 focus:ring-accent/60";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-fg-muted">
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
      className={`${control} h-12 text-[15px] [color-scheme:light] dark:[color-scheme:dark] ${className}`}
      {...rest}
    />
  );
}
