"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import FamilyPanel from "./FamilyPanel";
import { resolveAvatar } from "../lib/avatars";

type CurrentUser = {
  userId?: string;
  name?: string;
  email?: string;
  picture?: string;
  dependent?: boolean;
} | null;

export default function ProfileButton({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-full border border-black/[.08] px-2 py-1 pr-4 text-left transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        <Avatar name={user?.name} picture={resolveAvatar(user?.picture, user?.dependent)} size={36} />
        <span className="text-sm font-medium text-black dark:text-zinc-50">
          {user?.name || user?.email || user?.userId}
        </span>
      </button>

      {open && <FamilyPanel selfUserId={user?.userId} onClose={() => setOpen(false)} />}
    </>
  );
}
