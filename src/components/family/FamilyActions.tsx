"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, ShareNetworkIcon, SignOutIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

/** The invite link to send, with copy and (on phones) the share sheet. */
export function InviteLink({ code, familyName }: { code: string; familyName: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}/join?code=${code}`;

  async function copy() {
    await navigator.clipboard.writeText(url()).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    await navigator
      .share({ title: "Trailmarks", text: `Join ${familyName} on Trailmarks`, url: url() })
      .catch(() => {});
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded-xl bg-bg px-3 py-2 font-sans text-[15px] font-semibold tracking-[0.12em] ring-1 ring-line">
        {code}
      </code>
      <Button onClick={copy} icon={copied ? <CheckIcon size={16} weight="bold" /> : <CopyIcon size={16} />}>
        {copied ? "Link copied" : "Copy invite link"}
      </Button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button variant="secondary" onClick={share} icon={<ShareNetworkIcon size={16} />}>
          Share
        </Button>
      )}
    </div>
  );
}

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
