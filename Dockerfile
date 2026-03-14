# Unified production Dockerfile for Dixi
# Builds frontend + backend together, vision service optional

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/frontend/package.json ./packages/frontend/
RUN npm ci --legacy-peer-deps
COPY packages/frontend/ ./packages/frontend/
WORKDIR /app/packages/frontend
ENV DEMO_MODE=true
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/
RUN npm ci --legacy-peer-deps
COPY packages/backend/ ./packages/backend/
WORKDIR /app/packages/backend
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine
WORKDIR /app

# Install serve for frontend
RUN npm install -g serve concurrently

# Copy built frontend
COPY --from=frontend-builder /app/packages/frontend/dist ./frontend-dist

# Copy backend
COPY --from=backend-builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=backend-builder /app/packages/backend/package.json ./packages/backend/
COPY --from=backend-builder /app/node_modules ./node_modules
COPY package.json ./

ENV NODE_ENV=production
ENV DEMO_MODE=true
ENV PORT=3020
EXPOSE 3020

# Serve frontend on 3020, backend on 3001 internally
CMD ["sh", "-c", "cd packages/backend && node dist/index.js & serve -s /app/frontend-dist -l 3020"]
