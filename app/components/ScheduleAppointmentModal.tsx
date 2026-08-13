"use client";

import { useState } from "react";
import { createAppointment } from "../lib/appointmentsApi";

const btn =
  "rounded-full border border-black/[.08] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]";
const input =
  "rounded-md border border-black/[.08] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/[.145] dark:focus:border-white/40";

// Defaults to 1h from now, rounded to the next 5 minutes, formatted for <input type="datetime-local">.
function defaultDateTimeLocal() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function ScheduleAppointmentModal({
  onClose,
  onScheduled,
}: {
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState(defaultDateTimeLocal());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!doctorName.trim()) {
      setError("Doctor name is required");
      return;
    }
    setError("");
    setBusy(true);
    try {
      // MOCK - see app/api/appointments/route.ts. Booked against whoever the current session is
      // (the impersonated family member, if impersonating).
      await createAppointment({
        doctorName: doctorName.trim(),
        specialty: specialty.trim() || "General",
        dateTime: new Date(dateTimeLocal).toISOString(),
        location: location.trim() || "TBD",
        notes: notes.trim() || undefined,
      });
      onScheduled();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <h3 className="text-base font-semibold text-black dark:text-zinc-50">
          Schedule appointment
        </h3>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Doctor
          <input
            className={input}
            placeholder="Dr. Jane Doe"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Specialty
          <input
            className={input}
            placeholder="Pediatrics"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Date &amp; time
          <input
            className={input}
            type="datetime-local"
            value={dateTimeLocal}
            onChange={(e) => setDateTimeLocal(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Location
          <input
            className={input}
            placeholder="Riverside Clinic"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Notes (optional)
          <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={btn} disabled={busy}>
            {busy ? "Booking..." : "Book"}
          </button>
        </div>
      </form>
    </div>
  );
}
