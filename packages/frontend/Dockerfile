# Multi-stage build for frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./

# Copy frontend package.json
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy frontend source
COPY packages/frontend/ ./packages/frontend/

# Build application
WORKDIR /app/packages/frontend
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_VISION_SERVICE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_VISION_SERVICE_URL=$VITE_VISION_SERVICE_URL
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
