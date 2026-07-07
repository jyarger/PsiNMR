#!/usr/bin/env bash
#
# PsiNMR one-line installer for a fresh Linux server.
#
# Installs Docker (if missing), clones/updates PsiNMR, writes .env, and starts
# the production stack. Idempotent: safe to re-run to update or fix config.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/jyarger/PsiNMR/main/scripts/install.sh | bash -s -- --token <CF_TUNNEL_TOKEN>
#   ./install.sh --tag v0.3.0 --token <CF_TUNNEL_TOKEN>
#   ./install.sh --tag v0.3.0 --compose-file docker-compose.caddy.yml   # self-hosted TLS
#
# Flags:
#   --tag <tag>            Image tag to run (default: latest). Pin a release for reproducibility.
#   --token <token>        Cloudflare Tunnel token (for the default docker-compose.prod.yml).
#   --dir <path>           Install directory (default: ./PsiNMR).
#   --repo <url>           Git remote (default: https://github.com/jyarger/PsiNMR.git).
#   --compose-file <file>  Compose file to run (default: docker-compose.prod.yml).
#   -h, --help             Show this help.
#
set -euo pipefail

REPO="https://github.com/jyarger/PsiNMR.git"
DIR="PsiNMR"
TAG="latest"
TOKEN=""
COMPOSE_FILE="docker-compose.prod.yml"

log() { printf '\033[36m==>\033[0m %s\n' "$*"; }
err() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --tag) TAG="${2:?--tag needs a value}"; shift 2 ;;
    --token) TOKEN="${2:?--token needs a value}"; shift 2 ;;
    --dir) DIR="${2:?--dir needs a value}"; shift 2 ;;
    --repo) REPO="${2:?--repo needs a value}"; shift 2 ;;
    --compose-file) COMPOSE_FILE="${2:?--compose-file needs a value}"; shift 2 ;;
    -h|--help) grep '^#' "$0" | cut -c3-; exit 0 ;;
    *) err "unknown flag: $1 (try --help)" ;;
  esac
done

[ "$(id -u)" -eq 0 ] && SUDO="" || SUDO="sudo"

# 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  log "Docker not found — installing via get.docker.com"
  curl -fsSL https://get.docker.com | $SUDO sh
  if [ -n "${SUDO}" ] && [ -n "${USER:-}" ]; then
    $SUDO usermod -aG docker "$USER" || true
    log "Added $USER to the docker group — log out/in (or run 'newgrp docker') for non-sudo docker."
  fi
else
  log "Docker present: $(docker --version)"
fi

docker compose version >/dev/null 2>&1 || err "Docker Compose v2 plugin not available. Install it and re-run."

# 2. Clone or update the repo (only the compose files + config are needed; the
#    app itself is the prebuilt GHCR image).
if [ -d "$DIR/.git" ]; then
  log "Updating existing checkout in $DIR"
  git -C "$DIR" pull --ff-only
else
  command -v git >/dev/null 2>&1 || { log "Installing git"; $SUDO sh -c 'apt-get update -y && apt-get install -y git || dnf install -y git || yum install -y git'; }
  log "Cloning $REPO into $DIR"
  git clone "$REPO" "$DIR"
fi
cd "$DIR"

[ -f "$COMPOSE_FILE" ] || err "compose file '$COMPOSE_FILE' not found in the repo."

# 3. Configure .env
if [ -n "$TOKEN" ]; then
  # Cloudflare tunnel tokens are base64 JSON: they start with "eyJ", are ~200
  # chars, and contain no spaces. Catch the classic paste mistakes early.
  case "$TOKEN" in
    *' '*) err "the tunnel token contains a space — paste ONLY the eyJ… string after --token, not the whole docker command." ;;
    eyJ*) : ;;
    *) err "the tunnel token should start with 'eyJ' (yours starts '$(printf %.8s "$TOKEN")…'). Copy just the token from Cloudflare's install command." ;;
  esac
  [ "${#TOKEN}" -ge 100 ] || err "the tunnel token looks truncated (${#TOKEN} chars; expected ~200). Re-copy it in full."
fi
if [ ! -f .env ]; then
  cp .env.example .env
  log "Created .env from .env.example"
fi
# Portable in-place sed (GNU vs BSD).
sedi() { sed --version >/dev/null 2>&1 && sed -i "$@" || sed -i '' "$@"; }
sedi "s|^IMAGE_TAG=.*|IMAGE_TAG=${TAG}|" .env
if [ -n "$TOKEN" ]; then
  sedi "s|^TUNNEL_TOKEN=.*|TUNNEL_TOKEN=${TOKEN}|" .env
  log "Set IMAGE_TAG=${TAG} and TUNNEL_TOKEN in .env"
else
  log "Set IMAGE_TAG=${TAG}. No --token given: edit .env before the app is reachable if this compose file needs one."
fi

# 4. Launch (--force-recreate so an edited .env token is always re-applied)
log "Pulling and starting ($COMPOSE_FILE)"
docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" up -d --force-recreate
docker compose -f "$COMPOSE_FILE" ps

# 5. Verify
sleep 5
if curl -sf -o /dev/null http://127.0.0.1:8080; then
  log "App OK: http://127.0.0.1:8080 responds (loopback only)."
else
  log "WARNING: the app did not respond on 127.0.0.1:8080 — check: docker logs psinmr"
fi
if docker ps --format '{{.Names}}' | grep -q '^psinmr-cloudflared$'; then
  if docker logs psinmr-cloudflared 2>&1 | grep -q 'Registered tunnel connection'; then
    log "Tunnel OK: cloudflared registered a connection."
  else
    log "WARNING: cloudflared has not registered a tunnel connection (yet)."
    log "  Check: docker logs psinmr-cloudflared   ('token is not valid' = re-copy the token, then re-run this script)"
  fi
  log "Reminder: the tunnel needs a route (psinmr.com -> HTTP -> psinmr:80) in the Cloudflare dashboard's Routes/Public Hostname tab."
fi
STRAYS=$(docker ps --format '{{.Names}}' | grep -i cloudflared | grep -vx 'psinmr-cloudflared' || true)
if [ -n "$STRAYS" ]; then
  log "WARNING: extra cloudflared container(s) running: $STRAYS"
  log "  These are usually left over from running Cloudflare's 'docker run' wizard snippet."
  log "  They are NOT on the compose network, cannot reach http://psinmr:80, and cause 502s."
  log "  Remove with:  docker rm -f $STRAYS"
fi
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet cloudflared 2>/dev/null; then
  log "WARNING: a host-level cloudflared systemd service is running (Cloudflare's Debian wizard snippet)."
  log "  It auto-starts at every boot, is not on the compose network, and causes intermittent 502s."
  log "  Remove with:  sudo systemctl disable --now cloudflared && sudo cloudflared service uninstall"
fi

log "Done. If using Cloudflare Tunnel, PsiNMR is live at your configured hostname (e.g. https://psinmr.com)."
log "Update later with:  cd $DIR && docker compose -f $COMPOSE_FILE pull && docker compose -f $COMPOSE_FILE up -d"
