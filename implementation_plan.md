# Implementation Plan: "Arthur: Guerreiro & Sonhador" Web Application

We will build a responsive full-stack Next.js (App Router) web application using the existing Turbo monorepo structure. The app will feature a playful yet elegant dashboard of memories ("Momentos"), including photo/video support, custom dynamic frames (Gold border, Polaroid, and Soccer Stars), media upload capabilities restricted to authorized users, and a secure Google Sign-in flow.

---

## User Review Required

> [!IMPORTANT]
> **Environment Variables & Secrets**: You will need to add Google OAuth credentials and a PostgreSQL connection string to your `next-monorepo/apps/web/.env.local` or root `.env.local` once approved.
> - `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://postgres:postgres@localhost:5432/arthur_db`).
> - `AUTH_SECRET`: Generate a secure secret using `openssl rand -hex 32`.
> - `AUTH_GOOGLE_ID` & `AUTH_GOOGLE_SECRET`: Google Cloud console OAuth client credentials.

---

## Proposed Changes

We will install additional dependencies in `apps/web` and configure our files in both the shared `@workspace/ui` package and the `apps/web` application.

### Dependencies
We need to install the following packages in `apps/web` (or at the monorepo root using workspace options):
- `next-auth` (v5 Beta/latest) - Authentication
- `@auth/drizzle-adapter` - NextAuth Drizzle database adapter
- `drizzle-orm` - Database ORM
- `pg` - PostgreSQL client
- `tsx` - For schema migration and database seeding (dev)
- `drizzle-kit` - Drizzle migration tool (dev)
- `@types/pg` - TypeScript types for PostgreSQL client (dev)

---

### Database Layer (PostgreSQL & Drizzle ORM)

#### [NEW] [schema.ts](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/lib/schema.ts)
Contains the table definitions for NextAuth adapter compatibility, plus the tables for custom momentos (moments) and molduras (frames).

- **`users`**: Extends the NextAuth user table.
- **`accounts`, `sessions`, `verificationTokens`**: Required NextAuth tables.
- **`frames` (Molduras)**:
  - `id`: varchar/text primary key (e.g. `'gold'`, `'polaroid'`, `'soccer'`)
  - `name`: text not null (e.g. `'Borda Dourada'`, `'Polaroid Clássica'`, `'Estrelas do Futebol'`)
  - `borderClass`: text not null (Tailwind styles/frame parameters)
- **`moments` (Momentos)**:
  - `id`: serial primary key
  - `userId`: text references `users.id`
  - `mediaUrl`: text not null
  - `type`: text not null (enum: `'image'`, `'video'`)
  - `title`: text not null
  - `date`: timestamp not null
  - `caption`: text (legenda / frase motivacional)
  - `frameId`: text references `frames.id`

#### [NEW] [db.ts](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/lib/db.ts)
Initializes the Drizzle database instance connecting to PostgreSQL using the `pg` client.

#### [NEW] [drizzle.config.ts](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/drizzle.config.ts)
Drizzle CLI config mapping to PostgreSQL and schema location.

#### [NEW] [seed.ts](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/lib/seed.ts)
Populates default frames and creates a few beautiful sample moments with generated local images so the page looks ready and visually matches the mockup.

---

### Authentication (NextAuth.js v5)

#### [NEW] [auth.ts](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/auth.ts)
Configures NextAuth with the Google provider and DrizzleAdapter.

#### [NEW] [route.ts](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/app/api/auth/[...nextauth]/route.ts)
The NextAuth catch-all API route handler.

---

### UI Components & Styling

We will configure the theme and components to reflect the playful "criança feliz" aesthetics (light backgrounds, football/stars accents) while utilizing shadcn's 'Nova' style.

#### [MODIFY] [globals.css](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/packages/ui/src/styles/globals.css)
Update the light theme colors to add sporty and playful accents:
- Bright blue for primary highlights (`--primary` -> oklch(0.55 0.18 250)).
- Soccer field green for success/accents (`--accent` -> oklch(0.62 0.17 145)).
- Bright orange-yellow for stars (`--chart-1` / custom -> oklch(0.78 0.16 75)).

#### [NEW] UI Components
We will use shadcn components in `packages/ui` or define them locally:
- **Dialog / Modal**: For displaying moment details (media, title, date, phrase) in high resolution.
- **Card**: For displaying individual moments.
- **Input / Textarea / Select**: For the upload form.

We can add them via `npx shadcn add` or implement them using `@base-ui/react` directly since shadcn v4 uses base-ui primitives under the hood.

---

### Application Logic & Layout

#### [NEW] [moment-card.tsx](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/components/moment-card.tsx)
Displays the memory in its selected frame style:
- **Gold Frame**: Border with amber gradient glow, sleek border radius.
- **Polaroid**: Thick white bottom margin, rotated slightly, elegant shadows.
- **Soccer Stars**: Playful layout with small soccer ball and star SVG icons floating at the borders.

#### [NEW] [moment-detail-dialog.tsx](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/components/moment-detail-dialog.tsx)
Dialog showing the full resolution photo/video along with the date, title, and elegant typography for the motivational caption.

#### [NEW] [upload-form.tsx](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/components/upload-form.tsx)
Form panel allowing authorized (signed-in) users to add a new moment.
- Checks authentication. If not signed in, displays a Google sign-in prompt.
- Allows inputs: File upload, Title, Date, Motivational Caption, and Frame style.
- Uses a Next.js Server Action to handle the upload (saving the file locally in the `public/uploads` directory) and inserting it into the PostgreSQL database.

#### [NEW] [upload action](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/app/actions.ts)
Server action to securely handle media upload, store files in `public/uploads/`, and register details in the PostgreSQL database.

#### [MODIFY] [page.tsx](file:///e:/Projetos%20Pessoais/projeto-recordacao-arthur/next-monorepo/apps/web/app/page.tsx)
Builds the complete dashboard layout:
- **Left and Right Sidebars**: Playground background featuring soft-blue floating soccer balls, hearts, and stars icons (exactly matching the mockup side borders).
- **Header**: Playful title "ARTHUR: Guerreiro & Sonhador" with sports icons, and navigation bar.
- **Hero Banner**: Large welcoming card with an image of Arthur in his jersey and motivational text.
- **Main Section Grid**:
  - Left column: The moments gallery grid grouped by date/importance.
  - Right column: The upload form / login panel (with a beautiful gold border container).

---

## Verification Plan

### Automated Build & Typechecks
- Run `npm run typecheck` inside `apps/web` to ensure typescript safety.
- Run `npm run build` to verify Next.js builds successfully.

### Manual Verification
1. Open the dev server: `npm run dev`.
2. Verify page loads correctly on desktop and mobile viewports.
3. Check background styling (soccer/stars border decoration).
4. Verify user can authenticate via Google (using mock provider in development or real client keys in production).
5. Add a memory, choose a frame type (Gold, Polaroid, Soccer Stars), and verify it is rendered with the correct border styling.
6. Click on the memory to open the high-quality view dialog modal.
