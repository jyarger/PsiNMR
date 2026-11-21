# Changelog

All notable changes to PsiNMR are documented here. Dates are ISO-8601.
Work lands under **Unreleased** as it merges and is promoted to a version
heading at tag time.

## Unreleased

- **Mobile web view** at `#/m`: a touch-first, full-screen viewer with mobile
  chrome, a bottom-sheet stub, a tool FAB and an open-file/load-example empty
  state; double-tap resets the view and the plot owns pinch/pan; `?url=` and
  `?theme=` deep links; plus a **PWA manifest** (installable to the home
  screen, start URL `/#/m`).
- **Native client scaffolds** — thin shells that load the hosted web app so
  every web deploy reaches them automatically (`planning/AUTO_UPDATE.md`): a
  **Tauri desktop** shell in `desktop/` with the updater wired and a
  three-OS release workflow (`desktop-v*` tags), and a **Capacitor mobile**
  shell in `mobile/` pointed at `/#/m`.
- **One-line server installer** (`scripts/install.sh`): hardened, idempotent
  bootstrap that fails fast on malformed tunnel tokens, detects stray
  cloudflared connectors (containers or a host systemd unit) and verifies the
  app and tunnel after launch.
- **Deployment hardening** from the first public deploy (psinmr.com live
  2026-07-07): loopback publish (`127.0.0.1:8080`) for on-box verification;
  cloudflared forced to `--protocol http2` for networks that drop QUIC; 502
  causes traced and documented (stray wizard connectors, container and
  systemd variants).
- **DEPLOY.md**: zero-to-live fresh-Linux walkthrough, alternative packaging
  options, exact tunnel-token instructions, layered verification and a
  reboot-test checklist. New planning docs (`planning/DESKTOP_APP.md`,
  `MOBILE_APP.md`, `AUTO_UPDATE.md`) linked from the roadmap and README.
- Peaks and Integrals panels restored in the **NMR spectra assignment**
  workspace (with peak-picking and integration toolbar tools) — they were
  omitted from its panel set while the default workspace always had them.
- Maintenance: nginx base image bumped from the retired 1.27 branch to
  1.30-alpine (current stable).

## 0.3.0 — 2026-07-04

- Solid-state NMR support: the sample library is split into **Liquids** and
  **Solids** with real MAS/CP-MAS datasets; a νr sideband tool with editable
  spin rate and sideband peak classification (isotropic / ±n); a **Solid-state
  NMR (MAS)** readout (rate, CP contact time, pulse sequence); and a
  ν [Hz] / ν [kHz] frequency axis.
- Read arrayed 1D Varian/Agilent `.fid` data (multi-FID) as one spectrum per
  array element; **apply processing to all spectra** (arrayed FT with matching
  parameters); and a **skyline** (VnmrJ `dssh`-style) stacked display mode.
- External-app embedding: a chrome-less `#/embed` route driven over a
  `postMessage` bridge (compatible with the common `nmr-wrapper` protocol),
  with a theme toggle and branding; plus an "Open in Ψ|NMR⟩" link, quick-open
  `?url=` loading, badges, a live embed demo and piping/embedding docs.
- Fix Varian nucleus normalization (⁷⁹Br was read as ⁷⁹Se).
- About dialog: new authorship and attribution; fix a tagline that was
  invisible against the dark dialog.
- Documentation reflects that PsiNMR is now developed independently rather
  than tracking NMRium upstream, while retaining the attribution the MIT
  license requires.

## 0.2.2 — 2026-07-03

- Production hardening and deployment tooling for public launch, with a
  `DEPLOY.md` walkthrough (Cloudflare / VPS / GHCR image pipeline).

## 0.2.1 — 2026-07-03

- Landing hero: the Ψ mark spins, then reveals `|NMR⟩` beside it; the tagline
  and top-bar wordmark use `|NMR⟩` for consistent theming.
- Comprehensive dark-mode sweep of hardcoded white backgrounds.
- BMRB browser, animated Ψ logo, and a restructured **Public NMR Data** panel.
- Dark-themed dialogs, plot labels/axes and filter bars; default plot font 16 pt.

## 0.2.0 — 2026-07-03

- nmrXiv browser: search and open FAIR NMR data entirely client-side.
- Dark theme across panels, chemical structures, the molecule editor, on-plot
  annotations, table bodies and the hover crosshair.
- Teal row highlight; the sample palette follows the active theme.
- v0.1 review feedback: dark theme, internal docs, larger fonts, drop banner,
  CI fixes.

## 0.1.0 — 2026-07-02

- Initial PsiNMR release. Forked from the MIT-licensed NMRium project and
  rebranded to PsiNMR (Ψ), then developed independently from here.
- Rust → WebAssembly compute engine (`psinmr-core`): CONREC contours, FFT,
  baseline correction and peak picking, each with a JavaScript fallback and a
  live engine-status indicator.
- Data hub: drag-and-drop files/zips plus public folder / GitHub repo URL
  scanning; bundled examples presented as a **Sample library**.
- Multi-stage Docker build → nginx (correct `application/wasm` MIME, gzip,
  immutable asset caching, SPA routing).
- Low-eye-strain palette and Inter typography exposed through CSS variables.
