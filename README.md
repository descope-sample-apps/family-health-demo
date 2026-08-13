# Family Health Demo

Next.js demo app for exercising [Descope](https://www.descope.com) family account management
(family listing + impersonation) in a family-health-scheduling scenario. Backend is structured the same
way as [descope-sample-apps/family-account-demo](https://github.com/descope-sample-apps/family-account-demo).

## Features

- Schedule a doctor's appointment for yourself; see upcoming appointments on the main screen
- Profile button (picture + name) opens a panel listing every member of your family, with a family
  selector at the top (by name) if you belong to more than one
- Click a family member to impersonate them - the main screen then shows (and lets you book)
  *their* appointments
- Edit button next to every family member's name to edit their name / picture / phone / parent type

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- [`@descope/nextjs-sdk`](https://www.npmjs.com/package/@descope/nextjs-sdk) for auth (client components +
  server session + management SDK)

## What's real vs. mocked

| Area | Backing |
|---|---|
| Sign-in, session | Real - `@descope/nextjs-sdk`, same as the reference app |
| Family member list (`/api/family`) | Real - Descope Management API user search, same as the reference app |
| Family selector (names) | Real - `SearchFamilies` (`POST /v1/mgmt/family/search`), not in the reference app - no typed SDK method yet, called via `mgmtFamilyCall`/`httpClient.post` the same way `/api/family/impersonate*` are |
| Impersonation (`/api/family/impersonate`, `/api/family/impersonate/stop`) | Real - Descope Management API, same as the reference app |
| Profile edits: name/picture/phone (`/api/profile`) | Real - `UpdateUserDisplayName` / `UpdateUserPicture` / `UpdateUserPhone`. General-purpose user-update endpoints, not family-specific, but not in the reference app since it never had an edit feature |
| Profile edit: parentType (`/api/profile`) | Real - a genuine family-scoped custom attribute (defined directly on the Descope project), set via `PatchUser`'s `familyAssociations` per [descope/backend#2161](https://github.com/descope/backend/pull/2161). No typed SDK method yet, so this is a raw `httpClient.patch("/v1/mgmt/user/patch", ...)` call. See the comment in `app/api/profile/route.ts` for why it has to round-trip the member's *other* families and roleNames too - `familyAssociations` replaces the full family list, and roleNames have no preserve-if-omitted semantics (only familyScopedAttributes does) |
| Appointments (`/api/appointments`) | **Mocked** - in-memory store, `app/lib/mockStore.ts`. No real appointments backend exists |

The mocked appointments are isolated behind `app/lib/appointmentsApi.ts` (client) and
`app/api/appointments/` (server) - swap those for real calls once there's a concrete API to point at.

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Create `.env.local` (see `.env.example`)

   ```bash
   NEXT_PUBLIC_DESCOPE_PROJECT_ID=<your Descope project ID>
   NEXT_PUBLIC_DESCOPE_FLOW_ID=sign-up-or-in
   NEXT_PUBLIC_DESCOPE_BASE_URL=<optional, custom Descope base URL>
   DESCOPE_MANAGEMENT_KEY=<management key, used server-side by /api/family, /api/family/impersonate*, and /api/profile>
   ```

   Family accounts must be enabled on the Descope project, with at least one family and a couple of
   members, for `/api/family` to return anything. The `parentType` custom attribute must be defined as
   family-scoped on the project for it to be settable/visible (requires descope/backend#2161).

3. Run the dev server

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## How it works

- `app/layout.tsx` wraps the app in Descope's `AuthProvider` with the session token delivered via cookie
- `app/components/AuthGate.tsx` renders the Descope sign-in flow when unauthenticated, and the header +
  appointments section once signed in
- `app/components/ProfileButton.tsx` shows the current user's avatar/name and opens `FamilyPanel`
- `app/components/FamilyPanel.tsx` fetches `/api/family` (real Management API calls) and renders every
  member for whichever family is selected; clicking a member (other than yourself) calls
  `familyApi(sdk).impersonate(...)`, which hits `/api/family/impersonate` and adopts the returned refresh
  JWT via `sdk.refresh()`
- `app/components/EditProfileModal.tsx` posts to `/api/profile` (real Management API calls) to edit
  name/picture/phone/parentType (parentType is scoped to whichever family is currently selected)
- `app/components/AppointmentsSection.tsx` fetches `/api/appointments` (mocked), scoped to whichever user
  the *current session* belongs to - so it automatically reflects the impersonated user while
  impersonating, with no extra plumbing
- `app/components/ScheduleAppointmentModal.tsx` posts a new appointment to `/api/appointments` (mocked)

## Notes

- The family fields (`userFamilies`, `dependent`, `familyScopedAttributes`) are typed locally in the API
  routes because the SDK's `UserResponse` type doesn't include them yet
- User search is capped at a single page of 1000 users - fine for a demo tenant
- The mock store (`app/lib/mockStore.ts`) lives in server process memory - it resets on restart / hot
  reload. Fine for a demo, not for anything you need to survive a deploy
