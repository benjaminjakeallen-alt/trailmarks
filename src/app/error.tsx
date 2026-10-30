"use client";

import { useEffect } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

/** Any page that throws (most often: the database is waking up) lands here instead of a blank error screen. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-[2rem] leading-tight">Can&apos;t load this right now</h1>
      <p className="mt-2 text-[15px] text-fg-muted">Trailmarks couldn&apos;t reach its server. Give it a minute.</p>
      <Button className="mt-6" onClick={reset} icon={<ArrowClockwiseIcon size={16} weight="bold" />}>
        Try again
      </Button>
    </div>
  );
}
