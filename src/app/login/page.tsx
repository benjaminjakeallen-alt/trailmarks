import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import AuthShell, { safeNext } from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in — Trailmarks" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await getViewer()) redirect(next);
  return (
    <AuthShell>
      <LoginForm next={next} />
    </AuthShell>
  );
}
