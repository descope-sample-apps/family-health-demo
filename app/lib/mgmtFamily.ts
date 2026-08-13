import { createSdk } from "@descope/nextjs-sdk/server";

// Server-only helper: calls the Descope Management family endpoints through the server SDK's httpClient,
// authed with the management key. Family listing and impersonation are real Descope Management API
// calls (same pattern as descope-sample-apps/family-account-demo) - this is the piece the app actually
// exists to exercise, so it is NOT mocked.
//
// `token` must be just the raw management key, NOT `projectId:managementKey`. The SDK's httpClient
// already builds `Authorization: Bearer {projectId}:{token}` from whatever `token` you pass (it
// prepends its own configured project ID) - passing the project ID again here double-prepends it,
// producing `projectId:projectId:managementKey`. The server's Authorization parser
// (common/pkg/common/http/middlewares/projectidhandler.go, ParseAuthorizationHeader) treats 3+
// colon-separated segments as `projectId:JWT:accessKey`, so our own project ID lands in the JWT slot
// and the request gets misrouted into JWT/inbound-token validation instead of the management-key
// ReBAC check - failing with "no scoped permissions" regardless of the key's actual role. Verified
// against a live server: `Bearer {pid}:{pid}:{key}` -> 401; `Bearer {pid}:{key}` -> 200.
const MGMT_KEY = process.env.DESCOPE_MANAGEMENT_KEY!;

export async function mgmtFamilyCall(path: string, body: Record<string, unknown>) {
  const sdk = createSdk();
  const res = await sdk.httpClient.post(path, body, { token: MGMT_KEY });
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
