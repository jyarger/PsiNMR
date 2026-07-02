#!/bin/sh
# Generates a self-signed TLS certificate for local HTTPS review if one
# does not already exist. Runs automatically via the nginx image's
# /docker-entrypoint.d/ hook before nginx starts. Each container gets its
# own throwaway key; nothing is baked into the image.
set -e

CERT_DIR=/etc/nginx/ssl
CRT=$CERT_DIR/psinmr.crt
KEY=$CERT_DIR/psinmr.key

if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    -keyout "$KEY" -out "$CRT" >/dev/null 2>&1
  echo "PsiNMR: generated self-signed TLS certificate for localhost"
fi
