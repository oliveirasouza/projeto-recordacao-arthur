# Base image
FROM node:20-alpine AS base

# Install build dependencies
RUN apk add --no-cache libc6-compat ffmpeg
WORKDIR /app

# Install dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
# Copy workspace package.json files
COPY apps/web/package.json ./apps/web/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm ci

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy build output
COPY --from=builder /app ./

USER nextjs

EXPOSE 3000

# Set entrypoint to run database migrations first, then start the web application
CMD ["sh", "-c", "npm run db:migrate -w web && npm run start -w web"]
