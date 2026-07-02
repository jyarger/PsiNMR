# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the Rust compute engine to WebAssembly
# ---------------------------------------------------------------------------
FROM rust:1-bookworm AS wasm
WORKDIR /build
RUN cargo install wasm-pack --locked
COPY rust/psinmr-core ./rust/psinmr-core
RUN wasm-pack build rust/psinmr-core \
      --target web --release \
      --out-dir /build/pkg --out-name psinmr_core \
    && rm -f /build/pkg/.gitignore

# ---------------------------------------------------------------------------
# Stage 2 — build the React/TypeScript frontend
# ---------------------------------------------------------------------------
FROM node:24-bookworm AS web
WORKDIR /app

# Install dependencies against the lockfile first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Bring in sources, then overwrite the committed wasm package with a
# freshly built one so the image never ships stale binaries.
COPY . .
COPY --from=wasm /build/pkg ./src/compute/pkg

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — serve the static bundle with nginx
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache openssl
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/10-gen-self-signed-cert.sh /docker-entrypoint.d/10-gen-self-signed-cert.sh
RUN chmod +x /docker-entrypoint.d/10-gen-self-signed-cert.sh
COPY --from=web /app/build /usr/share/nginx/html
EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
