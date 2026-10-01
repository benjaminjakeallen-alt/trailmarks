import { requireViewer } from "@/lib/auth";
import { getAllMemories } from "@/lib/memories";
import { getFamilyVisits } from "@/lib/stateVisits";
import { getFamilyCountryVisits } from "@/lib/countryVisits";
import HomeExperience from "@/components/home/HomeExperience";
import MemoryRail from "@/components/home/MemoryRail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await requireViewer();
  const [visits, countryVisits, memories] = await Promise.all([
    getFamilyVisits(viewer.familyId),
    getFamilyCountryVisits(viewer.familyId),
    getAllMemories(viewer.familyId),
  ]);

  return (
    <>
      <HomeExperience initialVisits={visits} initialCountryVisits={countryVisits} />
      <MemoryRail memories={memories.slice(0, 8)} />
    </>
  );
}
