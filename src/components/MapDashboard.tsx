"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import UsMap from "@/components/UsMap";
import StatsBar from "@/components/StatsBar";
import { STATES_BY_CODE } from "@/lib/statesData";

interface MapDashboardProps {
  initialVisited: string[];
}

export default function MapDashboard({ initialVisited }: MapDashboardProps) {
  const router = useRouter();
  const [visited, setVisited] = useState<Set<string>>(() => new Set(initialVisited));
  const [justVisited, setJustVisited] = useState<string | null>(null);

  const visitedList = useMemo(() => Array.from(visited), [visited]);

  async function markVisited(code: string) {
    setVisited((prev) => new Set(prev).add(code));
    setJustVisited(code);

    await fetch(`/api/states/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: true, firstVisitedOn: new Date().toISOString().slice(0, 10) }),
    });

    window.setTimeout(() => {
      router.push(`/states/${code.toLowerCase()}`);
    }, 550);
  }

  function handleSelect(code: string) {
    if (visited.has(code)) {
      router.push(`/states/${code.toLowerCase()}`);
      return;
    }
    markVisited(code);
  }

  const justVisitedName = justVisited ? STATES_BY_CODE[justVisited]?.name : null;

  return (
    <div className="space-y-6">
      <StatsBar visitedCodes={visitedList} />

      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-8">
        <UsMap
          visited={visited}
          onSelect={handleSelect}
          justVisitedCode={justVisited}
        />

        <AnimatePresence>
          {justVisitedName && (
            <motion.div
              key={justVisitedName}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onAnimationComplete={() => {
                window.setTimeout(() => setJustVisited(null), 900);
              }}
              className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-fit rounded-full bg-visited px-5 py-2 text-sm font-medium text-white shadow-lg"
            >
              🎉 Marked {justVisitedName} as visited
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-center text-sm text-foreground-muted">
        Tap any state to mark it visited — tap it again anytime to add memories and photos.
      </p>
    </div>
  );
}
