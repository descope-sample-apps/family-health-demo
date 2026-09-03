# Family Health Demo

Next.js demo app for exercising [Descope](https://www.descope.com) family account management
(family listing, family selection, and impersonation) in a family-health-scheduling scenario. The
Descope integration is structured the same way as
[descope-sample-apps/family-account-demo](https://github.com/descope-sample-apps/family-account-demo).

## Features

- Schedule a doctor's appointment for yourself; see upcoming appointments on the main screen
- Profile button (picture + name) opens a panel listing every member of your family, with a family
  selector at the top (by name) if you belong to more than one
- Click a family member to impersonate them - the main screen then shows (and lets you book)
  *their* appointments. Click your own row to stop impersonating
- Edit button next to every family member's name to edit their name / phone / parent type

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- [`@descope/nextjs-sdk`](https://www.npmjs.com/package/@descope/nextjs-sdk) for auth (client components +
  server session + management SDK)

## What's real vs. mocked

Everything Descope-related is a real API call. Only the appointments domain - which has no Descope
API - is mocked.

| Area | Backing |
|---|---|
| Sign-in, session | Real - `@descope/nextjs-sdk` |
| Current user (`/api/me`) | Real - Management API user search, keyed off the session token's `sub` claim |
| Family member list (`/api/family`) | Real - Management API user search with the `familyIds` filter |
| Family selector names (`/api/family`) | Real - `SearchFamilies` (`POST /v1/mgmt/family/search`). No typed SDK method yet, so it goes through `mgmtFamilyCall`/`httpClient.post` |
| Select family (`dcf` claim) | Real - `POST /v1/auth/family/select`, session-token authed via the SDK's `httpClient` |
| Impersonation (`/api/family/impersonate`, `.../stop`) | Real - Management API. `selectedFamily` is passed through so the impersonated session carries a `dcf` claim |
| Profile edits: name / phone (`/api/profile`) | Real - `UpdateUserDisplayName` / `UpdateUserPhone` |
| Profile edit: parentType (`/api/profile`) | Real - a family-scoped custom attribute, set via `PatchUser`'s `familyAssociations`. No typed SDK method yet, so it's a raw `httpClient.patch("/v1/mgmt/user/patch", ...)`. See that route's comment for why it must round-trip the member's *other* families and their roleNames - `familyAssociations` replaces the full family list, and roleNames have no preserve-if-omitted semantics (only `familyScopedAttributes` does) |
| Appointments (`/api/appointments`) | **Mocked** - in-memory store, `app/lib/mockStore.ts`. No real appointments backend exists |

The mocked appointments are isolated behind `app/lib/appointmentsApi.ts` (client) and
`app/api/appointments/` (server) - swap those for real calls once there's a concrete API to point at.

## Descope project requirements

- Family accounts enabled, with at least one family and a couple of members (including a dependent,
  so impersonation has a valid target - only dependents can be impersonated)
- The member doing the impersonating needs the family-scoped **Family Impersonate Dependents**
  permission in that family
- A family-scoped custom attribute named `parentType` for that field to be settable/visible
- A management key (used server-side only) with permission to read users and families

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your project ID and management key:

   ```bash
   cp .env.example .env.local
   ```

   `NEXT_PUBLIC_DESCOPE_BASE_URL` should be left unset - the SDK then targets Descope's production
   API and flow CDN. Only set it to point at a non-default Descope environment.

3. Run the dev server

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Deploying

The app is a standard Next.js App Router project with no special build steps - `npm run build` then
`npm run start`, or deploy straight to Vercel.

Set the same two required env vars in your host's environment (`NEXT_PUBLIC_DESCOPE_PROJECT_ID`,
`DESCOPE_MANAGEMENT_KEY`). The management key is read server-side only and is never exposed to the
browser - keep it out of any `NEXT_PUBLIC_*` variable.

Two things to know before putting this in front of anyone:

- **Appointments won't persist.** `app/lib/mockStore.ts` is process memory, so on a serverless host
  each instance has its own copy and every cold start wipes it. Fine for a demo, not for real use.
- **Session cookies** are marked `Secure` automatically outside development (see `app/layout.tsx`),
  so the deployed app must be served over HTTPS - which Vercel and most hosts do by default.

## How it works

- `app/layout.tsx` wraps the app in Descope's `AuthProvider`, with session and refresh tokens
  delivered via cookie so server route handlers can read them
- `app/components/AuthGate.tsx` renders the Descope sign-in flow when unauthenticated. Once signed
  in it derives the current identity from the session token's `sub` claim and fetches `/api/me` -
  deliberately *not* `useUser()`, which caches its first fetch and never refetches after
  `sdk.refresh()` swaps sessions, so it would go stale the moment you impersonate
- `app/components/ProfileButton.tsx` shows the current user's avatar/name and opens `FamilyPanel`
- `app/components/FamilyPanel.tsx` fetches `/api/family` and renders every member of the selected
  family. Clicking another member calls `familyApi(sdk).impersonate(...)`, which hits
  `/api/family/impersonate` and adopts the returned refresh JWT via `sdk.refresh()`; clicking your
  own row stops impersonating. Switching the family dropdown calls the real `SelectFamily` endpoint
  when you're not impersonating
- `app/components/EditProfileModal.tsx` posts to `/api/profile` to edit name/phone/parentType
  (parentType is scoped to whichever family is currently selected)
- `app/components/AppointmentsSection.tsx` fetches `/api/appointments`, scoped to whichever user the
  *current session* belongs to - so it automatically reflects the impersonated user, no extra plumbing
- `app/lib/avatars.ts` falls back to a generic child or adult avatar when a member has no `picture`
  set in Descope

## Notes

- Family fields (`userFamilies`, `dependent`, `familyScopedAttributes`) are typed locally in the API
  routes because the SDK's `UserResponse` type doesn't include them yet
- User search is capped at a single page of 1000 users - fine for a demo tenant
- `app/components/JwtDebugPanel.tsx` prints the live session and refresh JWTs at the bottom of the
  screen. It is gated to `NODE_ENV === "development"` and never renders in a production build
