# PsiNMR desktop (Tauri)

A standalone, installable PsiNMR for **macOS, Linux and Windows**, built with
[Tauri](https://tauri.app) (Rust + the OS's native webview). See
[../planning/DESKTOP_APP.md](../planning/DESKTOP_APP.md) for the rationale and
the fuller plan.

## The key design: a thin client that auto-updates

This shell is deliberately thin. The main window **loads the hosted web app**
(`https://psinmr.com`, set in [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json)
→ `app.windows[].url`), rather than bundling a copy of the frontend.

Consequences — exactly what we want:

- **Web updates ship instantly.** Every deploy of the web app (features, fixes)
  is live in the desktop app on next launch, with **no rebuild and no
  reinstall**.
- **Pro rides along for free.** When the Pro backend/login lands in the web app,
  the desktop app gets it automatically — it's the same app, and Tauri persists
  cookies/localStorage, so sessions work.
- **Only the native shell is versioned here**, and it self-updates via the
  **Tauri updater** (GitHub Releases feed) — needed only when native
  capabilities change (file associations, menus), which is rare.

Offline note: because content is remote, the app currently needs a connection
(a minimal offline page in [`dist/`](dist/index.html) shows otherwise). Bundling
the app for true offline use is a planned enhancement (Phase 3 in the plan) and
would layer on top of this.

## Develop

Requires Rust + Node, and the platform webview libs (macOS/Windows have them
built in; Linux needs `libwebkit2gtk-4.1-dev` etc. — see the CI workflow).

```bash
cd desktop
npm install
npm run tauri icon ../public/favicon.svg   # one-time: generate app icons
npm run dev                                 # launches the app pointed at psinmr.com
# point at a local web dev server instead by editing app.windows[].url
```

## Release

Tag `desktop-vX.Y.Z` (kept separate from the web `vX.Y.Z` image tag). The
[`desktop-release.yml`](../.github/workflows/desktop-release.yml) workflow
builds installers (`.dmg` / `.AppImage`+`.deb` / `.msi`) for all three OSes via
`tauri-action` and attaches them to a draft GitHub Release.

To enable **auto-update** and **signing**, set these repo secrets and replace
`plugins.updater.pubkey` in `tauri.conf.json`:

- `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — generate
  with `npm run tauri signer generate`; paste the printed **public** key into
  `tauri.conf.json`.
- macOS notarization: `APPLE_*` secrets (Developer ID, ~$99/yr).
- Windows: an Authenticode cert (or Azure Trusted Signing).

> This directory is a scaffold. Before the first build, run `npm install` and
> validate against the current Tauri 2 docs (`npx tauri info`); config keys can
> shift between Tauri minor versions.
