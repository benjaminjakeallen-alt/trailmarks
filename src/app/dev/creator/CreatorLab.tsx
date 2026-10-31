"use client";

import FamilyProvider, { useFamily } from "@/components/family/FamilyProvider";
import type { Viewer } from "@/lib/types";

const VIEWER: Viewer = { userId: "dev-me", displayName: "Ben", color: "#2f7fd6", avatarUrl: null, email: "dev@example.com", familyId: "dev" };

function Open() {
  const { openCharacter } = useFamily();
  return (
    <button type="button" data-open onClick={openCharacter} className="m-6 rounded-full bg-accent px-5 py-3 text-on-accent">
      Open
    </button>
  );
}

export default function CreatorLab() {
  return (
    <FamilyProvider viewer={VIEWER} members={[VIEWER]} family={{ name: "Dev", inviteCode: "DEV" }}>
      <Open />
    </FamilyProvider>
  );
}
