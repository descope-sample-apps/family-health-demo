"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import { resolveAvatar } from "../lib/avatars";
import { updateProfile } from "../lib/profileApi";
import type { FamilyMember } from "../lib/types";

const btn =
  "rounded-full border border-black/[.08] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]";
const input =
  "rounded-md border border-black/[.08] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/[.145] dark:focus:border-white/40";

export default function EditProfileModal({
  member,
  familyId,
  onClose,
  onSaved,
}: {
  member: FamilyMember;
  familyId: string; // which of the member's families we're editing under (parentType is per-family)
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(member.name || "");
  const [phone, setPhone] = useState(member.phone || "");
  const [parentType, setParentType] = useState(
    member.userFamilies.find((f) => f.familyId === familyId)?.parentType || ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // Real Management API calls - see app/api/profile/route.ts.
      await updateProfile({ userId: member.userId, name, phone, familyId, parentType });
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
          <Avatar name={name} picture={resolveAvatar(name, member.picture)} size={40} />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Name
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Phone
          <input
            className={input}
            type="tel"
            placeholder="+1 555 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Parent type
          <input
            className={input}
            placeholder="Mother / Father / Guardian"
            value={parentType}
            onChange={(e) => setParentType(e.target.value)}
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
