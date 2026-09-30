"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Label, TextInput } from "@/components/ui/Field";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);
    if (res?.ok) {
      // Refresh too, so the layout re-renders with the family.
      router.replace(next);
      router.refresh();
      return;
    }
    setError((await res?.json().catch(() => null))?.error ?? "Couldn't sign in. Check your connection.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="font-display text-[2rem] leading-tight">Welcome back</h2>
        <p className="mt-1 text-[15px] text-ink-3">Sign in to your family&apos;s map.</p>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <TextInput
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <TextInput
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-2xl bg-coral-soft px-4 py-3 text-[14px] text-ink">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={busy}
        trailingIcon={<ArrowRightIcon size={15} />}
        className="w-full justify-between"
      >
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-[14px] text-ink-3">
        New here?{" "}
        <Link href="/join" className="font-semibold text-petrol hover:text-petrol-strong">
          Start your family&apos;s map
        </Link>
        <br />
        Got an invite link? Open it to join your family.
      </p>
    </form>
  );
}
