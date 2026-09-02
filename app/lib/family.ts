import { getRefreshToken } from "@descope/nextjs-sdk/client";

// Impersonation re-mints a session for a different user, so the route returns the refresh JWT and we
// adopt it client-side via sdk.refresh(). Same mechanism as descope-sample-apps/family-account-demo.
type HttpClientConfig = { token?: string };
type Sdk = {
  httpClient: {
    post: (path: string, body?: unknown, config?: HttpClientConfig) => Promise<Response>;
  };
  refresh: (token?: string) => Promise<unknown>;
};

// call an end-user onetime endpoint via the sdk (session-token authed); the sdk auto-persists a
// JWTResponse, so - unlike impersonate/stop - no explicit sdk.refresh() is needed afterward.
async function sdkPost(sdk: Sdk, path: string, body: Record<string, unknown>) {
  const res = await sdk.httpClient.post(path, body);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { errorMessage?: string; message?: string };
    throw new Error(err?.errorMessage || err?.message || `HTTP ${res.status}`);
  }
  return data;
}

// Adopt a refresh JWT that was re-minted out of band (mgmt impersonate / stop). Those responses come
// back through our own server routes, so the SDK's persist hook never sees them - and sdk.refresh(token)
// uses the token for that one call without storing it (/v1/auth/refresh returns an empty refreshJwt when
// the token isn't rotated, so nothing gets persisted there either). Without this, getRefreshToken() and
// the SDK's auto-refresh keep using the PREVIOUS identity's refresh token: stop-impersonation fails
// (that token has no act claim) and the next auto-refresh silently flips the session back.
// Write to wherever the SDK already keeps it: the "DSR" cookie when one exists (refreshTokenViaCookie,
// this app's setup), localStorage "DSR" otherwise (the SDK default) - getRefreshToken() checks the
// cookie before localStorage, so writing the wrong bucket leaves the stale token shadowing the new one.
// Projects that manage tokens in httpOnly cookies (cookie response mode) don't need any of this - the
// auth endpoints set the cookie themselves and the refresh JWT never passes through app code.
function adoptRefreshJwt(refreshJwt: string | undefined) {
  if (!refreshJwt) return;
  if (document.cookie.split("; ").some((c) => c.startsWith("DSR="))) {
    const exp = decodeClaims(refreshJwt)?.exp;
    const maxAge = exp ? `; max-age=${exp - Math.floor(Date.now() / 1000)}` : "";
    document.cookie = `DSR=${refreshJwt}; path=/${maxAge}`;
  } else {
    localStorage.setItem("DSR", refreshJwt);
  }
}

// call one of this app's server route handlers (which proxy to the Management API)
async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { error?: string };
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return data as { refreshJwt?: string };
}

export function familyApi(sdk: Sdk) {
  return {
    // Stamps dcf on the CALLER's own (non-impersonated) session - a real, separate family-account
    // capability from impersonate's selectedFamily, which only stamps dcf on the impersonated one.
    selectFamily: (familyId: string) => sdkPost(sdk, "/v1/auth/family/select", { familyId }),
    // selectedFamily is optional but not cosmetic - see app/api/family/impersonate/route.ts for why.
    impersonate: async (dependentLoginId: string, selectedFamily?: string) => {
      const { refreshJwt } = await apiPost("/api/family/impersonate", {
        dependentLoginId,
        selectedFamily,
      });
      // adopt the impersonated user's session; useSession()/useUser() then update reactively
      adoptRefreshJwt(refreshJwt);
      await sdk.refresh(refreshJwt);
    },
    stopImpersonation: async () => {
      const { refreshJwt } = await apiPost("/api/family/impersonate/stop", {
        refreshJwt: getRefreshToken(),
      });
      // adopt the acting user's restored session
      adoptRefreshJwt(refreshJwt);
      await sdk.refresh(refreshJwt);
    },
  };
}

export type SessionClaims = {
  sub?: string;
  exp?: number;
  dcf?: string; // selected family
  families?: Record<string, { roles?: string[]; permissions?: string[] }>;
  act?: { sub?: string; [k: string]: unknown }; // actor (present while impersonating) - onetimeservice's
  // session generator wraps the impersonator's user id as {sub: "<actorUserId>"} (RFC 8693 "act" claim)
  [k: string]: unknown;
};

export function decodeClaims(jwt: string | undefined): SessionClaims | null {
  const payload = jwt?.split(".")[1];
  if (!payload) return null;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json = decodeURIComponent(
      atob(b64 + pad)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as SessionClaims;
  } catch {
    return null;
  }
}
