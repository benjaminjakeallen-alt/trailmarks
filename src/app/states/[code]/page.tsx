import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemoriesForState } from "@/lib/memories";
import { getStateVisit } from "@/lib/stateVisits";
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

  const [visit, memories] = await Promise.all([getStateVisit(code), getMemoriesForState(code)]);

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
        initialVisited={!!visit?.visited}
        initialFirstVisitedOn={visit?.firstVisitedOn ?? null}
      />
    </div>
  );
}
