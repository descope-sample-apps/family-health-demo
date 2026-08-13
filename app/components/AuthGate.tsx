"use client";

import { Descope } from "@descope/nextjs-sdk";
import { useSession, useUser, useDescope } from "@descope/nextjs-sdk/client";
import ProfileButton from "./ProfileButton";
import AppointmentsSection from "./AppointmentsSection";
import { decodeClaims, familyApi } from "../lib/family";

export default function AuthGate() {
  const { isAuthenticated, isSessionLoading, sessionToken } = useSession();
  const { isUserLoading, user } = useUser();
  const sdk = useDescope();
  const isLoading = isSessionLoading || isUserLoading;

  if (isLoading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>;
  }

  if (!isAuthenticated) {
    return <Descope flowId={process.env.NEXT_PUBLIC_DESCOPE_FLOW_ID || "sign-up-or-in"} />;
  }

  const isImpersonating = Boolean(decodeClaims(sessionToken)?.act);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <ProfileButton user={user} />
        <button
          onClick={() => sdk.logout()}
          className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Logout
        </button>
      </div>

      {isImpersonating && (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <span>Viewing as {user?.name || user?.email || user?.userId}</span>
          <button
            onClick={() => familyApi(sdk).stopImpersonation()}
            className="rounded-full border border-amber-400 px-3 py-1 text-xs font-medium transition-colors hover:bg-amber-100 dark:border-amber-500/50 dark:hover:bg-amber-500/20"
          >
            Stop
          </button>
        </div>
      )}

      <AppointmentsSection subject={user?.userId} />
    </div>
  );
}
