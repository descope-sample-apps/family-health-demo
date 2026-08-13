import { session, createSdk } from "@descope/nextjs-sdk/server";
import { getProfileOverride } from "../../lib/mockStore";

// @descope/node-sdk's UserResponse type hasn't been regenerated yet for the family
// feature, so userFamilies/families/dependent are missing even though the backend returns them.
type UserWithFamilies = {
  userId: string;
  loginIds?: string[];
  name?: string;
  email?: string;
  phone?: string;
  picture?: string;
  dependent?: boolean;
  userFamilies?: { familyId: string; roleNames?: string[]; permissions?: string[] }[];
  families?: string[];
};

export async function GET() {
  try {
    const currentSession = await session({
      logLevel: "debug",
    });
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
    const myFamilyIds = (me?.userFamilies ?? []).map((f) => f.familyId);

    // Not in any family -> nothing to search. (An empty familyIds filter would match ALL users.)
    if (myFamilyIds.length === 0) {
      return Response.json({ members: [] });
    }

    // 2) Search all users across the caller's families in one shot, using the search API's familyIds
    //    filter - server-side, instead of pulling every project user and filtering here. familyIds
    //    isn't in the node SDK's typed search shape yet, so widen the request.
    // ponytail: single page, limit 1000 - fine for a demo project's family size
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

    // Name/picture/address edits are mocked for now (see app/api/profile) - overlay them here so the
    // UI reflects an edit without touching the real Descope user record.
    const members = users.map((u) => {
      const override = getProfileOverride(u.userId);
      return {
        userId: u.userId,
        loginId: u.loginIds?.[0],
        loginIds: u.loginIds ?? [],
        name: override?.name ?? u.name,
        email: u.email,
        phone: u.phone,
        picture: override?.picture ?? u.picture,
        address: override?.address,
        dependent: u.dependent,
        familyIds: u.userFamilies?.map((f) => f.familyId) ?? u.families ?? [],
      };
    });

    return Response.json({ members });
  } catch (e) {
    console.error("[api/family] unexpected error:", e);
    return Response.json({ error: (e as Error).message || "Internal error" }, { status: 500 });
  }
}
