import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getMemoriesForState } from "@/lib/memories";
import { getFamilyVisits, getStateVisit } from "@/lib/stateVisits";
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

  const viewer = await requireViewer();
  const [visit, memories, familyVisits] = await Promise.all([
    getStateVisit(viewer.userId, code),
    getMemoriesForState(viewer.familyId, code),
    getFamilyVisits(viewer.familyId),
  ]);
  const otherVisitorIds = familyVisits
    .filter((v) => v.stateCode === code && v.userId !== viewer.userId)
    .map((v) => v.userId);

  return (
    <StateDetailClient
      stateCode={code}
      initialMemories={memories}
      initialVisited={!!visit?.visited}
      initialFirstVisitedOn={visit?.firstVisitedOn ?? null}
      otherVisitorIds={otherVisitorIds}
    />
  );
}
