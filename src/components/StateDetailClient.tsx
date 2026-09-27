"use client";

import { useState } from "react";
import MemoryForm from "@/components/MemoryForm";
import MemoryCard from "@/components/MemoryCard";
import type { Memory } from "@/lib/types";

interface StateDetailClientProps {
  stateCode: string;
  initialMemories: Memory[];
  initialVisited: boolean;
  initialFirstVisitedOn: string | null;
}

export default function StateDetailClient({
  stateCode,
  initialMemories,
  initialVisited,
  initialFirstVisitedOn,
}: StateDetailClientProps) {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [visited, setVisited] = useState(initialVisited);
  const [firstVisitedOn, setFirstVisitedOn] = useState(initialFirstVisitedOn);
  const [toggling, setToggling] = useState(false);

  async function toggleVisited() {
    setToggling(true);
    const next = !visited;
    setVisited(next);
    try {
      const res = await fetch(`/api/states/${stateCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visited: next,
          firstVisitedOn: next ? firstVisitedOn ?? new Date().toISOString().slice(0, 10) : null,
        }),
      });
      const data = await res.json();
      setFirstVisitedOn(data.firstVisitedOn ?? null);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={toggleVisited}
        disabled={toggling}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          visited
            ? "bg-visited-soft text-visited"
            : "bg-surface-muted text-foreground-muted hover:text-foreground"
        }`}
      >
        <span>{visited ? "✓" : "○"}</span>
        {visited ? "Visited" : "Mark as visited"}
        {visited && firstVisitedOn && (
          <span className="text-visited/70">
            · since{" "}
            {new Date(`${firstVisitedOn}T00:00:00`).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
            })}
          </span>
        )}
      </button>

      <MemoryForm
        stateCode={stateCode}
        onCreated={(memory) => setMemories((prev) => [memory, ...prev])}
      />

      {memories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
          No memories here yet — add the first one above.
        </p>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onDelete={(id) => setMemories((prev) => prev.filter((m) => m.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
