import { session } from "@descope/nextjs-sdk/server";
import { mgmtFamilyCall } from "../../../lib/mgmtFamily";

// Impersonate a family member via the Management API. The impersonator is the current session's user;
// the backend verifies they hold the family impersonate permission for the target's family. Returns the
// refresh JWT for the client to adopt via sdk.refresh().
export async function POST(req: Request) {
  const current = await session();
  if (!current) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { dependentLoginId } = (await req.json().catch(() => ({}))) as {
    dependentLoginId?: string;
  };
  try {
    const data = await mgmtFamilyCall("/v1/mgmt/family/impersonate", {
      impersonatorUserIdOrLoginId: current.token.sub,
      dependentLoginId,
    });
    return Response.json({ refreshJwt: data.jwt });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
