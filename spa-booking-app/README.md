# Spa Booking App — Node/Express/React/TypeScript

A complete online booking application for a spa/salon. Includes:
- **Client booking** widget
- **Admin**: manage services, employees, appointments
- **Notifications**: email + real-time (Socket.IO)
- **Auth**: JWT-based
- **DB**: SQLite with Prisma (easy to switch to Postgres/MySQL)

## Quick Start

### 1) Prerequisites
- Node.js 18+
- pnpm (recommended) or npm/yarn

### 2) Install
```bash
cd server && pnpm install
cd ../client && pnpm install
```

### 3) Configure
Copy `server/.env.example` to `server/.env` and set values (at least SMTP or leave as console mode).

### 4) DB setup
```bash
cd server
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

### 5) Run
Terminal 1:
```bash
cd server
pnpm dev
```

Terminal 2:
```bash
cd client
pnpm dev
```

- API: http://localhost:4000/api
- Admin UI: http://localhost:5173
- Public booking widget: http://localhost:5173 (Home page)

## Production
- Build client: `pnpm build` (in `client/`). Serve `client/dist` from a static host (or proxy from the server).
- Build server: `pnpm build` (in `server/`) then run `pnpm start`. Set `NODE_ENV=production`.

## Switch DB
Edit `server/prisma/schema.prisma` datasources. Update `DATABASE_URL` in `.env`, then migrate.
