import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ResetForm from "@/components/auth/ResetForm";
import { describeReset } from "@/lib/passwordReset";

export const dynamic = "force-dynamic";
export const metadata = { title: "New password — Trailmarks" };

export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  const raw = (await searchParams).token;
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const reset = token ? await describeReset(token) : null;

  return (
    <AuthShell>
      {reset ? (
        <ResetForm token={token} name={reset.name} />
      ) : (
        <div>
          <h2 className="font-display text-[2rem] leading-tight">This link has expired</h2>
          <p className="mt-2 text-[15px] text-fg-muted">Ask anyone in your family for a new one.</p>
          <Link href="/login" className="mt-6 inline-block font-semibold text-accent-fg hover:text-accent-strong">
            Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
