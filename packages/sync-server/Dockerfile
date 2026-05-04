FROM node:22-alpine

# Upgrade packages to fix known vulnerabilities in the base alpine image
RUN apk upgrade --no-cache

WORKDIR /app

# Copy root manifest and lockfile
COPY package.json package-lock.json ./

# Copy workspace package.jsons
COPY packages/sync-server/package.json packages/sync-server/
COPY packages/client/package.json packages/client/

# Install dependencies for all workspaces
RUN npm ci

# Copy server source code
COPY packages/sync-server packages/sync-server

# Set working directory to the server package
WORKDIR /app/packages/sync-server

# Expose the default WebSocket port
EXPOSE 1234

# Use the production start script
CMD ["npm", "start"]
