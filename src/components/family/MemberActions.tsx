"use client";

import { useState, useSyncExternalStore } from "react";
import {
  ChatCircleTextIcon,
  CheckIcon,
  CopyIcon,
  KeyIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Label, TextInput } from "@/components/ui/Field";
import Sheet from "@/components/ui/Sheet";
import { HAPTICS, haptic } from "@/lib/motion";

const noSubscribe = () => () => {};
const pill =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-petrol ring-1 ring-line hover:bg-bg hover:ring-petrol/40";

/** For someone else in the family: make them a one-time reset link and send it. */
export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);

  async function make() {
    setOpen(true);
    setToken(null);
    setError(null);
    const res = await fetch(`/api/family/members/${userId}/reset`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.token) setToken(data.token);
    else setError(data?.error ?? "Couldn't make a reset link. Check your connection.");
  }

  const url = token ? `${window.location.origin}/reset?token=${token}` : "";
  const message = `Here's a link to set a new Trailmarks password. It works once, for the next two days:`;

  async function copy() {
    await navigator.clipboard.writeText(url).catch(() => {});
    haptic(HAPTICS.select);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <button type="button" onClick={make} className={pill}>
        <KeyIcon size={14} /> Reset password
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label={`Reset ${name}'s password`}>
        <div className="pr-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sun-soft text-[#b36b00]">
            <KeyIcon size={24} weight="fill" />
          </span>
          <h2 className="mt-4 font-display text-[1.8rem] leading-tight">Reset {name}&apos;s password</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-3">
            Send {name} this link. It lets them pick a new password once, and expires in two days. Any older reset link
            for them stops working.
          </p>
        </div>
        {error && <p className="mt-5 rounded-2xl bg-coral-soft px-4 py-3 text-[14px]">{error}</p>}
        {!error && (
          <div className="mt-5 space-y-3">
            <p className="truncate rounded-2xl bg-bg px-4 py-3 font-mono text-[13px] text-ink-2 ring-1 ring-line">
              {url || "Making a link…"}
            </p>
            {canShare && (
              <Button
                disabled={!token}
                onClick={() => navigator.share({ title: "New Trailmarks password", text: message, url }).catch(() => {})}
                icon={<PaperPlaneTiltIcon size={18} weight="fill" />}
                className="w-full"
              >
                Send to {name}
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={token ? `sms:?&body=${encodeURIComponent(`${message} ${url}`)}` : undefined}
                aria-disabled={!token}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-elevated text-[15px] font-medium ring-1 ring-line-strong aria-disabled:opacity-50"
              >
                <ChatCircleTextIcon size={18} className="text-[#138a4a]" weight="fill" /> Text
              </a>
              <Button variant="secondary" disabled={!token} onClick={copy} icon={copied ? <CheckIcon size={16} weight="bold" /> : <CopyIcon size={16} />}>
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

/** For yourself: current password, then the new one. */
export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setError(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    }).catch(() => null);
    if (res?.ok) {
      haptic(HAPTICS.claim);
      setStatus("done");
      setCurrent("");
      setNext("");
      return;
    }
    setError((await res?.json().catch(() => null))?.error ?? "Couldn't change the password. Check your connection.");
    setStatus("idle");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStatus("idle");
          setError(null);
          setOpen(true);
        }}
        className={pill}
      >
        <KeyIcon size={14} /> Change password
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Change your password">
        <h2 className="pr-10 font-display text-[1.8rem] leading-tight">Change your password</h2>
        {status === "done" ? (
          <div className="mt-4">
            <p className="text-[15px] text-ink-2">Done. Use the new password next time you sign in.</p>
            <Button className="mt-5 w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <TextInput
                id="current-password"
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <TextInput
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="rounded-2xl bg-coral-soft px-4 py-3 text-[14px]">
                {error}
              </p>
            )}
            <Button type="submit" disabled={status === "busy"} className="w-full">
              {status === "busy" ? "Saving…" : "Save new password"}
            </Button>
          </form>
        )}
      </Sheet>
    </>
  );
}
