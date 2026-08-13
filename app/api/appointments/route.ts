import { session } from "@descope/nextjs-sdk/server";
import { createAppointment, listAppointments } from "../../lib/mockStore";

// MOCK - no real appointments backend yet, backed by an in-memory store (app/lib/mockStore.ts).
// Scoped to the CURRENT session's user, so while impersonating a family member this naturally lists /
// books appointments for the impersonated user, same as the real Descope-backed routes under
// app/api/family. Swap the mockStore calls below for real ones once there's a concrete API to call.

export async function GET() {
  const current = await session();
  if (!current?.token.sub) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const appointments = listAppointments(current.token.sub);
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
  const appointment = createAppointment(current.token.sub, {
    doctorName: body.doctorName,
    specialty: body.specialty || "General",
    dateTime: body.dateTime,
    location: body.location || "TBD",
    notes: body.notes,
  });
  return Response.json({ appointment });
}
