import { session, createSdk } from "@descope/nextjs-sdk/server";
import { mgmtFamilyCall } from "../../lib/mgmtFamily";

// The family fields this route reads off a user record.
type UserWithFamilies = {
  userId: string;
  loginIds?: string[];
  name?: string;
  email?: string;
  phone?: string;
  picture?: string;
  dependent?: boolean;
  userFamilies?: {
    familyId: string;
    roleNames?: string[];
    permissions?: string[];
    familyScopedAttributes?: Record<string, unknown>;
  }[];
  families?: string[];
};

// Family-scoped custom attribute values can be any JSON type the project's schema allows, so flatten
// them to strings for display. Objects/arrays are JSON-stringified rather than dropped, so an
// unexpected attribute type still shows something instead of silently vanishing.
function toDisplayAttributes(attrs?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === "") continue;
    out[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
  }
  return out;
}

export async function GET() {
  try {
    const currentSession = await session();
    if (!currentSession) {
      console.warn("[api/family] no session - request is unauthenticated");
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    const sub = currentSession.token.sub;
    if (!sub) {
      return Response.json({ error: "Session has no subject" }, { status: 401 });
    }

    const sdk = createSdk();

    // 1) Look up just the caller (targeted userId search, not a full-project scan) to learn which
    //    families they belong to - drives the family search below.
    const meRes = await sdk.management.user.search({
      userIds: [sub],
      limit: 1,
    });
    if (!meRes.ok) {
      console.error("[api/family] caller lookup failed:", meRes.error);
      return Response.json(
        { error: meRes.error?.errorMessage || "Failed to load user" },
        { status: 502 }
      );
    }
    const me = ((meRes.data?.users ?? []) as UserWithFamilies[])[0];
    const myUserFamilies = me?.userFamilies ?? [];
    const myFamilyIds = myUserFamilies.map((f) => f.familyId);

    // Not in any family -> nothing to search. (An empty familyIds filter would match ALL users.)
    if (myFamilyIds.length === 0) {
      return Response.json({ members: [], families: [] });
    }

    // Drives the family selector - every family the caller belongs to, so they can switch between
    // them, shown by name rather than the raw ID. SearchFamilies needs its own scoped permission on
    // the management key (distinct from the user-search/impersonate calls above) - fall back to
    // showing the ID rather than 500ing the whole page if that permission hasn't been granted yet.
    let families = myFamilyIds.map((id) => ({ familyId: id, name: id }));
    try {
      const familiesRes = (await mgmtFamilyCall("/v1/mgmt/family/search", {
        familyIds: myFamilyIds,
      })) as { families?: { id: string; name: string }[] };
      if (familiesRes.families?.length) {
        families = familiesRes.families.map((f) => ({ familyId: f.id, name: f.name || f.id }));
      }
    } catch (e) {
      console.error(
        "[api/family] family search failed, falling back to raw family IDs - check the management key has the family-read permission scope:",
        e
      );
    }

    // 2) Search all users across the caller's families in one shot, using the search API's familyIds
    //    filter - server-side, instead of pulling every project user and filtering here. The cast
    //    below widens the request to carry familyIds.
    // Single page, limit 1000 - fine for a demo project's family size.
    const searchReq = { familyIds: myFamilyIds, limit: 1000 } as unknown as Parameters<
      typeof sdk.management.user.search
    >[0];
    const res = await sdk.management.user.search(searchReq);
    if (!res.ok) {
      console.error("[api/family] family search failed:", res.error);
      return Response.json(
        { error: res.error?.errorMessage || "Failed to load family" },
        { status: 502 }
      );
    }
    const users = (res.data?.users ?? []) as UserWithFamilies[];

    // name/picture/phone come straight off the real Descope user record - edits in app/api/profile
    // write through to the same record via the Management API, so no overlay is needed here.
    // Family-scoped custom attributes are per-family, so they live on userFamilies rather than as flat
    // fields - the same member can have different values in each family.
    const members = users.map((u) => ({
      userId: u.userId,
      loginId: u.loginIds?.[0],
      loginIds: u.loginIds ?? [],
      name: u.name,
      email: u.email,
      phone: u.phone,
      picture: u.picture,
      dependent: u.dependent,
      familyIds: u.userFamilies?.map((f) => f.familyId) ?? u.families ?? [],
      userFamilies: (u.userFamilies ?? []).map((f) => ({
        familyId: f.familyId,
        roleNames: f.roleNames ?? [],
        familyScopedAttributes: toDisplayAttributes(f.familyScopedAttributes),
      })),
    }));

    return Response.json({ members, families });
  } catch (e) {
    console.error("[api/family] unexpected error:", e);
    return Response.json({ error: (e as Error).message || "Internal error" }, { status: 500 });
  }
}
