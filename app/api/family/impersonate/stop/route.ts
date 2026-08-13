import { cookies } from "next/headers";
import descopeSdk from "@descope/node-sdk";
import { session } from "@descope/nextjs-sdk/server";
import { mgmtFamilyCall } from "../../../../lib/mgmtFamily";

// Stop family impersonation via the Management API. Needs the impersonated session's REFRESH jwt (not
// the session jwt) so the backend can recover the acting user from its `act` claim. That refresh token
// lives in an HttpOnly cookie (name: descopeSdk.RefreshTokenCookieName, "DSR") - HttpOnly means client
// JS can never read it, so getRefreshToken() client-side always returns nothing usable here. Read it
// directly from the request cookie instead, server-side, where HttpOnly doesn't apply. Returns the
// acting user's refresh JWT for the client to adopt via sdk.refresh().
export async function POST() {
  const current = await session();
  if (!current) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const refreshJwt = (await cookies()).get(descopeSdk.RefreshTokenCookieName)?.value;
  if (!refreshJwt) {
    return Response.json({ error: "No refresh token found" }, { status: 400 });
  }
  try {
    const data = await mgmtFamilyCall("/v1/mgmt/family/impersonate/stop", { jwt: refreshJwt });
    return Response.json({ refreshJwt: data.jwt });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
