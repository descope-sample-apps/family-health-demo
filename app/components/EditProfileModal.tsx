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
  // Which of the member's families we're editing under - family-scoped attributes are per-family.
  familyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(member.name || "");
  const [phone, setPhone] = useState(member.phone || "");
  // Whatever family-scoped custom attributes this member already has in this family. The app has no
  // hardcoded attribute names - it edits what the project actually defines.
  const [attributes, setAttributes] = useState<Record<string, string>>(
    () => member.userFamilies.find((f) => f.familyId === familyId)?.familyScopedAttributes ?? {}
  );
  // Lets you set an attribute that has no value on this member yet (the project defines which names
  // are valid; the API rejects unknown ones).
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const familyScopedAttributes = { ...attributes };
      if (newKey.trim()) familyScopedAttributes[newKey.trim()] = newValue;
      // Real Management API calls - see app/api/profile/route.ts.
      await updateProfile({ userId: member.userId, name, phone, familyId, familyScopedAttributes });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const attributeEntries = Object.entries(attributes);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={onSubmit}
        className="flex max-h-[90vh] w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-black dark:text-zinc-50">Edit details</h3>
          <Avatar name={name} picture={resolveAvatar(member.picture, member.dependent)} size={40} />
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

        <fieldset className="flex flex-col gap-3 rounded-md border border-black/[.08] p-3 dark:border-white/[.145]">
          <legend className="px-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Family-scoped attributes
          </legend>

          {attributeEntries.length === 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              None set for this family yet.
            </p>
          )}

          {attributeEntries.map(([key, value]) => (
            <label key={key} className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              {key}
              <input
                className={input}
                value={value}
                onChange={(e) =>
                  setAttributes((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </label>
          ))}

          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Add attribute</span>
            <div className="flex gap-2">
              <input
                className={`${input} min-w-0 flex-1`}
                placeholder="name"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <input
                className={`${input} min-w-0 flex-1`}
                placeholder="value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

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
