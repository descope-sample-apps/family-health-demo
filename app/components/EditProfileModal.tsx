"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import { updateProfile } from "../lib/profileApi";
import type { FamilyMember } from "../lib/types";

const btn =
  "rounded-full border border-black/[.08] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]";
const input =
  "rounded-md border border-black/[.08] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/[.145] dark:focus:border-white/40";

export default function EditProfileModal({
  member,
  onClose,
  onSaved,
}: {
  member: FamilyMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(member.name || "");
  const [picture, setPicture] = useState(member.picture || "");
  const [address, setAddress] = useState(member.address || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // MOCK - see app/api/profile/route.ts. Doesn't touch the real Descope user record yet.
      await updateProfile({ userId: member.userId, name, picture, address });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-black dark:text-zinc-50">Edit details</h3>
          <Avatar name={name} picture={picture} size={40} />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Name
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Picture URL
          <input
            className={input}
            placeholder="https://..."
            value={picture}
            onChange={(e) => setPicture(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Address
          <input
            className={input}
            placeholder="123 Main St, Springfield"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={btn} disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
