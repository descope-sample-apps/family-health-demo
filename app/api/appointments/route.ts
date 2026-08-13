import { session, createSdk } from "@descope/nextjs-sdk/server";
import { createAppointment, listAppointments } from "../../lib/mockStore";

// MOCK - no real appointments backend yet, backed by an in-memory store (app/lib/mockStore.ts).
// Scoped to the CURRENT session's user, so while impersonating a family member this naturally lists /
// books appointments for the impersonated user, same as the real Descope-backed routes under
// app/api/family. Swap the mockStore calls below for real ones once there's a concrete API to call.
//
// The one real touchpoint: a quick user lookup to check the real `dependent` flag, so a child gets a
// different (pediatric) mock doctor set than an adult - see app/lib/mockStore.ts. This is still all
// mocked appointment DATA; the lookup just picks which demo persona bucket applies.
async function isChildUser(userId: string): Promise<boolean> {
  try {
    const sdk = createSdk();
    const res = await sdk.management.user.search({ userIds: [userId], limit: 1 });
    if (!res.ok) return false;
    const user = (res.data?.users ?? [])[0] as { dependent?: boolean } | undefined;
    return Boolean(user?.dependent);
  } catch (e) {
    console.error("[api/appointments] dependent lookup failed, defaulting to adult mock set:", e);
    return false;
  }
}

export async function GET() {
  const current = await session();
  if (!current?.token.sub) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const isChild = await isChildUser(current.token.sub);
  const appointments = listAppointments(current.token.sub, isChild);
  return Response.json({ appointments });
}

export async function POST(req: Request) {
  const current = await session();
  if (!current?.token.sub) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    doctorName?: string;
    specialty?: string;
    dateTime?: string;
    location?: string;
    notes?: string;
  };
  if (!body.doctorName || !body.dateTime) {
    return Response.json({ error: "doctorName and dateTime are required" }, { status: 400 });
  }
  const isChild = await isChildUser(current.token.sub);
  const appointment = createAppointment(
    current.token.sub,
    {
      doctorName: body.doctorName,
      specialty: body.specialty || "General",
      dateTime: body.dateTime,
      location: body.location || "TBD",
      notes: body.notes,
    },
    isChild
  );
  return Response.json({ appointment });
}
