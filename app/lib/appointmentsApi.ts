import type { Appointment } from "./types";

// MOCK: talks to this app's own /api/appointments route, which is backed by an in-memory store
// (see app/lib/mockStore.ts). No real backend yet - swap the fetch targets below once one exists.

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { error?: string };
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function listAppointments(): Promise<Appointment[]> {
  const res = await fetch("/api/appointments");
  const data = await handle<{ appointments: Appointment[] }>(res);
  return data.appointments;
}

export type CreateAppointmentInput = {
  doctorName: string;
  specialty: string;
  dateTime: string;
  location: string;
  notes?: string;
};

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const res = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await handle<{ appointment: Appointment }>(res);
  return data.appointment;
}
