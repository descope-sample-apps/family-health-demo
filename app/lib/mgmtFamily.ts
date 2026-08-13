import { createSdk } from "@descope/nextjs-sdk/server";

// Server-only helper: calls the Descope Management family endpoints through the server SDK's httpClient,
// authed with the management key. Family listing and impersonation are real Descope Management API
// calls (same pattern as descope-sample-apps/family-account-demo) - this is the piece the app actually
// exists to exercise, so it is NOT mocked.
//
// Bearer token is `projectId::managementKey` (double colon), NOT `projectId:managementKey`. The
// server's Authorization parser (common/pkg/common/http/middlewares/projectidhandler.go,
// ParseAuthorizationHeader) treats a bare `projectId:secret` as a JWT whenever the secret contains a
// "." - which access-key cleartext legitimately can. That misroutes the request into JWT/inbound-token
// validation instead of the management-key ReBAC permission check, failing with "no scoped
// permissions" regardless of the key's actual role. `projectId:JWT:accessKey` with an empty JWT segment
// is the parser's documented third format and skips the dot-sniffing heuristic entirely.
const PROJECT = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!;
const MGMT_KEY = process.env.DESCOPE_MANAGEMENT_KEY!;

export async function mgmtFamilyCall(path: string, body: Record<string, unknown>) {
  const sdk = createSdk();
  const res = await sdk.httpClient.post(path, body, { token: `${PROJECT}::${MGMT_KEY}` });
  const data = (await res.json().catch(() => ({}))) as {
    errorMessage?: string;
    message?: string;
    [k: string]: unknown;
  };
  if (!res.ok) {
    console.error(`[mgmt-family] POST ${path} failed`, { status: res.status, body: data });
    throw new Error(data?.errorMessage || data?.message || `HTTP ${res.status}`);
  }
  return data;
}
