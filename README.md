# Tournament Manager

A web app for running chess tournaments: Swiss, round robin, knockout and team events, with result entry, live standings for players and spectators, and FIDE-ready exports.

Stack: Next.js (App Router, TypeScript), Tailwind CSS, Postgres with Drizzle ORM, Better Auth for logins, next-intl for English, Italian and Spanish. Hosted on Vercel, with the database from Vercel's Neon Postgres integration.

## Running locally

1. Install Node 22 and Postgres 16 (or use any Postgres URL).
2. `cp .env.example .env.local` and fill in `DATABASE_URL` and `BETTER_AUTH_SECRET` (`openssl rand -base64 32`).
3. `npm install`
4. `npm run db:migrate` to create the tables.
5. `npm run dev` and open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |

## Layout

- `src/db` – Drizzle schema (tournaments, players, auth tables) and client
- `src/lib` – domain logic: tiebreaks, validation, spreadsheet import, duplicate flags
- `src/app` – pages and server actions (`/dashboard` is the organizer area)
- `messages` – translations (`en`, `it`, `es`); keep the three files in sync
