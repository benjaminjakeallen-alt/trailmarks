"use client";

import { createContext, useContext, useMemo } from "react";
import type { Member, Viewer } from "@/lib/types";

interface FamilyContextValue {
  viewer: Viewer | null;
  members: Member[];
  byId: Record<string, Member>;
}

const FamilyContext = createContext<FamilyContextValue>({ viewer: null, members: [], byId: {} });

/** The signed-in person and their family, loaded once in the root layout. */
export default function FamilyProvider({
  viewer,
  members,
  children,
}: {
  viewer: Viewer | null;
  members: Member[];
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ viewer, members, byId: Object.fromEntries(members.map((m) => [m.userId, m])) }),
    [viewer, members],
  );
  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
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
