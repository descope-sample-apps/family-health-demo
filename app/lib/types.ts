// Shared shapes between server route handlers and client components.

export type FamilyMember = {
  userId: string;
  loginId?: string;
  loginIds: string[];
  name?: string;
  email?: string;
  phone?: string;
  picture?: string;
  parentType?: string; // family-scoped custom attribute (e.g. "Mother", "Father", "Guardian")
  dependent?: boolean;
  familyIds: string[];
};

export type Family = {
  familyId: string;
  roleNames: string[];
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
