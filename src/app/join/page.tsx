import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { findFamilyByInvite, getMembers } from "@/lib/family";
import AuthShell from "@/components/auth/AuthShell";
import JoinForm from "@/components/auth/JoinForm";
import InviteCodeEntry from "@/components/auth/InviteCodeEntry";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join — Trailmarks" };

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  if (await getViewer()) redirect("/");

  const raw = (await searchParams).code;
  const code = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const family = code ? await findFamilyByInvite(code) : null;
  const members = family ? await getMembers(family.id) : [];

  return (
    <AuthShell>
      <JoinForm
        invite={family ? { code, familyName: family.name, members } : null}
        inviteInvalid={Boolean(code) && !family}
      />
      {!family && <InviteCodeEntry />}
    </AuthShell>
  );
}
