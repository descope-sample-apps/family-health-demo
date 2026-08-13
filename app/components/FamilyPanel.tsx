"use client";

import { useEffect, useState } from "react";
import { useDescope } from "@descope/nextjs-sdk/client";
import Avatar from "./Avatar";
import EditProfileModal from "./EditProfileModal";
import { familyApi } from "../lib/family";
import type { FamilyMember } from "../lib/types";

const btn =
  "rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]";

export default function FamilyPanel({
  selfUserId,
  onClose,
}: {
  selfUserId?: string;
  onClose: () => void;
}) {
  const sdk = useDescope();
  const [members, setMembers] = useState<FamilyMember[] | null>(null);
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
        setMembers((data as { members: FamilyMember[] }).members);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  async function onImpersonate(member: FamilyMember) {
    if (!member.loginId) return;
    setError("");
    setBusyUserId(member.userId);
    try {
      await familyApi(sdk).impersonate(member.loginId);
      onClose(); // main screen now reflects the impersonated user's session
    } catch (e) {
      setError((e as Error).message);
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

        {members === null && !error && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading family members...</p>
        )}

        {members !== null && members.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No family found for this user. Configure a family in your Descope project to see members
            here.
          </p>
        )}

        {members !== null && members.length > 0 && (
          <ul className="flex flex-col gap-2">
            {members.map((m) => {
              const isSelf = m.userId === selfUserId;
              return (
                <li
                  key={m.userId}
                  className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-3 py-2 dark:bg-white/[.04]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={m.name} picture={m.picture} size={36} />
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
                          Dependent
                        </span>
                      )}
                      {m.address && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {m.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button className={btn} onClick={() => setEditing(m)}>
                      Edit
                    </button>
                    {!isSelf && (
                      <button
                        className={btn}
                        disabled={busyUserId === m.userId || !m.loginId}
                        title={m.loginId ? "" : "No login ID"}
                        onClick={() => onImpersonate(m)}
                      >
                        {busyUserId === m.userId ? "Switching..." : "Impersonate"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <EditProfileModal
          member={editing}
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
