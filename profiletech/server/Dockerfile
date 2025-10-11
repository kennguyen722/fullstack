FROM public.ecr.aws/docker/library/node:20-bookworm-slim AS base
WORKDIR /app/server

# Install dependencies
COPY package.json ./
COPY tsconfig.json ./
COPY prisma ./prisma
RUN npm install
RUN npx prisma generate

# Copy source and build
COPY src ./src
RUN npm run build

# Runtime image
FROM public.ecr.aws/docker/library/node:20-bookworm-slim AS runtime
WORKDIR /app/server
ENV NODE_ENV=production

# Ensure OpenSSL v3 is available for Prisma's query engine on Debian
RUN apt-get update \
	&& apt-get install -y --no-install-recommends libssl3 ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Copy built app and prisma assets
COPY --from=base /app/server/node_modules ./node_modules
COPY --from=base /app/server/prisma ./prisma
COPY --from=base /app/server/dist ./dist
COPY --from=base /app/server/package.json ./package.json

# Entry script to run migrations and start
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Expose API port
EXPOSE 4300

# Volumes for SQLite DB (data) and shared uploads path
RUN mkdir -p /app/server/data
VOLUME ["/app/server/data", "/app/client/public/assets/profile"]

CMD ["./docker-entrypoint.sh"]
