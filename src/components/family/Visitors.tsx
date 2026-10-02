"use client";

import { AvatarStack } from "@/components/family/Avatar";
import { useFamily, useMemberName } from "@/components/family/FamilyProvider";

function sentence(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function useVisitorLine(userIds: string[]) {
  const { members, byId } = useFamily();
  const nameOf = useMemberName();
  const visitors = userIds.map((id) => byId[id]).filter(Boolean);
  const everyone = members.length > 1 && visitors.length === members.length;
  const line =
    visitors.length === 0
      ? "No one in the family yet"
      : everyone
        ? "The whole family has been here"
        : `${sentence(userIds.map(nameOf))} ${userIds.length === 1 && nameOf(userIds[0]) !== "You" ? "has" : "have"} been here`;
  return { members, visitors, everyone, line };
}

/** "You and Mom have been here", with their avatars. Renders nothing for a family of one. */
export default function Visitors({
  userIds,
  size = 24,
  onPhoto = false,
  className = "",
}: {
  userIds: string[];
  size?: number;
  /** White text for photo heroes. */
  onPhoto?: boolean;
  className?: string;
}) {
  const { members, visitors, line } = useVisitorLine(userIds);
  if (members.length < 2) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {visitors.length > 0 && <AvatarStack members={visitors} size={size} />}
      <span className={`text-[13px] leading-snug ${onPhoto ? "text-white/80" : "text-fg-subtle"}`}>{line}</span>
    </div>
  );
}
