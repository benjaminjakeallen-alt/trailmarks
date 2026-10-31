"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { InviteSheet } from "@/components/family/Invite";
import CharacterMaker from "@/components/family/CharacterMaker";
import type { Member, Viewer } from "@/lib/types";

interface FamilyInfo {
  name: string;
  inviteCode: string;
}

interface FamilyContextValue {
  viewer: Viewer | null;
  members: Member[];
  byId: Record<string, Member>;
  family: FamilyInfo | null;
  /** After "New link": the fresh code, without a reload. */
  setInviteCode: (code: string) => void;
  openInvite: () => void;
  openCharacter: () => void;
}

const FamilyContext = createContext<FamilyContextValue>({
  viewer: null,
  members: [],
  byId: {},
  family: null,
  setInviteCode: () => {},
  openInvite: () => {},
  openCharacter: () => {},
});

/** The signed-in person and their family, loaded once in the root layout. Owns the invite and character sheets. */
export default function FamilyProvider({
  viewer,
  members,
  family: initialFamily,
  children,
}: {
  viewer: Viewer | null;
  members: Member[];
  family: FamilyInfo | null;
  children: React.ReactNode;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rotated, setRotated] = useState<{ from: string; to: string } | null>(null);
  // A rotated code applies until the server sends something newer.
  const family = useMemo(
    () =>
      initialFamily && rotated?.from === initialFamily.inviteCode
        ? { ...initialFamily, inviteCode: rotated.to }
        : initialFamily,
    [initialFamily, rotated],
  );
  const setInviteCode = useCallback(
    (code: string) => {
      if (initialFamily) setRotated({ from: initialFamily.inviteCode, to: code });
    },
    [initialFamily],
  );
  const openInvite = useCallback(() => setInviteOpen(true), []);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [characterRun, setCharacterRun] = useState(0);
  const openCharacter = useCallback(() => {
    setCharacterRun((n) => n + 1);
    setCharacterOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      viewer,
      members,
      byId: Object.fromEntries(members.map((m) => [m.userId, m])),
      family,
      setInviteCode,
      openInvite,
      openCharacter,
    }),
    [viewer, members, family, setInviteCode, openInvite, openCharacter],
  );
  return (
    <FamilyContext.Provider value={value}>
      {children}
      {viewer && <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />}
      {viewer && characterRun > 0 && (
        <CharacterMaker key={characterRun} open={characterOpen} onClose={() => setCharacterOpen(false)} />
      )}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  return useContext(FamilyContext);
}

/** "You" for the viewer, their name for everyone else. */
export function useMemberName() {
  const { viewer, byId } = useFamily();
  return (userId: string | null | undefined) =>
    !userId ? "Someone" : userId === viewer?.userId ? "You" : (byId[userId]?.displayName ?? "Someone");
}
