import { requireViewer } from "@/lib/auth";
import { getFamily } from "@/lib/family";
import { getFamilyVisits } from "@/lib/stateVisits";
import Avatar from "@/components/family/Avatar";
import { SignOutButton } from "@/components/family/FamilyActions";
import { InviteOptions } from "@/components/family/Invite";
import { AdventurerButton, ChangePasswordButton, ResetPasswordButton } from "@/components/family/MemberActions";
import { Eyebrow, Panel } from "@/components/ui/Panel";
import { WordReveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Family — Trailmarks" };

export default async function FamilyPage() {
  const viewer = await requireViewer();
  const [family, visits] = await Promise.all([getFamily(viewer.familyId), getFamilyVisits(viewer.familyId)]);

  const counts = new Map<string, number>();
  for (const v of visits) if (v.stateCode !== "DC") counts.set(v.userId, (counts.get(v.userId) ?? 0) + 1);
  const statesByMember = new Map<string, Set<string>>();
  for (const v of visits) {
    if (!statesByMember.has(v.userId)) statesByMember.set(v.userId, new Set());
    statesByMember.get(v.userId)!.add(v.stateCode);
  }
  const everyone =
    family.members.length > 1
      ? [...(statesByMember.get(family.members[0].userId) ?? [])].filter(
          (code) => code !== "DC" && family.members.every((m) => statesByMember.get(m.userId)?.has(code)),
        ).length
      : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-8 lg:pt-10">
      <Eyebrow>Your family</Eyebrow>
      <WordReveal
        text={family.name}
        className="mt-3 font-display text-[clamp(2.4rem,6vw,4rem)] leading-[1] tracking-[-0.035em]"
      />
      {family.members.length > 1 && (
        <p className="mt-3 text-[16px] text-ink-2">
          {everyone === 0
            ? "No state the whole family has been to yet. The first one turns gold."
            : `${everyone} ${everyone === 1 ? "state" : "states"} the whole family has been to, in gold on the map.`}
        </p>
      )}

      <Panel className="mt-8" innerClassName="p-5 sm:p-7">
        <h2 className="font-display text-xl">Members</h2>
        <ul className="mt-4 divide-y divide-line">
          {family.members.map((m) => (
            <li key={m.userId} className="flex items-start gap-4 py-4">
              <Avatar member={m} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold">
                  {m.displayName}
                  {m.userId === viewer.userId && <span className="ml-2 text-[13px] font-medium text-ink-3">You</span>}
                </p>
                {m.userId === viewer.userId && <p className="truncate text-[13px] text-ink-3">{viewer.email}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.userId === viewer.userId ? (
                    <>
                      <AdventurerButton hasAvatar={Boolean(m.avatarUrl)} />
                      <ChangePasswordButton />
                    </>
                  ) : (
                    <ResetPasswordButton userId={m.userId} name={m.displayName} />
                  )}
                </div>
              </div>
              <p className="text-right">
                <span className="font-display text-[1.5rem] text-petrol tabular">{counts.get(m.userId) ?? 0}</span>
                <span className="ml-1 text-[13px] text-ink-3">states</span>
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-5" innerClassName="p-5 sm:p-7">
        <h2 className="font-display text-xl">Invite the family</h2>
        <p className="mb-5 mt-1 text-[15px] leading-relaxed text-ink-3">
          Everyone gets their own login and their own states; trips, memories and photos are shared with the whole
          family.
        </p>
        <InviteOptions />
      </Panel>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
