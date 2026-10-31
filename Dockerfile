# -----------------------------------------------------------------------------
# Saathi by GrowIOTA: Production Dockerfile
# Multi-stage build for Node.js 24 + Express + Vite Frontend
# -----------------------------------------------------------------------------

FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* .npmrc* ./

# Install all dependencies (including devDependencies for build)
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build Vite client and bundle production server
RUN npm run build

# -----------------------------------------------------------------------------
# Production Runner Stage
# -----------------------------------------------------------------------------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy production package manifest
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy compiled frontend and bundled server from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server/db/schema.sql ./src/server/db/schema.sql
COPY --from=builder /app/.env.example ./.env.example

# Expose HTTP port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/merchants || exit 1

# Start production server
CMD ["node", "dist/server.js"]
