# ---- Stage 1: Build ----
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl
# Install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy the rest of your code and build
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-slim AS prod
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl
# Only copy production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# (Optional) Copy any other files needed at runtime, e.g. static assets, .env

CMD ["node", "dist/server.js"]