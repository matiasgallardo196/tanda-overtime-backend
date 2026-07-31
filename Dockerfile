# --- Build stage: compiles TypeScript, has devDependencies ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Production stage: only runtime deps, runs as non-root ---
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Persists alerts.json across container restarts - mount a volume on this
# path in Coolify, otherwise alert configs are lost on every redeploy.
RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 3000
CMD ["node", "dist/main"]
