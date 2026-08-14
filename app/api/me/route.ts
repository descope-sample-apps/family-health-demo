import { session, createSdk } from "@descope/nextjs-sdk/server";

// Real Management API lookup for whoever the CURRENT session actually is - the impersonated family
// member, while impersonating. @descope/react-sdk's useUser() only fetches once per mount and never
// reactively refetches after sdk.refresh() swaps the session (it skips fetching whenever a user object
// is already cached), so the client can't rely on it to reflect an identity switch. The session token's
// `sub` claim DOES update reactively (useSession() picks it up immediately), so the client re-derives
// "who am I" by calling this route keyed off that claim - see app/components/AuthGate.tsx.
export async function GET() {
  const current = await session();
  if (!current?.token.sub) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const sdk = createSdk();
  const res = await sdk.management.user.search({ userIds: [current.token.sub], limit: 1 });
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
  });
}
