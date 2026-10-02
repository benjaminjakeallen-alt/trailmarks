import type { ReactNode } from "react";
import { LogoMark } from "@/components/Nav";
import RouteSketch from "@/components/trips/RouteSketch";

/** Sign-in and join pages: the brand on one side, the form on the other (stacked on phones). */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[100dvh] max-w-[1400px] grid-cols-1 gap-4 p-3 sm:p-6 lg:grid-cols-2 lg:gap-6">
      <section className="brand-gradient relative isolate flex min-h-[260px] flex-col justify-between overflow-hidden rounded-[2rem] p-6 text-white sm:p-10 lg:min-h-0">
        <div className="absolute inset-x-0 top-[18%] -z-10 hidden h-[55%] opacity-90 lg:block">
          <RouteSketch points={[]} demo onPhoto className="h-full w-full" />
        </div>
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-10 w-10" />
          <span className="font-display text-[22px]">Trailmarks</span>
        </div>
        <div>
          <h1 className="font-display text-[clamp(2.4rem,5vw,4.25rem)] leading-[0.98] tracking-[-0.035em]">
            Every Memory,
            <br />
            <span className="text-success-bright">Remembered</span>
          </h1>
        </div>
      </section>
      <section className="flex items-center justify-center px-2 py-8 sm:px-6 lg:py-0">
        <div className="w-full max-w-[420px]">{children}</div>
      </section>
    </div>
  );
}

/** Only same-site paths, so a crafted ?next= can't bounce someone to another site. */
export function safeNext(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/";
}
