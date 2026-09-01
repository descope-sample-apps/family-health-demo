import { session, createSdk } from "@descope/nextjs-sdk/server";

// Real Management API lookup for whoever the CURRENT session actually is - the impersonated family
// member, while impersonating. @descope/react-sdk's useUser() only fetches once per mount and never
// reactively refetches after sdk.refresh() swaps the session (it skips fetching whenever a user object
// is already cached), so the client can't rely on it to reflect an identity switch. The session token's
// `sub` claim DOES update reactively (useSession() picks it up immediately), so the client re-derives
// "who am I" by calling this route keyed off that claim - see app/components/AuthGate.tsx.
//
// Also accepts an optional ?userId= to look up someone ELSE by id - used to resolve the impersonating
// parent's name from the session's `act.sub` claim for the "Viewing as" banner (same trust boundary as
// /api/profile: any authenticated caller can look up any family member, not just themselves).
export async function GET(req: Request) {
  const current = await session();
  if (!current?.token.sub) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const targetUserId = new URL(req.url).searchParams.get("userId") || current.token.sub;
  const sdk = createSdk();
  const res = await sdk.management.user.search({ userIds: [targetUserId], limit: 1 });
  if (!res.ok) {
    return Response.json(
      { error: res.error?.errorMessage || "Failed to load user" },
      { status: 502 }
    );
  }
  const user = (res.data?.users ?? [])[0];
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  return Response.json({
    userId: user.userId,
    name: user.name,
    email: user.email,
    picture: user.picture,
    // drives which default avatar the client falls back to - see app/lib/avatars.ts
    dependent: (user as { dependent?: boolean }).dependent,
  });
}
