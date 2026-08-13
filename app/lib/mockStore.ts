import type { Appointment } from "./types";

// --- MOCK DATA LAYER -------------------------------------------------------
// Appointments have no Descope API of their own, so they're backed by this in-memory store instead of
// a real database. Swap these functions for real backend calls once the app has a concrete API to call
// - the route handlers in app/api/appointments are the only place that needs to change.
//
// Caveat: this state lives in the Next.js server process, so it resets on server restart / hot reload.
// That's fine for a demo; don't rely on it surviving a deploy.

const appointmentsByUser = new Map<string, Appointment[]>();

let nextId = 1;
function newId() {
  return `apt_${nextId++}`;
}

// Two seed sets so a demo with e.g. one adult and one child family member shows different-looking
// appointments for each, rather than everyone getting the exact same two doctors.
const MOCK_DOCTORS_BASIC = [
  { doctorName: "Dr. Raj Patel", specialty: "General Practice", location: "Downtown Medical Center" },
  { doctorName: "Dr. Sarah Kim", specialty: "Dermatology", location: "Riverside Clinic, Room 2" },
];
const MOCK_DOCTORS_KIDS = [
  { doctorName: "Dr. Emily Carter", specialty: "Pediatrics", location: "Riverside Clinic, Room 4" },
  { doctorName: "Dr. Maya Chen", specialty: "Pediatric Dentistry", location: "Sunshine Kids Dental" },
];

// Seed a couple of upcoming mock appointments the first time we see a user, so the main screen has
// something to show before anyone has booked anything for real. `isChild` picks which doctor set -
// callers pass the real user's `dependent` flag (see app/api/appointments/route.ts).
function seedIfEmpty(userId: string, isChild: boolean) {
  if (appointmentsByUser.has(userId)) return;
  const now = Date.now();
  const doctors = isChild ? MOCK_DOCTORS_KIDS : MOCK_DOCTORS_BASIC;
  const seeded: Appointment[] = doctors.map((doc, i) => ({
    id: newId(),
    userId,
    ...doc,
    dateTime: new Date(now + (i + 1) * 5 * 24 * 60 * 60 * 1000).toISOString(), // +5d, +10d
  }));
  appointmentsByUser.set(userId, seeded);
}

export function listAppointments(userId: string, isChild: boolean): Appointment[] {
  seedIfEmpty(userId, isChild);
  return [...(appointmentsByUser.get(userId) ?? [])].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );
}

export type CreateAppointmentInput = {
  doctorName: string;
  specialty: string;
  dateTime: string;
  location: string;
  notes?: string;
};

export function createAppointment(
  userId: string,
  input: CreateAppointmentInput,
  isChild: boolean
): Appointment {
  seedIfEmpty(userId, isChild);
  const appt: Appointment = { id: newId(), userId, ...input };
  const list = appointmentsByUser.get(userId) ?? [];
  list.push(appt);
  appointmentsByUser.set(userId, list);
  return appt;
}
