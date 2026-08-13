import { session } from "@descope/nextjs-sdk/server";
import { setProfileOverride } from "../../lib/mockStore";

// MOCK - name/picture/address edits are held in an in-memory store (app/lib/mockStore.ts) and overlaid
// onto the real family list in app/api/family/route.ts. They do NOT touch the real Descope user record.
// `userId` is caller-supplied (not derived from the session) because this is invoked from the family
// list to edit ANY member's details, not just the caller's own - same trust boundary as the real
// impersonate route, which also lets the caller name a target family member. Once there's a concrete
// call for this (e.g. a real Management API user-update + a custom attribute for address), re-derive
// authorization the same way the impersonate route does and swap the mockStore call below.
export async function POST(req: Request) {
  const current = await session();
  if (!current) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    name?: string;
    picture?: string;
    address?: string;
  };
  if (!body.userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }
  const updated = setProfileOverride(body.userId, {
    name: body.name,
    picture: body.picture,
    address: body.address,
  });
  return Response.json({ userId: body.userId, ...updated });
}
