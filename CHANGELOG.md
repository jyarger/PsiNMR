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
- **Raw FID data always loads.** Importing a dataset that contains an
  already-processed spectrum now also loads the raw FID (1D `fid` and 2D
  `ser`), and a FID with a processed twin stays **time-domain** — click it to
  display the raw decay and process it interactively (window functions, zero
  filling, FT). FID-only imports keep today's auto-processing. Browsers with
  previously saved import settings are migrated once from the old
  prefer-processed default.
- **Processing panel actions and preferences.** The Processing panel header
  now has Apodization, Zero-filling and Fourier-transform buttons: for 1D they
  open the existing filter forms inline (live preview included) or apply the
  FT directly; for 2D each button is a per-dimension menu, and the FT menu
  adds a one-click **Full 2D FT (both dimensions)**. Buttons grey out with an
  explanatory tooltip when the active spectrum has no raw time-domain data,
  and a gear opens panel preferences (auto-processing on load, which data to
  load on import). The FT reducer actions now refuse to transform a dimension
  that is already frequency-domain, so a double FT cannot corrupt a spectrum.
- **Extract 1D FIDs from 2D raw data.** A new button in the 2D Processing
  panel extracts a direct-dimension trace of a raw `ser` as a standalone
  complex 1D FID (first increment, or the complex sum of all increments).
  The extracted spectrum lands in the 1D tab of its nucleus, carries the
  Bruker digital-filter (group-delay) correction so an interactive FT phases
  correctly, and the full 1D suite (window functions, zero filling, FT,
  phasing) applies to it. Indirect-dimension (t1 interferogram) extraction
  is deferred until it can be done right — it needs acquisition-scheme-aware
  recombination (States / TPPI / echo-antiecho) and a true t1 time axis.
- Kept-raw FIDs (the twins from "raw FID data always loads") now retain the
  loader's queued digital-filter correction instead of dropping it, so their
  interactive FT no longer carries a first-order phase roll from the group
  delay.
- Fixed two 2D processing bugs this surfaced: the dimension-1 and dimension-2
  apodization option headers had **swapped defaults** (opening "Apodization
  dimension 2" live-previewed and applied dimension 1 — upstream copy-paste
  bug), and the dimension-2 apodization/zero-filling tools could never enable
  because their visibility rules required `isFid`, which the dimension-1 FT
  clears.
- Peaks and Integrals panels restored in the **NMR spectra assignment**
  workspace (with peak-picking and integration toolbar tools) — they were
  omitted from its panel set while the default workspace always had them.
- Maintenance: nginx base image bumped from the retired 1.27 branch to
  1.30-alpine (current stable); e2e CI pinned to ubuntu-24.04 runners
  (Playwright 1.57 does not support the new ubuntu-latest 26.04 image); the
  fast-moving `nmr-processing` / `@zakodium/nmrium-core*` / `nmr-types`
  dependencies pinned to their tested versions — upstream `nmr-processing`
  22.28 dropped the `checkIntegralKind` export within the same major, which
  broke fresh installs of the published package.

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
