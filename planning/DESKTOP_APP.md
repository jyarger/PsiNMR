# Planning: standalone installable PsiNMR (Linux / macOS / Windows)

**Status:** scaffolded — a Tauri project is in [`../desktop/`](../desktop/)
(thin-client + auto-update wired), not yet built into installers. See
[AUTO_UPDATE.md](AUTO_UPDATE.md) for how updates reach it automatically.
**Goal:** a downloadable, installable desktop PsiNMR — double-click to launch,
works offline, installs via each platform's standard package manager.
**TL;DR:** Highly viable. Wrap the existing static app in **Tauri** (Rust +
the OS's native webview). PsiNMR already ships a Rust core, so Tauri is a
natural fit — small bundles, cross-platform, one CI job builds all three OSes.
The real cost is **code-signing/notarization**, not engineering.

---

## Why a standalone app at all

The web app is the primary product and already runs offline-capable in a
browser. A desktop build adds things a browser tab cannot do well:

- **Native filesystem access** — open a Bruker/Varian **folder** or a 20 GB
  dataset directly, with no upload, no drag-drop-into-tab, no browser sandbox
  size limits. This is the single biggest win for real lab data.
- **File associations** — double-click a `.nmrium` (or a vendor zip) in the OS
  file manager and it opens in PsiNMR.
- **True offline** — no server, no internet, no `psinmr.com`. Good for
  air-gapped instrument PCs (common in NMR facilities).
- **Native Rust compute** — the same `psinmr-core` crate can be called
  in-process (not through Wasm), lifting the browser's memory/threading limits
  for very large 2D transforms.
- **A trustable install** — an IT-managed lab can deploy a signed `.msi`/`.pkg`
  via its normal software channel.

---

## Recommended approach: Tauri

| Framework     | Bundle size | Runtime                                       | Rust reuse                 | Verdict                                                                   |
| ------------- | ----------- | --------------------------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| **Tauri 2**   | ~3–10 MB    | OS webview (WebView2 / WKWebView / WebKitGTK) | **First-class**            | ✅ Recommended                                                            |
| Electron      | ~90–150 MB  | Bundled Chromium                              | via native addon (awkward) | Heavier; only if a webview quirk blocks Tauri                             |
| PWA "install" | 0 (browser) | Browser                                       | n/a                        | Cheapest, but not a package-manager install and no native FS/associations |
| Wails (Go)    | small       | OS webview                                    | none (Go)                  | No — we have no Go and would lose Rust reuse                              |

Tauri wins because (1) the frontend is **already a static bundle** — Tauri just
points at `build/`; (2) the compute crate is **already Rust**, so Tauri's Rust
backend can expose it over `invoke()` and skip Wasm entirely on desktop; (3)
bundles are an order of magnitude smaller than Electron; (4) `tauri-action`
builds/signs Linux, macOS and Windows in one GitHub Actions matrix.

The one caveat: Tauri uses the **OS webview**, so rendering is Safari/WebKit on
macOS and WebView2 (Chromium) on Windows. PsiNMR's SVG-heavy plotting must be
smoke-tested on WKWebView in particular. Low risk (it's a modern engine) but
must be on the test matrix.

---

## Architecture

```
┌───────────────────────────────────────────────┐
│  Tauri shell (Rust)                            │
│   • window + native menus + file dialogs       │
│   • file-association handler (.nmrium, zips)    │
│   • invoke() commands → psinmr-core (native)    │
│  ┌──────────────────────────────────────────┐  │
│  │  OS webview → the existing PsiNMR SPA      │  │
│  │  (unchanged build/ output)                 │  │
│  └──────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

- **Reuse, don't fork.** The web build is the same artifact; desktop-only code
  lives behind a capability check (`if (window.__TAURI__) …`) so the browser
  build is unaffected.
- **Filesystem bridge.** A thin `desktopFs` adapter feeds native file/folder
  reads into the existing `FileCollection` loader — the parser layer doesn't
  change.
- **Compute.** Phase 1 keeps the Wasm engine as-is inside the webview (zero new
  work). Phase 2 optionally routes heavy kernels to native `psinmr-core` via
  `invoke()` behind the same JS-fallback contract the app already uses.

---

## Distribution / package managers

Tauri emits the native installers; the table is what each platform's users
expect. Everything below is achievable from a single tagged CI run.

| OS          | Tauri output                | Package-manager channels                                                                     |
| ----------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| **Linux**   | `.deb`, `.rpm`, `.AppImage` | AppImage (portable), `apt`/`dnf` repo, **Flathub** (Flatpak), Snap Store, AUR (`psinmr-bin`) |
| **macOS**   | `.dmg`, `.app`              | **Homebrew Cask** (`brew install --cask psinmr`), direct `.dmg`, optionally Mac App Store    |
| **Windows** | `.msi`, NSIS `.exe`         | **winget** (`winget install PsiNMR`), Chocolatey, optionally Microsoft Store                 |

Best "standard package manager" reach for the least effort: **Homebrew Cask +
winget + Flathub/AppImage** — all community-friendly, no store review, no per-
seat fees. Store listings (Mac App Store / Microsoft Store) are optional polish.

---

## The real cost: signing & notarization

Engineering is modest; **trust plumbing** is the actual work and the only
recurring cost:

| Platform | Requirement                           | Cost       | Notes                                                                                                                                  |
| -------- | ------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| macOS    | Apple Developer ID + **notarization** | **$99/yr** | Without it, Gatekeeper blocks the app ("unidentified developer"). Non-negotiable for a good UX. Tauri automates stapling.              |
| Windows  | Authenticode code-signing cert        | ~$0–400/yr | Unsigned `.exe` triggers SmartScreen warnings. **Azure Trusted Signing** is now cheap/near-free for eligible orgs; OV certs otherwise. |
| Linux    | none required                         | $0         | AppImage/Flatpak need no signing; a Flathub listing is just a manifest PR.                                                             |

An unsigned build still works for developers and Linux users; signing is what
makes it painless for everyone else. Universities can often issue the Apple/MS
certs through their developer programs.

---

## Effort & phasing

Rough estimates for someone comfortable with the stack (not calendar time):

| Phase                             | Scope                                                                                                                                                               | Effort                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **0 — Spike**                     | `tauri init`, point at `build/`, launch the app, smoke-test SVG plotting on WKWebView + WebView2                                                                    | ~0.5–1 day                          |
| **1 — MVP app**                   | Native window/menus, open file **and folder** dialogs → existing loader, `.nmrium` file association, `tauri-action` CI producing unsigned installers for all 3 OSes | ~3–5 days                           |
| **2 — Signed releases**           | Apple notarization + Windows signing in CI; `.dmg`/`.msi`/AppImage attached to GitHub Releases; auto-update via Tauri updater                                       | ~2–4 days (mostly cert/CI plumbing) |
| **3 — Native compute (optional)** | Route FFT/CONREC/baseline to in-process `psinmr-core` via `invoke()`, behind the JS-fallback flag                                                                   | ~3–6 days                           |
| **4 — Package-manager listings**  | Homebrew Cask + winget manifests (both auto-updatable from release assets); Flathub submission                                                                      | ~2–3 days + review latency          |

**Total to a signed, installable, auto-updating app across all three OSes:
~2–3 focused weeks**, most of it one-time signing/CI setup. Phases 3–4 are
incremental and can trail the first release.

---

## Viability verdict

**Green light, high confidence.** The app is already a self-contained static
bundle with a Rust core, which is the ideal starting point for Tauri — this is
"wrap and sign," not "rewrite." No blocking technical risk; the WKWebView
render check is the only thing to validate early (Phase 0). The recurring cost
is the **$99/yr Apple account** (and optionally a Windows cert), which a lab or
university can usually absorb.

**Suggested trigger:** build Phase 0–1 opportunistically (it's cheap and a great
demo), but only invest in Phases 2+ once there's a concrete user asking to run
PsiNMR offline on an instrument PC — exactly the audience this unlocks.

---

## Open questions

- Ship the Rust core as **native** on desktop (Phase 3) or keep Wasm everywhere
  for one code path? Recommendation: keep Wasm for the MVP; measure before
  adding a native path.
- Bundle the **BMRB proxy** need? On desktop there's no same-origin constraint,
  so the Rust backend can proxy BMRB directly (or fetch server-side) — simpler
  than the nginx `/bmrb-data/` shim.
- Auto-update channel: GitHub Releases as the update feed (Tauri supports this
  natively) vs. a self-hosted endpoint.

See also [MOBILE_APP.md](MOBILE_APP.md) for the phone/tablet path, which shares
the "reuse the web core, add a native shell" strategy (Capacitor there, Tauri
here).
