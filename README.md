# Family Health Demo

Next.js demo app for exercising [Descope](https://www.descope.com) family account management
(family listing + impersonation) in a family-health-scheduling scenario. Backend is structured the same
way as [descope-sample-apps/family-account-demo](https://github.com/descope-sample-apps/family-account-demo).

## Features

- Schedule a doctor's appointment for yourself; see upcoming appointments on the main screen
- Profile button (picture + name) opens a panel listing every member of your family
- Click a family member to impersonate them - the main screen then shows (and lets you book)
  *their* appointments
- Edit button next to every family member's name to edit their name / picture / address

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- [`@descope/nextjs-sdk`](https://www.npmjs.com/package/@descope/nextjs-sdk) for auth (client components +
  server session + management SDK)

## What's real vs. mocked

| Area | Backing |
|---|---|
| Sign-in, session | Real - `@descope/nextjs-sdk`, same as the reference app |
| Family member list (`/api/family`) | Real - Descope Management API user search, same as the reference app |
| Impersonation (`/api/family/impersonate`, `/api/family/impersonate/stop`) | Real - Descope Management API, same as the reference app |
| Appointments (`/api/appointments`) | **Mocked** - in-memory store, `app/lib/mockStore.ts`. No real appointments backend exists yet |
| Profile edits: name/picture/address (`/api/profile`) | **Mocked** - in-memory store, overlaid onto the real family list. Doesn't touch the real Descope user record |

The mocked pieces are isolated behind `app/lib/appointmentsApi.ts` / `app/lib/profileApi.ts` (client) and
`app/api/appointments/`, `app/api/profile/` (server) - swap those for real calls once there's a concrete
API to point at.

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
   DESCOPE_MANAGEMENT_KEY=<management key, used server-side by /api/family and /api/family/impersonate*>
   ```

   Family accounts must be enabled on the Descope project, with at least one family and a couple of
   members, for `/api/family` to return anything.

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
- `app/components/FamilyPanel.tsx` fetches `/api/family` (real Management API call) and renders every
  member; clicking a member (other than yourself) calls `familyApi(sdk).impersonate(...)`, which hits
  `/api/family/impersonate` and adopts the returned refresh JWT via `sdk.refresh()`
- `app/components/EditProfileModal.tsx` posts to `/api/profile` (mocked) to edit name/picture/address
- `app/components/AppointmentsSection.tsx` fetches `/api/appointments` (mocked), scoped to whichever user
  the *current session* belongs to - so it automatically reflects the impersonated user while
  impersonating, with no extra plumbing
- `app/components/ScheduleAppointmentModal.tsx` posts a new appointment to `/api/appointments` (mocked)

## Notes

- The family fields (`userFamilies`, `dependent`) are typed locally in the API route because the SDK's
  `UserResponse` type doesn't include them yet
- User search is capped at a single page of 1000 users - fine for a demo tenant
- The mock store (`app/lib/mockStore.ts`) lives in server process memory - it resets on restart / hot
  reload. Fine for a demo, not for anything you need to survive a deploy
