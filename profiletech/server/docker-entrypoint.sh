#!/bin/sh
set -e

# Ensure Prisma schema is present and DB URL configured
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/server/data/dev.db"
fi

# Prepare prisma (migrate dev --name "init" is not suitable in prod; use migrate deploy)
# Apply migrations if possible (ignore failures to avoid crash on first boot issues)
npm run prisma -- migrate deploy || true

# Seed admin if needed
# Seed admin and default profile (safe to ignore if already seeded)
npm run seed || true

# Ensure uploads directory exists (shared volume)
mkdir -p /app/client/public/assets/profile || true
mkdir -p /app/server/data || true

# Start server
npm start
