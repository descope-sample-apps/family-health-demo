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
      await sdk.refresh(refreshJwt);
    },
    stopImpersonation: async () => {
      const { refreshJwt } = await apiPost("/api/family/impersonate/stop", {
        refreshJwt: getRefreshToken(),
      });
      // adopt the acting user's restored session
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
