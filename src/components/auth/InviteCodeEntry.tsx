"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UsersThreeIcon } from "@phosphor-icons/react";

/** For an invite code read off someone's screen: type it, land on that family's join form. */
export default function InviteCodeEntry() {
  const [code, setCode] = useState("");
  const router = useRouter();
  const clean = code.replace(/[^a-z0-9]/gi, "").toUpperCase();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length >= 6) router.push(`/join?code=${clean}`);
      }}
      className="mt-8 rounded-3xl bg-canvas p-4 ring-1 ring-line"
    >
      <label htmlFor="invite-code" className="flex items-center gap-2 text-[14px] font-semibold">
        <UsersThreeIcon size={17} className="text-accent-fg" /> Joining your family instead?
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="invite-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Invite code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={14}
          className="min-h-11 min-w-0 flex-1 rounded-full bg-surface px-4 text-[15px] font-semibold uppercase tracking-[0.12em] outline-none ring-1 ring-line-strong placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-fg-subtle focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={clean.length < 6}
          className="min-h-11 rounded-full bg-accent px-5 text-[15px] font-medium text-on-accent disabled:opacity-40"
        >
          Join
        </button>
      </div>
    </form>
  );
}
