// Shared shapes between server route handlers and client components.

// A member's per-family membership - roleNames and family-scoped custom attributes are specific to a
// given family, not the user overall, since the same user can belong to more than one.
export type MemberFamily = {
  familyId: string;
  roleNames: string[];
  // Whatever family-scoped custom attributes the project defines, as name -> display value. The app
  // deliberately doesn't know any attribute names up front: it renders whatever comes back, so it
  // works against any project's schema.
  familyScopedAttributes: Record<string, string>;
};

export type FamilyMember = {
  userId: string;
  loginId?: string;
  loginIds: string[];
  name?: string;
  email?: string;
  phone?: string;
  picture?: string;
  dependent?: boolean;
  familyIds: string[];
  userFamilies: MemberFamily[];
};

export type Family = {
  familyId: string;
  name: string;
};

export type Appointment = {
  id: string;
  userId: string; // whose appointment this is
  doctorName: string;
  specialty: string;
  dateTime: string; // ISO 8601
  location: string;
  notes?: string;
};
