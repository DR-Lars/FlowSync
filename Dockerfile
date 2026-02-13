# Build stage
FROM node:20-alpine AS builder

WORKDIR /build

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml* ./
COPY tsconfig.json ./
COPY src ./src

# Install dependencies and build
RUN pnpm install --frozen-lockfile && pnpm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application from builder
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package*.json ./

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Create env-data directory with proper permissions
RUN mkdir -p /app/env-data && chown nodejs:nodejs /app/env-data && chmod 777 /app/env-data

# Create .env file with proper permissions if it doesn't exist
RUN touch /app/.env && chown nodejs:nodejs /app/.env && chmod 664 /app/.env

# Set user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]

# Expose port (default 3000)
EXPOSE 3000
