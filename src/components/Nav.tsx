"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { MapTrifoldIcon, PathIcon, ImagesIcon, PlusIcon } from "@phosphor-icons/react";
import { SPRING_SNAPPY } from "@/lib/motion";

const LINKS = [
  { href: "/", label: "Map", Icon: MapTrifoldIcon },
  { href: "/trips", label: "Trips", Icon: PathIcon },
  { href: "/memories", label: "Memories", Icon: ImagesIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/states") : pathname.startsWith(href);
}

/** "Folded Map": a paper road map with the route dotted across it, ending at an amber stop. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  const gradId = `logo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#084a50" />
          <stop offset="0.55" stopColor="#0b5c63" />
          <stop offset="1" stopColor="#138085" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${gradId})`} />
      <path d="M8 14.2 18 10l12 4.2 10-4.2v23.8L30 38l-12-4.2L8 38Z" fill="#fff" />
      <path d="M18 10l12 4.2V38l-12-4.2Z" fill="#dcecec" />
      <path
        d="M11.5 31c3.4-6.4 7.6-.8 11.2-7s7.6-5.6 11.8-6.8"
        fill="none"
        stroke="#0b5c63"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeDasharray="0.1 4"
      />
      <circle cx="35" cy="16.8" r="3" fill="#f5a524" />
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <>
      <header
        className={`sticky top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow,backdrop-filter] duration-500 ease-[var(--ease-glide)] ${
          scrolled ? "bg-bg/75 shadow-[0_1px_0_var(--line)] backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
          <Link href="/" className="flex items-center gap-2.5 rounded-full py-1 pr-2">
            <LogoMark />
            <span className="font-display text-[20px]">Trailmarks</span>
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 sm:block">
            <div className="flex items-center gap-1 rounded-full bg-elevated/80 p-1 shadow-[var(--shadow-card)] ring-1 ring-line backdrop-blur-xl">
              {LINKS.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative rounded-full px-4 py-2 text-[15px] font-medium transition-colors duration-300 ${
                      active ? "text-white" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-full bg-petrol"
                        transition={SPRING_SNAPPY}
                      />
                    )}
                    <span className="relative">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <Link
            href="/trips/new"
            className="group hidden items-center gap-2 rounded-full bg-petrol py-1.5 pl-4 pr-1.5 text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_12px_24px_-14px_var(--petrol)] hover:bg-petrol-strong transition-transform duration-300 active:scale-[0.97] sm:flex"
          >
            New trip
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:rotate-90">
              <PlusIcon size={14} weight="bold" />
            </span>
          </Link>
        </div>
      </header>

      {/* Mobile: native-feeling bottom tab bar. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:hidden">
        <div className="mx-auto flex max-w-sm items-center justify-around rounded-[1.75rem] bg-elevated/90 p-1.5 shadow-[var(--shadow-float)] ring-1 ring-line backdrop-blur-xl">
          {LINKS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.4rem] text-[11px] transition-colors ${
                  active ? "text-petrol" : "text-ink-3"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute inset-0 rounded-[1.4rem] bg-petrol-soft"
                    transition={SPRING_SNAPPY}
                  />
                )}
                <Icon size={22} weight={active ? "fill" : "light"} className="relative" />
                <span className="relative font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
