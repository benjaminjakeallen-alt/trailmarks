import { notFound } from "next/navigation";
import { getMemoriesForState } from "@/lib/memories";
import { getStateVisit } from "@/lib/stateVisits";
import { STATES_BY_CODE } from "@/lib/statesData";
import StateDetailClient from "@/components/StateDetailClient";

export const dynamic = "force-dynamic";

interface StatePageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: StatePageProps) {
  const { code } = await params;
  const info = STATES_BY_CODE[code.toUpperCase()];
  return { title: info ? `${info.name} — Trailmarks` : "Trailmarks" };
}

export default async function StatePage({ params }: StatePageProps) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (!STATES_BY_CODE[code]) notFound();

  const [visit, memories] = await Promise.all([getStateVisit(code), getMemoriesForState(code)]);

  return (
    <StateDetailClient
      stateCode={code}
      initialMemories={memories}
      initialVisited={!!visit?.visited}
      initialFirstVisitedOn={visit?.firstVisitedOn ?? null}
    />
  );
}
