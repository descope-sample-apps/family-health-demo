import { createSdk } from "@descope/nextjs-sdk/server";

// Server-only helper: calls the Descope Management family endpoints through the server SDK's httpClient,
// authed with the management key (Bearer projectId:managementKey). Family listing and impersonation are
// real Descope Management API calls (same pattern as descope-sample-apps/family-account-demo) - this is
// the piece the app actually exists to exercise, so it is NOT mocked.
const PROJECT = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!;
const MGMT_KEY = process.env.DESCOPE_MANAGEMENT_KEY!;

export async function mgmtFamilyCall(path: string, body: Record<string, unknown>) {
  const sdk = createSdk();
  const res = await sdk.httpClient.post(path, body, { token: `${PROJECT}:${MGMT_KEY}` });
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
