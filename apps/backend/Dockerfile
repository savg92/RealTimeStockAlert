FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile

FROM deps AS dev
COPY . .
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["bun", "run", "dev"]

FROM deps AS build
COPY . .
RUN bun run --cwd apps/backend prisma:generate && bun run --cwd packages/shared build && bun run --cwd apps/backend build

FROM base AS prod-deps
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile --production

FROM base AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/bun.lock ./bun.lock
COPY --from=prod-deps /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=prod-deps /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=prod-deps /app/apps/mobile/package.json ./apps/mobile/package.json
COPY --from=prod-deps /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/src/generated/prisma ./apps/backend/src/generated/prisma
USER bun
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["bun", "run", "start"]
