import type { Member } from "@/lib/types";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

/** A member's initials on their color. */
export default function Avatar({
  member,
  size = 28,
  ring = false,
  className = "",
}: {
  member: Pick<Member, "displayName" | "color">;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      title={member.displayName}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${
        ring ? "ring-2 ring-elevated" : ""
      } ${className}`}
      style={{ width: size, height: size, background: member.color, fontSize: Math.round(size * 0.4) }}
    >
      {initials(member.displayName)}
    </span>
  );
}

/** Overlapping avatars, capped with a "+n". */
export function AvatarStack({ members, size = 26, max = 4 }: { members: Member[]; size?: number; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((m, i) => (
        <Avatar key={m.userId} member={m} size={size} ring className={i > 0 ? "-ml-2" : ""} />
      ))}
      {extra > 0 && (
        <span
          className="-ml-2 inline-flex items-center justify-center rounded-full bg-sunken font-semibold text-ink-2 ring-2 ring-elevated"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
