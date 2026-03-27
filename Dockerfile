# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npm run build
RUN npx drizzle-kit push

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tini

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared

# SQLite data directory
RUN mkdir -p /app/data
VOLUME /app/data

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.cjs"]
