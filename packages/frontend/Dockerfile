FROM node:20-alpine

WORKDIR /app

# Copy root workspace files (package-lock.json contains all workspace dependencies)
COPY package.json package-lock.json ./

# Copy frontend package.json to maintain its dependency declarations
COPY packages/frontend/package.json ./packages/frontend/

# Install all workspace dependencies deterministically
# This installs dependencies for all workspaces, but ensures deterministic versions
RUN npm ci --legacy-peer-deps

# Copy frontend source code
COPY packages/frontend/ ./packages/frontend/

# Build application (from frontend directory to use correct package.json)
WORKDIR /app/packages/frontend
RUN npm run build
WORKDIR /app

# Install serve to serve static files
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "3000"]
