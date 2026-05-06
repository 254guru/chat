# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for layer caching.
# Use `npm install` (not --frozen-lockfile) because there is no
# package-lock.json committed — Docker generates a fresh one.
COPY package.json ./
RUN npm install --prefer-offline --no-audit --no-fund

COPY . .
RUN npm run build

# ── Stage 2: Nginx serve ───────────────────────────────────────────────────
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
