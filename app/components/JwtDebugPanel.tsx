"use client";

import { useSession, getRefreshToken } from "@descope/nextjs-sdk/client";
import { decodeClaims } from "../lib/family";

const box =
  "flex-1 min-w-0 rounded-md border border-black/[.08] bg-white p-2 dark:border-white/[.145] dark:bg-zinc-900";

// Debug-only panel showing the JWTs actually in play - the current session token, and whatever
// getRefreshToken() would send if you clicked Stop right now. Not part of the app's real UI, just
// visibility while testing the impersonation flow.
export default function JwtDebugPanel() {
  const { sessionToken } = useSession();
  // getRefreshToken() is a synchronous, side-effect-free read, so it's fine to call directly during
  // render (re-runs on every render, e.g. whenever sessionToken changes) rather than via an effect.
  const refreshJwt = typeof window !== "undefined" ? getRefreshToken() : undefined;

  const sessionClaims = decodeClaims(sessionToken);
  const refreshClaims = decodeClaims(refreshJwt);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-72 overflow-auto border-t border-black/[.08] bg-zinc-100/95 p-3 text-xs backdrop-blur dark:border-white/[.145] dark:bg-zinc-950/95">
      <p className="mb-2 font-semibold text-zinc-500 dark:text-zinc-400">JWT debug</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className={box}>
          <p className="mb-1 font-medium text-black dark:text-zinc-50">Session JWT (useSession)</p>
          <p className="break-all font-mono text-zinc-600 dark:text-zinc-400">
            {sessionToken || "(none)"}
          </p>
          <pre className="mt-1 whitespace-pre-wrap text-zinc-500 dark:text-zinc-500">
            {JSON.stringify(
              {
                sub: sessionClaims?.sub,
                act: sessionClaims?.act,
                dcf: sessionClaims?.dcf,
                exp: sessionClaims?.exp,
              },
              null,
              2
            )}
          </pre>
        </div>
        <div className={box}>
          <p className="mb-1 font-medium text-black dark:text-zinc-50">
            Refresh JWT (getRefreshToken, sent on Stop)
          </p>
          <p className="break-all font-mono text-zinc-600 dark:text-zinc-400">
            {refreshJwt || "(none)"}
          </p>
          <pre className="mt-1 whitespace-pre-wrap text-zinc-500 dark:text-zinc-500">
            {JSON.stringify(
              { sub: refreshClaims?.sub, act: refreshClaims?.act, exp: refreshClaims?.exp },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
