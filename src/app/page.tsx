import { requireViewer } from "@/lib/auth";
import { getAllMemories } from "@/lib/memories";
import { getFamilyVisits } from "@/lib/stateVisits";
import HomeExperience from "@/components/home/HomeExperience";
import MemoryRail from "@/components/home/MemoryRail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await requireViewer();
  const [visits, memories] = await Promise.all([getFamilyVisits(viewer.familyId), getAllMemories(viewer.familyId)]);

  return (
    <>
      <HomeExperience initialVisits={visits} />
      <MemoryRail memories={memories.slice(0, 8)} />
    </>
  );
}
