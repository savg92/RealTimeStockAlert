# Development Dockerfile with hot-reload support
FROM node:20-alpine

WORKDIR /app

# Install dependencies globally
RUN npm install -g bun

# Copy root package files
COPY package.json bun.lock ./

# Copy monorepo structure
COPY apps/backend ./apps/backend
COPY apps/mobile ./apps/mobile
COPY packages ./packages
COPY tsconfig.base.json ./

# Install dependencies
RUN bun install

# Build the application
RUN cd apps/backend && bun run build

# Expose port
EXPOSE 3000

# Run development server with watch mode
WORKDIR /app/apps/backend
CMD ["bun", "run", "dev"]
