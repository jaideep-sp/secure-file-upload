# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Install pnpm (optional, if you prefer pnpm)
# RUN npm install -g pnpm --force

# Copy package files and install ALL dependencies (including dev for build)
COPY package*.json ./
# For pnpm:
# COPY pnpm-lock.yaml ./
# RUN pnpm install --frozen-lockfile
# For npm:
RUN npm ci

COPY . .

# Generate Prisma Client (ensure schema.prisma is copied)
RUN npx prisma generate

# Build the application
RUN npm run build
# RUN ls -R /usr/src/app # For debugging Docker build steps

# Stage 2: Production Image
FROM node:18-alpine
WORKDIR /usr/src/app

ENV NODE_ENV production

# Copy only necessary production artifacts from builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
# For pnpm:
# COPY --from=builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma 
# Create uploads directory and set ownership
# The 'node' user (UID 1000) is standard in official Node images
RUN mkdir -p /usr/src/app/uploads && chown -R node:node /usr/src/app/uploads

USER node

# Expose port (should match PORT in .env)
EXPOSE ${PORT:-3000}

# Healthcheck (adjust endpoint and port as needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --spider http://localhost:${PORT:-3000}/health || exit 1
  # For alpine, `wget` might not be installed by default. Use `apk add wget` if needed, or use `curl`.
  # HEALTHCHECK CMD curl --fail http://localhost:${PORT:-3000}/health || exit 1
  # (add `RUN apk add --no-cache curl` if using curl)


# Default command to run the application
CMD ["node", "dist/main.js"]