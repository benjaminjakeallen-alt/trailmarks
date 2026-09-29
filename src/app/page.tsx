import { getAllMemories } from "@/lib/memories";
import { getVisitedStateCodes } from "@/lib/stateVisits";
import HomeExperience from "@/components/home/HomeExperience";
import MemoryRail from "@/components/home/MemoryRail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [visitedCodes, memories] = await Promise.all([getVisitedStateCodes(), getAllMemories()]);

  return (
    <>
      <HomeExperience initialVisited={visitedCodes} />
      <MemoryRail memories={memories.slice(0, 8)} />
    </>
  );
}
