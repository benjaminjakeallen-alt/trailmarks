"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, KeyIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Label, TextInput } from "@/components/ui/Field";

export default function ResetForm({ token, name, madeBy }: { token: string; name: string; madeBy: string | null }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    if (res?.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setError((await res?.json().catch(() => null))?.error ?? "Couldn't reset the password. Check your connection.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-petrol-soft px-3 py-1 text-[13px] font-semibold text-petrol">
          <KeyIcon size={15} weight="fill" /> Password reset
        </span>
        <h2 className="mt-3 font-display text-[2rem] leading-tight">New password for {name}</h2>
        <p className="mt-1 text-[15px] text-ink-3">
          {madeBy ? `${madeBy} made this link for you. ` : ""}It works once, then you&apos;re signed in.
        </p>
      </div>
      <div>
        <Label htmlFor="password">New password</Label>
        <TextInput
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-2xl bg-coral-soft px-4 py-3 text-[14px] text-ink">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} trailingIcon={<ArrowRightIcon size={15} />} className="w-full justify-between">
        {busy ? "Saving…" : "Save and sign in"}
      </Button>
    </form>
  );
}
