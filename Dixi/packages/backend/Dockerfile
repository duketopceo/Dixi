FROM node:20-alpine

WORKDIR /app

# Copy root workspace files (package-lock.json contains all workspace dependencies)
COPY package.json package-lock.json ./

# Copy backend package.json to maintain its dependency declarations
COPY packages/backend/package.json ./packages/backend/

# Install all workspace dependencies deterministically
# This installs dependencies for all workspaces, but ensures deterministic versions
RUN npm ci --legacy-peer-deps

# Copy backend source code
COPY packages/backend/ ./packages/backend/

# Build TypeScript (from backend directory to use correct package.json)
WORKDIR /app/packages/backend
RUN npm run build
WORKDIR /app

# Expose ports
EXPOSE 3001 3002

# Start server (from backend directory)
WORKDIR /app/packages/backend
CMD ["npm", "start"]
