import type { FamilyMember } from "./types";

// Talks to this app's own /api/profile route, which makes REAL Management API calls
// (updateDisplayName / updatePhone) - see app/api/profile/route.ts.

export type UpdateProfileInput = {
  userId: string;
  name?: string;
  phone?: string;
  familyId?: string; // which family the attributes below apply to
  familyScopedAttributes?: Record<string, string>;
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
