// Local demo profile pictures (public/avatars/), matched by the user's first name (case-insensitive).
// Lets this demo project's family members show a real face without needing a `picture` URL configured
// on every Descope user. Falls back to whatever the real `picture` field has for anyone not listed
// here, so unrecognized names still work normally.
const AVATARS_BY_FIRST_NAME: Record<string, string> = {
  avi: "/avatars/Avi.png",
  lee: "/avatars/Lee.png",
  maya: "/avatars/Maya.png",
  miri: "/avatars/Miri.png",
  noam: "/avatars/Noam.png",
};

export function resolveAvatar(name?: string, picture?: string): string | undefined {
  const firstName = name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (firstName && AVATARS_BY_FIRST_NAME[firstName]) {
    return AVATARS_BY_FIRST_NAME[firstName];
  }
  return picture;
}
