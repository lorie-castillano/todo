# Backend Dockerfile — Fastify + Prisma + PostgreSQL
#
# Multi-stage build:
# 1. deps: install production + dev dependencies
# 2. build: compile TypeScript + generate Prisma client
# 3. runtime: slim image with only production deps + compiled output

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npx tsc

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
