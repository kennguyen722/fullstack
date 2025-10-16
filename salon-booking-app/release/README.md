Salon's Booking App - Release Artifacts

This directory contains production-ready artifacts for deployment.

Structure
- client/: static frontend build (Vite `dist`)
- server/: compiled Node.js server (`dist`), `package.json`, and `prisma/` folder with schema

Quick run (single server serving API only):
1. Copy `release` contents to your server host.
2. Install runtime deps (only needed for server runtime):

   ```powershell
   cd release/server
   npm ci --only=production
   ```

3. Ensure environment variables (create `.env` or set system env vars):
   - DATABASE_URL - connection string for your database
   - JWT_SECRET - secret for signing tokens
   - PORT - port to run the server (default: 4301)
   - Any other envs from the original repository

4. Start server:

   ```powershell
   node dist/index.js
   ```

Serving the client:
- The `client/` folder is a static build. Serve with any static file server (nginx, AWS S3 + CloudFront, etc.).
- If you want the Node server to also serve the static client, configure your reverse proxy (nginx) or copy `client/dist` into the server's static assets path and update the server code.

Prisma:
- The `server/prisma` contains the schemas and migrations. Before running the server, ensure `DATABASE_URL` is correctly set and run any migrations required by your chosen environment.
- If using Prisma Client generated files are not present, run `npx prisma generate` within `release/server` to generate `node_modules/@prisma/client`.

Notes
- This release contains compiled server code (TypeScript compiled to JavaScript) and static client assets.
- For production, prefer building a Docker image or using a process manager (PM2) with proper env management.
