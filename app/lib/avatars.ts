// Default profile pictures, one per kind of family member. A member's real `picture` from Descope
// always wins when it's set; these are the fallback so every row still shows a sensible face for a
// project whose users don't have picture URLs configured (which is the norm for dependents, since
// they're shadow profiles created without one).
const DEFAULT_CHILD_AVATAR = "/avatars/child-profile.png";
const DEFAULT_USER_AVATAR = "/avatars/user-profile.png";

export function resolveAvatar(picture?: string, isChild?: boolean): string {
  if (picture) return picture;
  return isChild ? DEFAULT_CHILD_AVATAR : DEFAULT_USER_AVATAR;
}
