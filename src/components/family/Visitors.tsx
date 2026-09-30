"use client";

import { AvatarStack } from "@/components/family/Avatar";
import Campfire from "@/components/family/Campfire";
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
      <span className={`text-[13px] leading-snug ${onPhoto ? "text-white/80" : "text-ink-3"}`}>{line}</span>
    </div>
  );
}

/** The same, as the campfire scene: everyone who's been, sitting round the fire. Tap one to see who. */
export function VisitorsCamp({
  userIds,
  dates,
  className = "",
}: {
  userIds: string[];
  dates?: Record<string, string | null>;
  className?: string;
}) {
  const { members, visitors, everyone, line } = useVisitorLine(userIds);
  if (!visitors.length) {
    return members.length > 1 ? <p className={`text-[13px] text-ink-3 ${className}`}>{line}</p> : null;
  }
  return (
    <div className={`flex flex-col items-center rounded-3xl bg-gradient-to-b from-[#12343a] to-[#0b2327] px-3 pb-3 pt-2 ${className}`}>
      <Campfire members={visitors} gold={everyone} dates={dates} />
      <p className="-mt-1 text-center text-[13px] font-medium text-white/80">
        {members.length > 1 ? line : "Your camp"}
        {visitors.length > 1 && <span className="text-white/50"> · tap someone</span>}
      </p>
    </div>
  );
}
