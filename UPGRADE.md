# Upgrading psinmr.com (or any PsiNMR deployment)

How to move a live PsiNMR server to the latest release, verify what is
running, and roll back if needed. The production stack is described in
[DEPLOY.md](DEPLOY.md): the VPS runs a **prebuilt image pulled from the
GitHub Container Registry** (`ghcr.io/jyarger/psinmr`) via
`docker-compose.prod.yml`, behind a Cloudflare Tunnel. Upgrading never
builds anything on the server — it is a pull + restart.

## TL;DR

```bash
ssh <user>@<vps>
cd ~/PsiNMR                       # the directory cloned during install
nano .env                         # set IMAGE_TAG=<new release>, e.g. 0.4.0
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
curl -s https://psinmr.com/version.json   # confirm the new version is live
```

The Cloudflare tunnel container is untouched by this; only the app
container is replaced. Total downtime is the container swap (seconds).

## 1. Check what is currently running

Three independent ways, most convenient first:

1. **From anywhere:**

   ```bash
   curl -s https://psinmr.com/version.json
   ```

   Returns the version, the exact git commit the image was built from, and
   the build time. (If this returns HTML instead of JSON, the deployment
   predates v0.4.0 — the endpoint ships from v0.4.0 on.)

2. **In the browser:** open <https://psinmr.com>, enter the NMR view, and
   click the **Ψ** button at the top of the left toolbar. The About dialog
   shows the version (linked to its GitHub tag) and the build commit. The
   in-app docs also have an **About PsiNMR** page describing this.

3. **On the VPS:**

   ```bash
   docker inspect psinmr --format '{{ .Config.Image }}'   # tag being run
   docker images ghcr.io/jyarger/psinmr                   # what is pulled
   grep IMAGE_TAG ~/PsiNMR/.env
   ```

Compare against the newest release at
<https://github.com/jyarger/PsiNMR/releases>.

## 2. Image tags — read this once

Every push to `main` and every release tag triggers
`.github/workflows/docker-publish.yml`, which publishes
`ghcr.io/jyarger/psinmr` with these tags:

| Tag           | Meaning                                                       |
| ------------- | ------------------------------------------------------------- |
| `0.4.0`       | Exact release (from git tag `v0.4.0` — **no leading `v`**)    |
| `0.4`         | Latest patch of the 0.4 series                                |
| `latest`      | The newest **release** (only moves when a version tag is cut) |
| `main`        | Tip of the main branch (moves on every merge — not for prod)  |
| `sha-ae584ba` | The build of one exact commit (forensics / precise rollback)  |

> ⚠️ The GitHub **release tag** is `v0.4.0`, but the **image tag** is
> `0.4.0`. `IMAGE_TAG=v0.4.0` fails with _manifest unknown_.
> (`scripts/install.sh --tag v0.4.0` tolerates and strips the `v`.)

**Recommendation for psinmr.com:** pin `IMAGE_TAG` to an exact release
(`0.4.0`). Pinning makes the running version explicit, survives accidental
`pull`s, and makes rollback a one-line edit. `latest` also only ever moves
on releases, but it hides _which_ release you are on.

## 3. Standard upgrade

On the VPS, in the clone directory (default `~/PsiNMR`):

```bash
cd ~/PsiNMR
nano .env            # IMAGE_TAG=0.4.0   (or leave latest)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

`up -d` recreates only the app container (the compose file's `cloudflared`
service and its token are unchanged). If `IMAGE_TAG=latest`, the `pull` is
what fetches the new release; the `up -d` is still required to restart onto
the new image.

**If the release notes mention changes to the deployment files themselves**
(`docker-compose.prod.yml`, `docker/`, `.env.example`, `scripts/`), refresh
the clone first — the app lives in the image, but compose/nginx/tunnel
config lives in the repo:

```bash
git -C ~/PsiNMR pull
```

## 4. Verify

```bash
# 1. Container healthy?
docker compose -f docker-compose.prod.yml ps        # psinmr: Up (healthy)

# 2. App answering locally (loopback-only publish)?
curl -sI http://127.0.0.1:8080 | head -1            # HTTP/1.1 200 OK

# 3. Correct version on the loopback...
curl -s http://127.0.0.1:8080/version.json

# 4. ...and on the public site (through the tunnel)?
curl -s https://psinmr.com/version.json
```

If (3) shows the new version but (4) still shows the old one, it is
Cloudflare's edge cache — the file is served `Cache-Control: no-cache`, so
this should not persist; a dashboard **Caching → Purge** clears it.
Browsers may need a hard reload (the app's HTML is no-cache, hashed assets
are immutable, so a plain reload normally suffices).

## 5. Rollback

Releases are just tags, so rolling back is pinning the previous one:

```bash
cd ~/PsiNMR
nano .env            # IMAGE_TAG=0.3.0  (the version you were on)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
curl -s http://127.0.0.1:8080/version.json
```

All application state lives in the visitor's browser (PsiNMR is stateless —
no server-side data), so rolling the image back cannot lose user data.
`sha-<commit>` tags allow rolling to any individual commit if a release tag
is ever suspect.

## 6. Cutting a new release (maintainer checklist)

What has to happen in the repo so that an upgrade exists to deploy:

1. All changes merged to `main`, CI green.
2. Bump the version and promote the changelog:

   ```bash
   # in package.json: "version": "0.4.0" (also syncs package-lock.json)
   npm version 0.4.0 --no-git-tag-version
   # CHANGELOG.md: rename "Unreleased" to "0.4.0 — YYYY-MM-DD"
   git commit -am "Release v0.4.0"
   git tag v0.4.0
   git push origin main v0.4.0
   ```

   The `package.json` version is what the About dialog and `/version.json`
   report, so the bump must be in the tagged commit.

3. The tag push triggers **Build and publish image**, which pushes
   `0.4.0`, `0.4`, `latest`, and `sha-<commit>` to GHCR (watch it under
   GitHub → Actions).
4. Create the GitHub release from the tag, pasting the changelog section.
5. Upgrade the VPS (section 3) and verify (section 4).

## Troubleshooting

| Symptom                                  | Cause / fix                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `manifest unknown` on pull               | `IMAGE_TAG` has a leading `v` (use `0.4.0`), or the tag's CI run hasn't finished |
| `pull` says image is up to date          | `IMAGE_TAG` is pinned to the old version — edit `.env`                           |
| Site up but old version after upgrade    | `up -d` not run after `pull`, or browser cache — hard reload / check §4          |
| `psinmr` container unhealthy after swap  | `docker logs psinmr`; roll back (section 5) while investigating                  |
| 502 from psinmr.com but loopback curl OK | Tunnel issue, not the upgrade — see DEPLOY.md → Troubleshooting                  |

Anything deeper (tunnel, TLS, fresh installs): [DEPLOY.md](DEPLOY.md).
