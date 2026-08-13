import { session, createSdk } from "@descope/nextjs-sdk/server";

// Real Management API calls throughout. name/picture/phone are long-standing, general-purpose
// user-update endpoints (not family-specific) - not in the reference app since it never had an edit
// feature. parentType is a family-scoped custom attribute (attribute definition created directly on
// the Descope project), set via PatchUser's familyAssociations - see descope/backend#2161.
//
// `userId` is caller-supplied (not derived from the session) because this is invoked from the family
// list to edit ANY member's details, not just the caller's own - same trust boundary as the real
// impersonate route, which also lets the caller name a target family member.
const MGMT_KEY = process.env.DESCOPE_MANAGEMENT_KEY!;

type UserFamilyEntry = {
  familyId: string;
  roleNames?: string[];
  familyScopedAttributes?: Record<string, unknown>;
};
type UserWithFamilies = { userId: string; userFamilies?: UserFamilyEntry[] };

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
    familyId?: string; // which family parentType applies to (a member can be in more than one)
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
      if (!body.familyId) {
        throw new Error("familyId is required to update parentType");
      }

      // PatchUser's familyAssociations replaces the user's FULL family list, and - per family entry -
      // fully replaces roleNames too (only familyScopedAttributes has preserve-if-not-mentioned
      // semantics; see descope/backend#2161's applyFamilyChanges). So every family the member belongs
      // to, and that family's current roleNames, must be resent unchanged, or we'd silently drop them
      // from other families / strip their family roles just by editing one attribute. Fetch fresh
      // rather than trusting client-sent data, since it's driving a destructive-if-wrong write.
      const lookup = await sdk.management.user.search({ userIds: [body.userId], limit: 1 });
      if (!lookup.ok) throw new Error(lookup.error?.errorMessage || "Failed to load user");
      const target = ((lookup.data?.users ?? []) as UserWithFamilies[])[0];
      const currentFamilies = target?.userFamilies ?? [];

      const familyAssociations = currentFamilies.map((f) => ({
        familyId: f.familyId,
        roleNames: f.roleNames ?? [],
        // Omit familyScopedAttributes entirely for families we're not touching, so their attributes
        // are preserved server-side rather than overwritten with what we happen to have on hand here.
        ...(f.familyId === body.familyId
          ? {
              familyScopedAttributes: { ...(f.familyScopedAttributes ?? {}), parentType: body.parentType },
            }
          : {}),
      }));
      if (!familyAssociations.some((f) => f.familyId === body.familyId)) {
        // Defensive: shouldn't happen from the UI (you can only edit a member from within a family
        // they're already in), but don't silently no-op if it does.
        throw new Error(`User is not a member of family ${body.familyId}`);
      }

      // `token` is the raw key only - see app/lib/mgmtFamily.ts for why (the SDK already prepends
      // the project ID; doing it again here misroutes the request past the ReBAC permission check).
      const res = await sdk.httpClient.patch(
        "/v1/mgmt/user/patch",
        { loginId: body.userId, familyAssociations },
        { token: MGMT_KEY }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = data as { errorMessage?: string; message?: string };
        throw new Error(err?.errorMessage || err?.message || `HTTP ${res.status}`);
      }
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
