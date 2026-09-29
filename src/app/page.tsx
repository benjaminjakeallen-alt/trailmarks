import { getAllMemories } from "@/lib/memories";
import { getVisitedStateCodes } from "@/lib/stateVisits";
import HomeExperience, { type HeroPhoto } from "@/components/home/HomeExperience";
import MemoryRail from "@/components/home/MemoryRail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [visitedCodes, memories] = await Promise.all([getVisitedStateCodes(), getAllMemories()]);

  // The hero is your own most recent photo, not a stock image.
  const latest = memories.find((m) => m.photos.length > 0);
  const hero: HeroPhoto | null = latest
    ? { url: latest.photos[0].url, title: latest.title, stateCode: latest.stateCode }
    : null;

  return (
    <>
      <HomeExperience initialVisited={visitedCodes} hero={hero} memoryCount={memories.length} />
      <MemoryRail memories={memories.slice(0, 8)} />
    </>
  );
}
