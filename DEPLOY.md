# Deploying PsiNMR

PsiNMR is a **stateless single-page app**: a static bundle of HTML/JS/CSS plus
a WebAssembly compute module, served by nginx. There is no database, no server
state, and no per-user session — every computation runs in the visitor's
browser. That makes it trivial to host and to scale: one small container can
serve a large number of users, and you can run identical copies anywhere.

This guide covers **local development** hosting and every **production**
option, with a recommended path for the public `psinmr.com` deployment.

---

## Contents

- [Architecture at a glance](#architecture-at-a-glance)
- [Prerequisites](#prerequisites)
- [Local deployment](#local-deployment)
  - [A. Node dev server (fastest iteration)](#a-node-dev-server-fastest-iteration)
  - [B. Docker, built locally (production parity)](#b-docker-built-locally-production-parity)
- [Building & publishing the image (CI → GHCR)](#building--publishing-the-image-ci--ghcr)
- [Fresh Linux server, start to finish](#fresh-linux-server-start-to-finish)
- [Production deployment](#production-deployment)
  - [Option 1 — Cloudflare Tunnel (recommended)](#option-1--cloudflare-tunnel-recommended)
  - [Option 2 — Cloudflare proxy + Origin Certificate](#option-2--cloudflare-proxy--origin-certificate)
  - [Option 3 — Caddy / Let's Encrypt (Cloudflare-independent)](#option-3--caddy--lets-encrypt-cloudflare-independent)
  - [Option 4 — Direct host ports behind a firewall](#option-4--direct-host-ports-behind-a-firewall)
- [Cloudflare DNS for psinmr.com](#cloudflare-dns-for-psinmrcom)
- [Updating a running deployment](#updating-a-running-deployment)
- [Alternative packaging & install options](#alternative-packaging--install-options)
- [Configuration reference](#configuration-reference)
- [Security headers & CSP](#security-headers--csp)
- [Health, logs & monitoring](#health-logs--monitoring)
- [Troubleshooting](#troubleshooting)

---

## Architecture at a glance

```
                        ┌────────────────────────────────────────┐
   Browser  ──TLS──►    │  Front door (varies by option below)    │
                        │  Cloudflare edge / Tunnel / Caddy       │
                        └───────────────────┬────────────────────┘
                                            │ HTTP (private)
                                   ┌────────▼─────────┐
                                   │  psinmr container │  nginx:alpine
                                   │  • static bundle  │  serves /usr/share/nginx/html
                                   │  • /bmrb-data/ →  │  reverse-proxy + cache to bmrb.io
                                   └───────────────────┘
```

The image is produced by a 3-stage build (`Dockerfile`):

1. **wasm** — `rust:bookworm` compiles `rust/psinmr-core` to WebAssembly with `wasm-pack`.
2. **web** — `node:24` runs `npm ci` + `npm run build` (Vite), pulling in the fresh wasm.
3. **runtime** — `nginx:1.27-alpine` serves the built `build/` directory.

Only the third stage ships. Everything the app fetches from third parties
(nmrXiv, GitHub, user-supplied URLs) goes **directly from the browser**; the
one exception is BMRB, whose server sends no CORS headers, so nginx reverse-
proxies and caches it at `/bmrb-data/`.

---

## Prerequisites

**Local development**

- Node 24+ and npm
- Rust toolchain + `wasm32-unknown-unknown` target + `wasm-pack` (only if you
  change the Rust engine; a prebuilt `src/compute/pkg` is committed)
- Docker + Docker Compose (for the container path)

**Production (VPS)**

- A Linux VPS (e.g. Hostinger) with Docker + Docker Compose plugin installed
- A Cloudflare account with `psinmr.com` added as a zone
- Nothing else — no Node, Rust, or build tooling is needed on the VPS when you
  pull the prebuilt image

---

## Local deployment

### A. Node dev server (fastest iteration)

Hot-reloading dev server on <http://localhost:3000>:

```bash
npm ci
npm run wasm        # only needed once, or after Rust changes
npm run dev
```

The dev server proxies `/bmrb-data` to bmrb.io itself (see `vite.config.ts`),
so the BMRB browser works without the container.

### B. Docker, built locally (production parity)

This is the right path for the **local development box** you want running the
container. It builds the exact image used in production and serves it over
HTTP and self-signed HTTPS:

```bash
docker compose up --build      # uses docker-compose.yml
```

- <http://localhost:8080> — HTTP
- <https://localhost:8443> — HTTPS (self-signed; your browser shows a one-time
  trust warning, which is expected locally)

Stop with `docker compose down`. Rebuild after code changes with
`docker compose up --build`.

---

## Building & publishing the image (CI → GHCR)

Don't build on the VPS — the Rust + OpenChemLib + Vite build is memory-hungry
and a small box can OOM. Instead, GitHub Actions builds the image and pushes it
to the **GitHub Container Registry (GHCR)**; the VPS only ever pulls.

The workflow `.github/workflows/docker-publish.yml` runs on:

- every push to `main` → tags `main` and `sha-<short>`
- every version tag `vX.Y.Z` → tags `X.Y.Z`, `X.Y`, and `latest`

**One-time setup:**

1. Push the workflow (it uses the built-in `GITHUB_TOKEN`; no secrets needed).
2. After the first successful run, open
   `https://github.com/jyarger/PsiNMR/pkgs/container/psinmr` →
   **Package settings** → set visibility to **Public** so the VPS can pull
   without authenticating. (For a private image, run
   `docker login ghcr.io` on the VPS with a read-scoped PAT instead.)

Resulting image: `ghcr.io/jyarger/psinmr:<tag>`.

**Manual build & push** (if you ever need it):

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u jyarger --password-stdin
docker build -t ghcr.io/jyarger/psinmr:latest .
docker push ghcr.io/jyarger/psinmr:latest
```

---

## Fresh Linux server, start to finish

This is the zero-to-live walkthrough for a **brand-new Linux VPS** (e.g. a
Hostinger Ubuntu 24.04 LTS box) that has nothing installed. At the end you have
a public, HTTPS `https://psinmr.com` with no inbound ports open. Commands are
for Debian/Ubuntu (`apt`); RHEL/Fedora notes (`dnf`) are inline.

### 1. Log in and update the base system

```bash
ssh root@YOUR_SERVER_IP
apt update && apt upgrade -y            # dnf upgrade -y on RHEL/Fedora
```

### 2. Create a non-root sudo user

Don't run day-to-day as root. Create a user, grant sudo, and copy your SSH key
so you can log in as them:

```bash
adduser psi
usermod -aG sudo psi                    # -aG wheel on RHEL/Fedora
rsync --archive --chown=psi:psi ~/.ssh /home/psi
# from now on: ssh psi@YOUR_SERVER_IP
```

### 3. Lock down the firewall

With the Cloudflare Tunnel path below you need **no** inbound web ports —
`cloudflared` dials outward. Allow only SSH:

```bash
apt install -y ufw
ufw allow OpenSSH
ufw enable
```

(If you instead terminate TLS on the box — [Options 2–3](#option-2--cloudflare-proxy--origin-certificate) — also `ufw allow 80,443/tcp`.)

### 4. Install Docker Engine + Compose plugin

Docker's official convenience script works across Ubuntu/Debian/Fedora:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER           # run docker without sudo
newgrp docker                           # apply the group now (or re-login)
docker --version && docker compose version
```

### 5. Install git and clone PsiNMR

```bash
sudo apt install -y git                 # dnf install -y git
git clone https://github.com/jyarger/PsiNMR.git
cd PsiNMR
```

You do **not** build on the server. Cloning only fetches the compose files,
`.env.example`, and `docker/` config; the actual app is the prebuilt image
pulled from GHCR (see [Building & publishing](#building--publishing-the-image-ci--ghcr)).

### 6. Configure the environment

```bash
cp .env.example .env
nano .env
#   IMAGE_TAG=v0.3.0     # pin a release (recommended), or `latest`
#   TUNNEL_TOKEN=…       # filled in the next step
```

### 7. Create the Cloudflare Tunnel (public URL + HTTPS, no certs on the box)

In the Cloudflare dashboard: **Zero Trust → Networks → Tunnels → Create a
tunnel → Cloudflared**, name it `psinmr`, and copy the **tunnel token**. Then in
the tunnel's **Public Hostname** tab add:

- **Domain** `psinmr.com` (subdomain blank for the apex; add a second entry for
  `www` if you want it)
- **Service** `HTTP` → `psinmr:80`

Paste the token into `.env` as `TUNNEL_TOKEN=…`. (Full detail and the
alternatives are in [Option 1](#option-1--cloudflare-tunnel-recommended) below.)

### 8. Launch

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps      # both services healthy?
```

Visit <https://psinmr.com>. Cloudflare creates the DNS record automatically and
terminates TLS at its edge — the VPS never handles a certificate and needs no
open web ports. **Done.**

### 9. Keep it running and patched

`restart: unless-stopped` already brings both containers back after a reboot.
Add automatic security updates:

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

To update PsiNMR later, see [Updating a running deployment](#updating-a-running-deployment)
(two commands). For a one-command version of steps 4–8, or a template that runs
this automatically on first boot, see
[Alternative packaging & install options](#alternative-packaging--install-options).

---

## Production deployment

All production options run the **same container**. They differ only in the
"front door" — how TLS is terminated and how traffic reaches the box.

### Option 1 — Cloudflare Tunnel (recommended)

Best fit for `psinmr.com` on a Hostinger VPS: **no inbound ports, no public IP
exposure, no certificate management on the box.** `cloudflared` dials outward
to Cloudflare, which terminates real TLS at the edge and forwards requests to
the container over the private Docker network.

**Steps:**

1. **Create the tunnel.** Cloudflare dashboard → **Zero Trust** → **Networks**
   → **Tunnels** → **Create a tunnel** → **Cloudflared**. Name it `psinmr`.
   Copy the **tunnel token** from the install snippet Cloudflare shows.

2. **Add the public hostname.** In the tunnel's **Public Hostname** tab:
   - Subdomain: _(blank)_ and _(blank)_ for the apex, or `www`
   - Domain: `psinmr.com`
   - Service: **HTTP** → `psinmr:80`

   Add a second hostname for `www.psinmr.com` → same service if you want both.

3. **Configure the VPS** (in the cloned repo):

   ```bash
   cp .env.example .env
   # set IMAGE_TAG=v0.2.1 (or latest) and paste TUNNEL_TOKEN=...
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Done.** Cloudflare creates the DNS records for the tunnel automatically.
   Visit <https://psinmr.com>. No ports 80/443 need to be open on the VPS
   firewall at all — you can leave them closed.

`docker-compose.prod.yml` runs two services: the `psinmr` image (no published
ports) and `cloudflared`. TLS, HTTP/3, DDoS protection, and edge caching all
come from Cloudflare for free.

### Option 2 — Cloudflare proxy + Origin Certificate

If you prefer classic DNS + proxied origin (orange-cloud) over a tunnel: point
an `A`/`AAAA` record at the VPS IP with the proxy **on**, open ports 80/443,
and give nginx a real origin cert.

1. Cloudflare dashboard → **SSL/TLS** → **Origin Server** → **Create
   Certificate** (free, 15-year). Save the cert and key.
2. Mount them into the container in place of the self-signed pair:

   ```yaml
   # add to the psinmr service in a compose override
   volumes:
     - ./certs/psinmr.crt:/etc/nginx/ssl/psinmr.crt:ro
     - ./certs/psinmr.key:/etc/nginx/ssl/psinmr.key:ro
   ports:
     - '80:80'
     - '443:443'
   ```

   (Mounting a real cert makes the startup script skip self-signed generation,
   since the files already exist.)

3. Cloudflare → **SSL/TLS** → set mode to **Full (strict)**.

The existing `443 ssl` listener already fits this; only the certificate
changes. Without an origin cert you can use mode **Full** (not strict), which
accepts the container's self-signed cert — acceptable but less ideal.

### Option 3 — Caddy / Let's Encrypt (Cloudflare-independent)

To avoid depending on Cloudflare proxying, put **Caddy** in front — it obtains
and auto-renews Let's Encrypt certificates and speaks HTTP/3, with a two-line
config. Point a normal DNS `A` record (proxy off / grey-cloud) at the VPS and
open 80/443.

`Caddyfile`:

```
psinmr.com, www.psinmr.com {
    reverse_proxy psinmr:80
}
```

`docker-compose.caddy.yml` (sketch):

```yaml
services:
  psinmr:
    image: ghcr.io/jyarger/psinmr:${IMAGE_TAG:-latest}
    restart: unless-stopped
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ['80:80', '443:443', '443:443/udp']
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
volumes:
  caddy_data:
  caddy_config:
```

Traefik is an equally good choice if you prefer label-based config. Either way
the PsiNMR container is unchanged.

### Option 4 — Direct host ports behind a firewall

For a quick internal/staging box with no domain: publish the container's ports
directly and reach it by IP. Browsers will warn on the self-signed HTTPS cert.

```bash
docker compose up -d          # 8080 (HTTP) / 8443 (HTTPS)
```

Not recommended for public traffic — there's no real TLS and no edge
protection. Use Option 1–3 for anything user-facing.

---

## Cloudflare DNS for psinmr.com

- **With a Tunnel (Option 1):** you don't create records by hand — adding a
  public hostname to the tunnel creates the proxied `CNAME` automatically.
- **With Options 2–3:** create `A` (and `AAAA` if you have IPv6) records for
  `psinmr.com` and `www` pointing at the VPS IP. Proxy **on** for Option 2,
  **off** for Option 3. Optionally add a redirect rule `www → apex` (or vice
  versa). Set SSL/TLS mode to **Full (strict)** for Option 2, or **Full** if
  using the self-signed origin cert.

---

## Updating a running deployment

Because the VPS pulls a prebuilt image, updates are two commands:

```bash
# pin a new release in .env (IMAGE_TAG=v0.3.0) or keep `latest`
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker image prune -f          # optional: reclaim old layers
```

Roll back by setting `IMAGE_TAG` to a previous version and repeating. Pinning
an explicit tag (rather than `latest`) is recommended for reproducibility.

---

## Alternative packaging & install options

The Docker image is the canonical artifact, but because PsiNMR is a single
static container, it repackages easily for different audiences. These range
from "ready today" to "recommended to build next"; each is flagged.

### 1. Bare Docker one-liner — _ready today_

No compose, no domain — for a quick look on any machine with Docker:

```bash
docker run --rm -p 8080:80 ghcr.io/jyarger/psinmr:latest
# open http://localhost:8080
```

### 2. One-line bootstrap script — _recommended to add (`scripts/install.sh`)_

A single idempotent script that performs steps 4–8 of the fresh-server
walkthrough, so a new box goes live with one command:

```bash
curl -fsSL https://raw.githubusercontent.com/jyarger/PsiNMR/main/scripts/install.sh | bash -s -- --tag v0.3.0 --token <CF_TUNNEL_TOKEN>
```

Sketch of what it does (install Docker if missing → clone → write `.env` →
`compose pull && up -d`):

```bash
#!/usr/bin/env bash
set -euo pipefail
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
[ -d PsiNMR ] || git clone https://github.com/jyarger/PsiNMR.git
cd PsiNMR
cp -n .env.example .env
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${TAG:-latest}/" .env
sed -i "s/^TUNNEL_TOKEN=.*/TUNNEL_TOKEN=${TOKEN}/" .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Piping a remote script to `bash` is convenient but asks users to trust the URL;
document the option and let cautious operators download-then-run. (Say the word
and I'll add a hardened, flag-parsing version of this to the repo.)

### 3. cloud-init template — _recommended for auto-provisioned VMs_

Most clouds (and Proxmox, Multipass, Hetzner, DigitalOcean, AWS/GCP/Azure)
accept a **cloud-init** `user-data` file that runs on first boot — the basis of
a reusable "spin up your own PsiNMR" template with zero manual steps:

```yaml
#cloud-config
package_update: true
packages: [git]
runcmd:
  - curl -fsSL https://get.docker.com | sh
  - git clone https://github.com/jyarger/PsiNMR.git /opt/PsiNMR
  - cp /opt/PsiNMR/.env.example /opt/PsiNMR/.env
  - sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=latest/' /opt/PsiNMR/.env
  - sed -i 's/^TUNNEL_TOKEN=.*/TUNNEL_TOKEN=REPLACE_ME/' /opt/PsiNMR/.env
  - docker compose -f /opt/PsiNMR/docker-compose.prod.yml up -d
```

### 4. Self-contained public stack, no Cloudflare — _config exists ([Option 3](#option-3--caddy--lets-encrypt-cloudflare-independent))_

For a public HTTPS site with **only a DNS `A` record** and no third-party edge,
run the bundled Caddy stack — Caddy fetches and renews Let's Encrypt certs
automatically:

```bash
docker compose -f docker-compose.caddy.yml up -d   # ports 80/443 open
```

This is the most portable "public web + reverse proxy + HTTPS in one file"
appliance. Traefik is an equivalent label-driven alternative.

### 5. Prebuilt VM appliance (OVA / qcow2) — _proposed_

For operators who don't want to touch a shell at all, export a configured VM as
an **OVA** (VirtualBox/VMware) or **qcow2** (KVM/Proxmox) image: a small Ubuntu
base + Docker + the compose files, first-boot cloud-init prompting only for the
tunnel token. Build reproducibly with **HashiCorp Packer** so each release can
ship a matching appliance. Heavier to host and distribute (hundreds of MB) than
a script, so best reserved for on-prem/air-gapped labs.

### 6. Provider marketplace "1-click" — _proposed_

The Packer image from #5 can be submitted to the **DigitalOcean / Linode / AWS**
marketplaces as a one-click PsiNMR droplet/instance. Highest reach, but each
marketplace has its own review and image-format requirements — worth it only
once there's external demand.

**Recommended order to build:** the `install.sh` (#2) and cloud-init (#3)
templates cover ~95% of self-hosters for near-zero effort and reuse the existing
image; VM appliances and marketplace listings (#5–6) are worth it only if
non-technical or on-prem adoption picks up.

---

## Configuration reference

| Setting                | Where                          | Notes                                                  |
| ---------------------- | ------------------------------ | ------------------------------------------------------ |
| `IMAGE_TAG`            | `.env`                         | GHCR tag to run (`v0.2.1`, `latest`, `main`, `sha-…`). |
| `TUNNEL_TOKEN`         | `.env`                         | Cloudflare Tunnel token (Option 1). Never commit.      |
| HTTP / HTTPS ports     | compose `ports:`               | Local: 8080/8443. Prod-tunnel: none.                   |
| BMRB proxy cache       | `docker/nginx.conf`            | `proxy_cache_path … max_size=1g inactive=7d`.          |
| BMRB proxy timeouts    | `docker/nginx.conf`            | connect 10s / send 30s / read 60s.                     |
| Security headers / CSP | `docker/security-headers.conf` | Included in every location.                            |
| Sourcemaps             | `vite.config.ts`               | Off in prod; `SOURCEMAP=hidden` to emit external maps. |

The app itself needs **no runtime environment variables** — it's fully static.
All third-party endpoints (nmrXiv, BMRB, GitHub) are reached from the browser
or via the fixed `/bmrb-data/` proxy.

---

## Security headers & CSP

`docker/security-headers.conf` sets, on every response:

- **Content-Security-Policy** — `default-src 'self'`; scripts limited to self +
  `wasm-unsafe-eval` (Rust/Wasm engine) + `unsafe-eval` (OpenChemLib molecule
  tools) + `blob:`; styles allow `unsafe-inline` (Emotion); `object-src 'none'`;
  `base-uri 'self'`; `frame-ancestors 'self'` (anti-clickjacking).
  `connect-src` intentionally allows any `https:` origin because the
  "Load from a URL" scanner and nmrXiv archives fetch third-party data servers
  by design.
- **X-Content-Type-Options** `nosniff`
- **X-Frame-Options** `SAMEORIGIN`
- **Referrer-Policy** `strict-origin-when-cross-origin`
- **Permissions-Policy** disabling camera, microphone, geolocation, FLoC

**Hardening ideas** if you later drop the molecule tools: remove `unsafe-eval`
from `script-src` and test structure editing/prediction. To use `SharedArray
Buffer` (needed if threaded/Web-Worker wasm lands), you'll additionally need
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` — note these can break third-party
image/data loads, so test the data browsers.

If a feature is unexpectedly blocked, temporarily remove the CSP `add_header`
line, confirm the CSP is the cause in the browser console, then widen the
specific directive rather than disabling the whole policy.

---

## Health, logs & monitoring

- **Container health:** the image has a `HEALTHCHECK` hitting `http://127.0.0.1/`.
  `docker ps` shows `healthy`; `docker inspect --format '{{.State.Health.Status}}' psinmr`.
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f psinmr`
  (nginx access/error) and `… logs -f cloudflared` (tunnel status).
- **BMRB cache hits:** responses from `/bmrb-data/` carry an `X-Cache-Status`
  header (`HIT`/`MISS`/`EXPIRED`) for debugging.
- **Uptime:** with Cloudflare in front, enable a Health Check / notification in
  the Cloudflare dashboard, or point any external monitor at
  <https://psinmr.com>.

---

## Troubleshooting

| Symptom                                             | Cause & fix                                                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Browser downloads `index.html` instead of rendering | A `types { }` block was added to `nginx.conf`, wiping the inherited MIME table. Remove it — the stock `mime.types` already covers everything.                                              |
| Wasm fails to load / "incorrect MIME type"          | `.wasm` not served as `application/wasm`. The config sets `default_type application/wasm` for `.wasm`; check the response `Content-Type`.                                                  |
| Cloudflare error 502/526                            | Origin unreachable or (mode **Full strict** with) an untrusted origin cert. For Tunnel, check `cloudflared` logs; for Option 2, install a Cloudflare Origin Cert or drop to mode **Full**. |
| Self-signed warning on `localhost:8443`             | Expected — the local cert is generated per container. Proceed past the warning, or use the HTTP port.                                                                                      |
| Molecule editor / prediction blank                  | CSP `script-src` too strict — ensure `unsafe-eval` is present (OpenChemLib needs it).                                                                                                      |
| BMRB entries won't open                             | Check `/bmrb-data/` proxy reachability and `cloudflared`/nginx logs; bmrb.io may be slow (timeouts are 10/30/60s). nmrXiv and GitHub loads are unaffected (they go direct).                |
| VPS runs out of memory during `up`                  | You're building on the box. Use the GHCR image (`docker-compose.prod.yml` + `pull`) instead of `--build`.                                                                                  |
| GHCR pull denied                                    | The package is private. Make it Public in GHCR package settings, or `docker login ghcr.io` with a read PAT on the VPS.                                                                     |
