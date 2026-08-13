"use client";

import { useEffect, useState } from "react";
import { listAppointments } from "../lib/appointmentsApi";
import ScheduleAppointmentModal from "./ScheduleAppointmentModal";
import type { Appointment } from "../lib/types";

const btn =
  "rounded-full border border-black/[.08] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]";

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// `subject` is the current session's user id - pass it in so this section refetches whenever
// impersonation starts/stops and the "current user" changes.
export default function AppointmentsSection({ subject }: { subject?: string }) {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listAppointments();
        if (alive) setAppointments(data);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [subject, reloadKey]);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-black dark:text-zinc-50">
          Upcoming appointments
        </h2>
        <button className={btn} onClick={() => setScheduling(true)}>
          Schedule
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {appointments === null && !error && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading appointments...</p>
      )}

      {appointments !== null && appointments.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No upcoming appointments.</p>
      )}

      {appointments !== null && appointments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {appointments.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-0.5 rounded-md bg-zinc-50 px-3 py-2 dark:bg-white/[.04]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  {a.doctorName}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatWhen(a.dateTime)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {a.specialty} &middot; {a.location}
              </p>
              {a.notes && <p className="text-xs text-zinc-400 dark:text-zinc-500">{a.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {scheduling && (
        <ScheduleAppointmentModal
          onClose={() => setScheduling(false)}
          onScheduled={() => {
            setScheduling(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
