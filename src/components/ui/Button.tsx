import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** primary/secondary/quiet sit on the page; light/glass sit on photos. */
type Variant = "primary" | "secondary" | "quiet" | "light" | "glass";

interface BaseProps {
  variant?: Variant;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
  children: ReactNode;
}

const base =
  "group relative inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-[transform,background-color,color,box-shadow] duration-300 ease-[var(--ease-glide)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_12px_24px_-14px_var(--accent)] hover:bg-accent-strong",
  secondary: "bg-surface text-fg ring-1 ring-line-strong shadow-[var(--shadow-card)] hover:ring-fg-subtle/40",
  quiet: "text-fg-muted hover:text-fg",
  light: "bg-white text-[#0b5c63] shadow-[0_12px_30px_-14px_rgb(0_0_0/0.5)] hover:bg-white/90",
  glass: "glass text-white hover:bg-white/25",
};

function padding(variant: Variant, hasTrailing: boolean) {
  if (variant === "quiet") return "px-2";
  return hasTrailing ? "pl-5 pr-1.5" : "px-5";
}

function Inner({ icon, trailingIcon, children, variant }: BaseProps & { variant: Variant }) {
  return (
    <>
      {icon}
      <span>{children}</span>
      {trailingIcon && (
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-300 ease-[var(--ease-glide)] group-hover:translate-x-0.5 group-hover:-translate-y-px ${
            variant === "primary" || variant === "glass"
              ? "bg-white/20"
              : variant === "light"
                ? "bg-[#0b5c63]/10"
                : "bg-fg/5"
          }`}
        >
          {trailingIcon}
        </span>
      )}
    </>
  );
}

export function Button({
  variant = "primary",
  icon,
  trailingIcon,
  className = "",
  children,
  ...rest
}: BaseProps & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      className={`${base} ${variants[variant]} ${padding(variant, !!trailingIcon)} ${className}`}
      {...rest}
    >
      <Inner variant={variant} icon={icon} trailingIcon={trailingIcon}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  icon,
  trailingIcon,
  className = "",
  children,
  href,
}: BaseProps & { href: string }) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${padding(variant, !!trailingIcon)} ${className}`}
    >
      <Inner variant={variant} icon={icon} trailingIcon={trailingIcon}>
        {children}
      </Inner>
    </Link>
  );
}
