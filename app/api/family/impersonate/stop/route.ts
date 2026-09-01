import { session } from "@descope/nextjs-sdk/server";
import { mgmtFamilyCall } from "../../../../lib/mgmtFamily";

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
  try {
    const data = await mgmtFamilyCall("/v1/mgmt/family/impersonate/stop", { jwt: refreshJwt });
    return Response.json({ refreshJwt: data.jwt });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
