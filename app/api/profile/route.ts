import { session, createSdk } from "@descope/nextjs-sdk/server";

// Real Management API calls (name/picture/phone are long-standing, general-purpose user-update
// endpoints - not family-specific). `createSdk()` auto-wires DESCOPE_MANAGEMENT_KEY, so these are
// authenticated the same way as the family/impersonate calls in app/api/family, just via typed SDK
// methods instead of a raw httpClient.post (those methods predate the family feature).
//
// parentType is a family-scoped custom attribute (attribute definition created directly in the
// Descope project). There's no dedicated family-scoped-attribute update endpoint for an existing user
// yet, so it's set the same way any custom attribute is: PatchUser with customAttributes.
//
// `userId` is caller-supplied (not derived from the session) because this is invoked from the family
// list to edit ANY member's details, not just the caller's own - same trust boundary as the real
// impersonate route, which also lets the caller name a target family member.
export async function POST(req: Request) {
  const current = await session();
  if (!current) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    name?: string;
    picture?: string;
    phone?: string;
    parentType?: string;
  };
  if (!body.userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  const sdk = createSdk();
  try {
    if (body.name !== undefined) {
      const res = await sdk.management.user.updateDisplayName(body.userId, body.name);
      if (!res.ok) throw new Error(res.error?.errorMessage || "Failed to update name");
    }
    if (body.picture !== undefined) {
      const res = await sdk.management.user.updatePicture(body.userId, body.picture);
      if (!res.ok) throw new Error(res.error?.errorMessage || "Failed to update picture");
    }
    if (body.phone !== undefined) {
      const res = await sdk.management.user.updatePhone(body.userId, body.phone, false);
      if (!res.ok) throw new Error(res.error?.errorMessage || "Failed to update phone");
    }
    if (body.parentType !== undefined) {
      const res = await sdk.management.user.patch(body.userId, {
        customAttributes: { parentType: body.parentType },
      });
      if (!res.ok) throw new Error(res.error?.errorMessage || "Failed to update parent type");
    }
  } catch (e) {
    console.error("[api/profile] update failed:", e);
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }

  return Response.json({
    userId: body.userId,
    name: body.name,
    picture: body.picture,
    phone: body.phone,
    parentType: body.parentType,
  });
}
