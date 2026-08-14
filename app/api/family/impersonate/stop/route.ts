import { session } from "@descope/nextjs-sdk/server";
import { mgmtFamilyCall } from "../../../../lib/mgmtFamily";
import { decodeClaims } from "../../../../lib/family";

// Stop family impersonation via the Management API. The client sends its current (impersonated) refresh
// JWT; the backend recovers the acting user from the act claim and re-mints their session. Returns the
// acting user's refresh JWT for the client to adopt via sdk.refresh(). Same mechanism as
// descope-sample-apps/family-account-demo.
export async function POST(req: Request) {
  const current = await session();
  if (!current) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { refreshJwt } = (await req.json().catch(() => ({}))) as { refreshJwt?: string };
  // TEMPORARY diagnostic - logs claim SHAPE only, never the raw token, to pin down whether the client
  // is sending the impersonated session's refresh token (has `act`) or a stale/own one (doesn't).
  // Remove once confirmed.
  const claims = decodeClaims(refreshJwt);
  console.log("[api/family/impersonate/stop] refreshJwt claims:", {
    present: Boolean(refreshJwt),
    sub: claims?.sub,
    hasAct: Boolean(claims?.act),
    act: claims?.act,
    exp: claims?.exp,
  });
  try {
    const data = await mgmtFamilyCall("/v1/mgmt/family/impersonate/stop", { jwt: refreshJwt });
    return Response.json({ refreshJwt: data.jwt });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
