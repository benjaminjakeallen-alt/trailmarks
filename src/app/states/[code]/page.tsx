import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getMemoriesForState } from "@/lib/memories";
import { STATES_BY_CODE } from "@/lib/statesData";
import StateDetailClient from "@/components/StateDetailClient";

export const dynamic = "force-dynamic";

interface StatePageProps {
  params: Promise<{ code: string }>;
}

export default async function StatePage({ params }: StatePageProps) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const info = STATES_BY_CODE[code];
  if (!info) notFound();

  const db = getDb();
  const visitRow = db
    .prepare("SELECT visited, first_visited_on FROM state_visits WHERE state_code = ?")
    .get(code) as { visited: number; first_visited_on: string | null } | undefined;

  const memories = getMemoriesForState(code);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
      <Link href="/" className="text-sm font-medium text-foreground-muted hover:text-accent">
        ← Back to map
      </Link>

      <header className="mt-4 mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">{info.region}</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {info.name}
        </h1>
        <p className="mt-1 text-foreground-muted">Capital: {info.capital}</p>
        <p className="mt-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-foreground-muted">
          💡 {info.funFact}
        </p>
      </header>

      <StateDetailClient
        stateCode={code}
        initialMemories={memories}
        initialVisited={!!visitRow?.visited}
        initialFirstVisitedOn={visitRow?.first_visited_on ?? null}
      />
    </div>
  );
}
