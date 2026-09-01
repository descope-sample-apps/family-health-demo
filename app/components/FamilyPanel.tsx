"use client";

import { useEffect, useState } from "react";
import { useDescope, useSession } from "@descope/nextjs-sdk/client";
import Avatar from "./Avatar";
import EditProfileModal from "./EditProfileModal";
import { familyApi, decodeClaims } from "../lib/family";
import { resolveAvatar } from "../lib/avatars";
import type { Family, FamilyMember } from "../lib/types";

const btn =
  "rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]";
const input =
  "rounded-md border border-black/[.08] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/[.145] dark:focus:border-white/40";

export default function FamilyPanel({
  selfUserId,
  onClose,
}: {
  selfUserId?: string;
  onClose: () => void;
}) {
  const sdk = useDescope();
  const { sessionToken } = useSession();
  // Present while impersonating a family member - drives "click yourself to stop" below.
  const isImpersonating = Boolean(decodeClaims(sessionToken)?.act);
  const [members, setMembers] = useState<FamilyMember[] | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/family");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!alive) return;
        const parsed = data as { members: FamilyMember[]; families: Family[] };
        setMembers(parsed.members);
        setFamilies(parsed.families);
        // Default to the first family the caller belongs to, but keep whatever's already selected
        // (e.g. after an edit triggers a reload) if it's still valid.
        setSelectedFamilyId((prev) =>
          prev && parsed.families.some((f) => f.familyId === prev)
            ? prev
            : parsed.families[0]?.familyId ?? ""
        );
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const visibleMembers = members?.filter(
    (m) => !selectedFamilyId || m.familyIds.includes(selectedFamilyId)
  );

  // Switching the family dropdown always refilters the member list locally; when NOT impersonating it
  // also calls the real SelectFamily endpoint, stamping dcf on the caller's own session (a separate
  // capability from impersonate's selectedFamily, which only stamps dcf on the impersonated session -
  // see app/api/family/impersonate/route.ts).
  async function onFamilyChange(familyId: string) {
    setSelectedFamilyId(familyId);
    if (isImpersonating) return;
    try {
      await familyApi(sdk).selectFamily(familyId);
    } catch (e) {
      console.error(e);
      setError("Couldn't switch family - try again.");
    }
  }

  // Clicking a member's row impersonates them; clicking the currently-active identity's own row (the
  // "You" row, which is whoever the session actually is right now - the impersonated member, while
  // impersonating) stops impersonating instead. Self while NOT impersonating is a no-op.
  async function onRowClick(member: FamilyMember) {
    const isSelf = member.userId === selfUserId;
    setError("");
    setBusyUserId(member.userId);
    try {
      if (isSelf) {
        if (!isImpersonating) return;
        await familyApi(sdk).stopImpersonation();
      } else {
        if (!member.loginId) return;
        await familyApi(sdk).impersonate(member.loginId, selectedFamilyId);
      }
      onClose(); // main screen now reflects the new session
    } catch (e) {
      console.error(e);
      setError(isSelf ? "Couldn't stop impersonating - try again." : "You can't log in as this user");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-black dark:text-zinc-50">My Family</h2>
          <button onClick={onClose} className={btn}>
            Close
          </button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {families.length > 0 && (
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Family
            <select
              className={input}
              value={selectedFamilyId}
              onChange={(e) => onFamilyChange(e.target.value)}
            >
              {families.map((f) => (
                <option key={f.familyId} value={f.familyId}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {members === null && !error && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading family members...</p>
        )}

        {members !== null && families.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No family found for this user. Configure a family in your Descope project to see members
            here.
          </p>
        )}

        {visibleMembers !== undefined && visibleMembers.length > 0 && (
          <ul className="flex flex-col gap-2">
            {visibleMembers.map((m) => {
              const isSelf = m.userId === selfUserId;
              const parentType = m.userFamilies.find((f) => f.familyId === selectedFamilyId)?.parentType;
              // Self is only actionable while impersonating (click to stop); everyone else needs a
              // login ID to impersonate.
              const canAct = isSelf ? isImpersonating : Boolean(m.loginId);
              return (
                <li
                  key={m.userId}
                  className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-3 py-2 dark:bg-white/[.04]"
                >
                  <button
                    type="button"
                    onClick={() => onRowClick(m)}
                    disabled={busyUserId === m.userId || !canAct}
                    title={
                      isSelf
                        ? isImpersonating
                          ? "Stop impersonating"
                          : ""
                        : m.loginId
                          ? "Impersonate"
                          : "No login ID"
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-black/[.04] disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent dark:hover:bg-white/[.06]"
                  >
                    <Avatar name={m.name} picture={resolveAvatar(m.picture, m.dependent)} size={36} />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-black dark:text-zinc-50">
                        {m.name || m.email || m.phone || m.loginId || m.userId}
                      </span>
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                          You
                        </span>
                      )}
                      {m.dependent && (
                        <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                          Child
                        </span>
                      )}
                      {parentType && (
                        <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                          {parentType}
                        </span>
                      )}
                      {m.phone && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {m.phone}
                        </p>
                      )}
                    </div>
                  </button>

                  <button className={btn} onClick={() => setEditing(m)}>
                    Edit
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <EditProfileModal
          member={editing}
          familyId={selectedFamilyId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
