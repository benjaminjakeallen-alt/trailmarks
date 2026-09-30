"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Label, TextInput } from "@/components/ui/Field";

/** Start a new family map, or join one from an invite link. */
export default function JoinForm({
  invite,
  inviteInvalid,
}: {
  invite: { code: string; familyName: string } | null;
  inviteInvalid: boolean;
}) {
  const [displayName, setDisplayName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        email,
        password,
        ...(invite ? { inviteCode: invite.code } : { familyName }),
      }),
    }).catch(() => null);
    if (res?.ok) {
      // Refresh too, so the layout re-renders with the new family.
      router.replace("/");
      router.refresh();
      return;
    }
    setError((await res?.json().catch(() => null))?.error ?? "Couldn't create the account. Check your connection.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {invite ? (
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-petrol-soft px-3 py-1 text-[13px] font-semibold text-petrol">
            <UsersThreeIcon size={15} weight="fill" /> You&apos;re invited
          </span>
          <h2 className="mt-3 font-display text-[2rem] leading-tight">Join {invite.familyName}</h2>
          <p className="mt-1 text-[15px] text-ink-3">
            Make your own account. Your states are yours; trips and photos are shared with the family.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="font-display text-[2rem] leading-tight">Start your family&apos;s map</h2>
          <p className="mt-1 text-[15px] text-ink-3">You&apos;ll get an invite link to send to everyone else.</p>
          {inviteInvalid && (
            <p className="mt-3 rounded-2xl bg-sun-soft px-4 py-3 text-[14px] text-ink-2">
              That invite link isn&apos;t valid anymore. Ask for a fresh one, or start a new family here.
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="name">Your name</Label>
        <TextInput
          id="name"
          autoComplete="given-name"
          required
          maxLength={40}
          placeholder="What the family calls you"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      {!invite && (
        <div>
          <Label htmlFor="family">Family name</Label>
          <TextInput
            id="family"
            required
            maxLength={60}
            placeholder="The Allens"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
          />
        </div>
      )}
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
          autoComplete="new-password"
          required
          minLength={8}
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
      <Button
        type="submit"
        disabled={busy}
        trailingIcon={<ArrowRightIcon size={15} />}
        className="w-full justify-between"
      >
        {busy ? "Creating your account…" : invite ? `Join ${invite.familyName}` : "Create our map"}
      </Button>
      <p className="text-center text-[14px] text-ink-3">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-petrol hover:text-petrol-strong">
          Sign in
        </Link>
      </p>
    </form>
  );
}
