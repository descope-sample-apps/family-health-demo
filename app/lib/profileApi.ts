import type { FamilyMember } from "./types";

// MOCK: talks to this app's own /api/profile route, which is backed by an in-memory store
// (see app/lib/mockStore.ts) - edits don't touch the real Descope user record yet. Once you have a
// concrete call for this (e.g. a real Management API user-update + a custom attribute for address),
// swap the fetch target below.

export type UpdateProfileInput = {
  userId: string;
  name?: string;
  picture?: string;
  address?: string;
};

export async function updateProfile(input: UpdateProfileInput): Promise<Partial<FamilyMember>> {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { error?: string };
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return data as Partial<FamilyMember>;
}
