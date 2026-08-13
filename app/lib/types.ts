// Shared shapes between server route handlers and client components.

export type FamilyMember = {
  userId: string;
  loginId?: string;
  loginIds: string[];
  name?: string;
  email?: string;
  phone?: string;
  picture?: string;
  address?: string;
  dependent?: boolean;
  familyIds: string[];
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
