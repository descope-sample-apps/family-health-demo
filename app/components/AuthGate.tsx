"use client";

import { useEffect, useState } from "react";
import { Descope } from "@descope/nextjs-sdk";
import { useSession, useDescope } from "@descope/nextjs-sdk/client";
import ProfileButton from "./ProfileButton";
import AppointmentsSection from "./AppointmentsSection";
import JwtDebugPanel from "./JwtDebugPanel";
import { decodeClaims, familyApi } from "../lib/family";

type CurrentUser = {
  userId?: string;
  name?: string;
  email?: string;
  picture?: string;
};

export default function AuthGate() {
  const { isAuthenticated, isSessionLoading, sessionToken } = useSession();
  const sdk = useDescope();
  // The session token's `sub` claim updates reactively the instant sdk.refresh() adopts a new
  // session (impersonate/stop) - unlike useUser(), which only fetches once per mount and never
  // reactively refetches afterward. Re-fetch "who am I" whenever `sub` changes instead of relying
  // on useUser()'s cached object, so the profile button and the appointments list (keyed off `sub`
  // below) both actually reflect an identity switch.
  const sub = decodeClaims(sessionToken)?.sub;
  // While impersonating, the "Viewing as" banner names the impersonating PARENT (the actor who
  // started the impersonation), not the impersonated child `sub` is currently pointing at - resolved
  // from the act claim's `sub` (see app/lib/family.ts for why that's the impersonator's user id).
  const actorId = decodeClaims(sessionToken)?.act?.sub;
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [actor, setActor] = useState<CurrentUser | null>(null);
  // Which subject `me` was fetched for - lets us tell "still loading the new identity" apart from
  // "loaded, just happens to render the same" without touching a ref during render.
  const [meSub, setMeSub] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!sub) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json().catch(() => ({}));
        if (alive && res.ok) setMe(data as CurrentUser);
      } finally {
        if (alive) setMeSub(sub);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sub]);

  useEffect(() => {
    // No reset when actorId disappears (stopped impersonating): the banner that reads `actor` only
    // renders while isImpersonating is true, i.e. while actorId IS set, so a stale value here is
    // simply never read.
    if (!actorId) return;
    let alive = true;
    (async () => {
      const res = await fetch(`/api/me?userId=${encodeURIComponent(actorId)}`);
      const data = await res.json().catch(() => ({}));
      if (alive && res.ok) setActor(data as CurrentUser);
    })();
    return () => {
      alive = false;
    };
  }, [actorId]);

  if (isSessionLoading || (sub && meSub !== sub)) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>;
  }

  if (!isAuthenticated) {
    return <Descope flowId={process.env.NEXT_PUBLIC_DESCOPE_FLOW_ID || "sign-up-or-in"} />;
  }

  const isImpersonating = Boolean(decodeClaims(sessionToken)?.act);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <ProfileButton user={me} />
        <button
          onClick={() => sdk.logout()}
          className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Logout
        </button>
      </div>

      {isImpersonating && (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <span>Viewing as {actor?.name || actor?.email || actor?.userId}</span>
          <button
            onClick={() => familyApi(sdk).stopImpersonation()}
            className="rounded-full border border-amber-400 px-3 py-1 text-xs font-medium transition-colors hover:bg-amber-100 dark:border-amber-500/50 dark:hover:bg-amber-500/20"
          >
            Stop
          </button>
        </div>
      )}

      <AppointmentsSection subject={sub} />
      <JwtDebugPanel />
    </div>
  );
}
