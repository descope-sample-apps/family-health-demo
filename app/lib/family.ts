// Impersonation re-mints a session for a different user, so the route returns the refresh JWT and we
// adopt it client-side via sdk.refresh(). Same mechanism as descope-sample-apps/family-account-demo.
// stopImpersonation doesn't need to send a refresh token itself - it lives in an HttpOnly cookie the
// server route reads directly (see app/api/family/impersonate/stop/route.ts); client JS can't read it.
type HttpClientConfig = { token?: string };
type Sdk = {
  httpClient: {
    post: (path: string, body?: unknown, config?: HttpClientConfig) => Promise<Response>;
  };
  refresh: (token?: string) => Promise<unknown>;
};

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
    impersonate: async (dependentLoginId: string) => {
      const { refreshJwt } = await apiPost("/api/family/impersonate", { dependentLoginId });
      // adopt the impersonated user's session; useSession()/useUser() then update reactively
      await sdk.refresh(refreshJwt);
    },
    stopImpersonation: async () => {
      const { refreshJwt } = await apiPost("/api/family/impersonate/stop", {});
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
  act?: Record<string, unknown>; // actor (present while impersonating)
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
