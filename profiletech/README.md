# ProfileTech

Full-stack professional profile app built with:

- Backend: Node.js, Express, TypeScript, Prisma (SQLite), Zod, JWT, Multer
- Frontend: React, Vite, TypeScript, Bootstrap (professional dark themes)

This README covers complete local setup, Prisma workflows (migrate, generate, seed), and how to build and run both server and client.

---

## 1) Prerequisites

- Node.js 18+ (recommended LTS)
- pnpm (recommended) or npm

Windows PowerShell is assumed for the command examples below.

---

## 2) Repository layout

```
profiletech/
   server/        # Express + Prisma API
   client/        # React + Vite app
```

---

## 3) Backend (server)

Location: `server/`

### 3.1 Configure environment

Copy and edit the env file:

```
Copy-Item server/.env.example server/.env
```

Default values (SQLite):

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="change_me"
PORT=4300
CLIENT_URL="http://localhost:5300"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="password"
```

### 3.2 Install dependencies

```
pnpm -C server install
```

or

```
npm --prefix server install
```

### 3.3 Prisma workflows

- Generate Prisma Client (after install or schema changes):

```
npx --yes prisma generate --schema=server/prisma/schema.prisma
```

- Create a new migration (when you change `schema.prisma`):

```
npx --yes prisma migrate dev --schema=server/prisma/schema.prisma --name <your_migration_name>
```

This updates the SQLite database at `server/prisma/dev.db` and writes a migration in `server/prisma/migrations/`.

- Apply existing migrations without creating new ones (e.g., fresh clone):

```
npx --yes prisma migrate deploy --schema=server/prisma/schema.prisma
```

- Reset database (drops data, re-applies migrations):

```
npx --yes prisma migrate reset --schema=server/prisma/schema.prisma
```

- Seed data (creates admin user and initial profile):

```
pnpm -C server run seed
```

> Tip: If you reset or change the schema, run generate and optionally seed again.

### 3.4 Run the server

Development (watch):

```
pnpm -C server run dev
```

Build and start (production-like):

```
pnpm -C server run build; pnpm -C server run start
```

The API will be available at:

- http://localhost:4300
- Health: http://localhost:4300/api/health

Auth:

- Login: POST /api/auth/login { email, password }
- Uses JWT (Bearer token) and role-based Admin guard for profile updates and photo upload

Profile:

- GET /api/profile/public (public landing)
- GET /api/profile/me (requires login)
- PUT /api/profile/me (requires Admin)
- POST /api/profile/photo (requires Admin; multipart form-data field `file`)

Uploads are saved under `client/public/assets/profile`. The API returns a relative URL like `/assets/profile/<file>` which the client displays.

---

## 4) Frontend (client)

Location: `client/`

### 4.1 Install dependencies

```
pnpm -C client install
```

or

```
npm --prefix client install
```

### 4.2 Run the client

Development:

```
pnpm -C client run dev
```

This serves the app at http://localhost:5300 by default.

Build (production bundle):

```
pnpm -C client run build
```

Preview built bundle (optional):

```
pnpm -C client run preview
```

---

## 5) End-to-end setup checklist

1) Configure server env:

```
Copy-Item server/.env.example server/.env
```

2) Install deps:

```
pnpm -C server install; pnpm -C client install
```

3) Initialize Prisma (first time or after schema edits):

```
npx --yes prisma generate --schema=server/prisma/schema.prisma
npx --yes prisma migrate dev --schema=server/prisma/schema.prisma --name init
```

4) Seed (optional but recommended to create Admin and sample profile):

```
pnpm -C server run seed
```

5) Run servers:

```
pnpm -C server run dev
pnpm -C client run dev
```

Open http://localhost:5300

---

## 6) Common tasks and troubleshooting

- Change Prisma schema:
   - Edit `server/prisma/schema.prisma`
   - Run: `npx prisma migrate dev --schema=server/prisma/schema.prisma --name <change>`
   - Then: `npx prisma generate --schema=server/prisma/schema.prisma`

- Clean reset the DB:
   - `npx prisma migrate reset --schema=server/prisma/schema.prisma`
   - `pnpm -C server run seed` (optional)

- Auth errors (401/403):
   - Ensure you’re logged in as Admin. The seed user is admin@example.com (see seed script) with the seeded password.

- “Invalid payload” saving Profile:
   - Client now validates inputs and the server normalizes URLs/emails.
   - Ensure date fields are valid or blank; LinkedIn/GitHub with `www.` or full `https://` will be accepted.

- Photo upload not visible:
   - The client adds a cache-busting param, but force-refresh if needed.
   - Uploaded files go to `client/public/assets/profile`.

---

## 7) Useful scripts

- Server
   - Dev: `pnpm -C server run dev`
   - Build: `pnpm -C server run build`
   - Start: `pnpm -C server run start`
   - Seed: `pnpm -C server run seed`
   - Prisma CLI: `pnpm -C server run prisma <cmd>`

- Client
   - Dev: `pnpm -C client run dev`
   - Build: `pnpm -C client run build`
   - Preview: `pnpm -C client run preview`

---

## 8) Credentials and roles

- Seeded Admin: see `server/src/seed.ts` for email/password and role `ADMIN`.
    - Configure via env in `server/.env`: `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
    - Example:
       - ADMIN_EMAIL=ken.nguyen722@gmail.com
       - ADMIN_PASSWORD=Admin2025$
- Only Admin can update profile and upload photo.

---

## 9) Production notes

- For a production deployment, set environment variables appropriately in `server/.env` (strong JWT_SECRET, proper CLIENT_URL).
- Use a persistent DB (PostgreSQL/MySQL) by changing the Prisma datasource provider and DATABASE_URL, then generate/migrate.
- Serve the client build via your preferred host (static hosting/CDN) and configure CORS.

---

## 10) Paths reference

- API server: `server/src/index.ts`
- Prisma schema: `server/prisma/schema.prisma`
- Seed script: `server/src/seed.ts`
- Client entry: `client/src/main.tsx`
- Client app: `client/src/App.tsx`

If anything’s unclear or you want one-command scripts (e.g., setup.ps1), I can add them.

---

## 11) Docker deployment

The included Docker setup lets you build and run the app anywhere Docker is available.

### What’s included
- `docker-compose.yml`: Orchestrates server (Node + Prisma + SQLite) and client (Nginx).
- `server/Dockerfile`: Builds the API service, runs Prisma migrate deploy, seeds, and starts the server.
- `server/docker-entrypoint.sh`: Entrypoint to run migrations/seed before starting.
- `client/Dockerfile`: Builds the SPA and serves it with Nginx.
- `client/nginx.conf`: Nginx configuration for SPA routing and static assets.

### Environment variables
Create a `.env` next to `docker-compose.yml` to customize:

```
JWT_SECRET=change_me_strong
DATABASE_URL=file:./dev.db
CLIENT_URL=http://localhost:8080
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin2025$
VITE_API_URL=http://localhost:4300/api
```

Notes:
- `CLIENT_URL` must match the client container’s exposed URL for CORS.
- `VITE_API_URL` is baked into the client at build time; compose passes it via build arg.
- SQLite database and uploads are persisted via volumes.

### Build and run

```
docker compose build
docker compose up -d
```

Open the app at http://localhost:8080

API is at http://localhost:4300/api

### First run and seeding
- Server runs `prisma migrate deploy` and then `npm run seed` automatically.
- Admin credentials come from env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).

### Uploads and static files
- Profile photos are stored in a shared volume and served at `/assets/profile/...` by the client container.

### Stop and cleanup

```
docker compose down
```

To remove volumes (database and uploads):

```
docker compose down -v
```

### Troubleshooting
- If you change `VITE_API_URL`, rebuild the client: `docker compose build client && docker compose up -d client`.
- Check logs: `docker compose logs -f server` and `docker compose logs -f client`.