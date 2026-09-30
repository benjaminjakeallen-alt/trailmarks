"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOutIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }
  return (
    <Button variant="secondary" onClick={signOut} disabled={busy} icon={<SignOutIcon size={16} />}>
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}
