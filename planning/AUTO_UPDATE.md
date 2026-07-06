# Auto-update architecture: one web app, many shells

**Requirement:** new features, fixes, and eventually the **Pro** version must
reach the desktop and mobile apps **automatically**, without users reinstalling
and without us rebuilding/resubmitting a binary for every change.

**Decision:** the desktop (Tauri) and mobile (Capacitor) apps are **thin native
shells that load the hosted web app** (`https://psinmr.com`), not bundled copies
of the frontend. The web app is the single source of truth; the shells add only
the native capabilities a browser can't.

```
                        ┌──────────────────────────────┐
                        │   psinmr.com  (the web app)    │  ← deploy once
                        │   static SPA + Wasm core       │
                        │   (+ Pro backend, later)       │
                        └───────┬───────────┬────────────┘
                    loads URL   │           │   loads URL (#/m)
                 ┌──────────────▼──┐   ┌────▼───────────────┐
                 │ Tauri desktop   │   │ Capacitor mobile    │
                 │ shell (macOS/   │   │ shell (iOS/Android) │
                 │ Win/Linux)      │   │                     │
                 └─────────────────┘   └─────────────────────┘
```

## What updates automatically vs. what needs a build

| Change                                                     | Web (psinmr.com) | Desktop app               | Mobile app             |
| ---------------------------------------------------------- | ---------------- | ------------------------- | ---------------------- |
| Frontend feature / fix                                     | deploy           | **auto** (next launch)    | **auto** (next launch) |
| New parser, processing, Wasm kernel                        | deploy           | **auto**                  | **auto**               |
| **Pro** accounts / backend / data library                  | deploy web + API | **auto** (same app + API) | **auto**               |
| Native capability (file assoc., share, menus, permissions) | n/a              | rebuild + updater         | rebuild + store submit |

So ~all product work ships through the normal web deploy pipeline
([DEPLOY.md](../DEPLOY.md)) and reaches every client for free. Native rebuilds
are rare and cover only the shell itself.

## How each shell is wired

- **Desktop (Tauri):** `app.windows[].url = "https://psinmr.com/"` in
  [`desktop/src-tauri/tauri.conf.json`](../desktop/src-tauri/tauri.conf.json).
  The shell binary itself updates via the **Tauri updater** (GitHub Releases
  feed), triggered by a `desktop-vX.Y.Z` tag → `desktop-release.yml`.
- **Mobile (Capacitor):** `server.url = "https://psinmr.com/#/m"` in
  [`mobile/capacitor.config.ts`](../mobile/capacitor.config.ts). The shell
  updates through the App Store / Play Store only when native code changes.

## How Pro rides along

Pro is a web + backend feature (auth, per-user storage). Because the shells load
the same web app, Pro appears in them the moment it ships on the web — no client
work. Two things to handle when Pro lands:

1. **Sessions/cookies** — both Tauri and Capacitor persist cookies/localStorage,
   so logged-in state survives. ✅ works by default.
2. **OAuth/SSO redirects** — use a deep link (custom scheme /
   universal link) + the platform's in-app browser so the OAuth round-trip
   returns to the app. This is the one native touch-point Pro will need; noted
   here so it isn't a surprise.

## Trade-offs (accepted, with mitigations)

- **Requires connectivity.** Remote content means no offline by default. Each
  shell ships a minimal offline fallback page today; **bundling the app for true
  offline** is a planned enhancement (desktop Phase 3) that layers on top
  without changing this model.
- **App Store guideline 4.2.** A pure webview can be rejected as "minimum
  functionality." Mitigation (already planned): the mobile shell adds native
  **file open** and **share** — real native value beyond a browser tab.
- **Version skew.** Since clients always load latest, a bad web deploy hits
  everyone at once — same risk as the website itself. Mitigation: the existing
  CI gates + pinned-image rollback ([DEPLOY.md](../DEPLOY.md)).

## Alternative considered: bundle + push updates

Bundling the frontend inside each app and shipping new bundles via an
OTA/updater (Tauri updater for the web assets; Capacitor Live Updates for
mobile) also achieves auto-update, and enables offline. But it reships the whole
frontend on every change, adds an update-download step, and — critically — would
**not** automatically deliver a server-backed Pro experience. The thin-client
model is simpler and satisfies the requirement directly; a bundled-offline mode
can be added later for the subset of users who need it.

See [DESKTOP_APP.md](DESKTOP_APP.md) and [MOBILE_APP.md](MOBILE_APP.md) for the
per-platform detail, and [`desktop/`](../desktop/) / [`mobile/`](../mobile/) for
the scaffolds.
