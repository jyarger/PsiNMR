# PsiNMR / Psi platform roadmap

PsiNMR is the first application of a broader **Psi** platform: a shared shell
for uploading, processing, analyzing and visualizing complex scientific data,
specialized per technique. This document tracks the intended evolution.

## v1 — Stateless PsiNMR ✅ (current)

A self-contained, Docker-deployable web app for NMR. No accounts, no
server-side state.

- [x] PsiNMR (Ψ) identity: favicon, logo and About dialog.
- [x] New app shell: top bar with **INTERACTIVE NMR** action and a **Tools**
      menu (Predict, Simulate). Features / Pricing / Teaching and all
      "Request a license" affordances removed.
- [x] Low-eye-strain palette + Inter typography via CSS variables.
- [x] Data hub: drag-and-drop files/zips + scan a public folder/GitHub repo
      URL. Bundled samples reframed as a "Sample library"; no "Demo".
- [x] Rust → WebAssembly compute engine (`psinmr-core`) for CONREC contours,
      FFT, baseline correction and peak picking, with JS fallback and a live
      engine-status indicator.
- [x] Multi-stage Docker build → nginx (wasm MIME, gzip, immutable caching,
      SPA routing).

### v1.x — hardening (next)

- [ ] Move Wasm calls into a Web Worker so large transforms never block the
      main thread; stream contour segments back incrementally.
- [ ] Route more of the processing pipeline through `psinmr-core`: apodization,
      zero-filling, phase correction, and the 1D FT path (not just 2D
      contours), each behind the same JS-fallback pattern.
- [ ] Expand remote scanning: Zenodo / figshare records, S3-style public
      buckets, and recursive zip expansion in the browser.
- [ ] Persist the current session's added datasets to IndexedDB so a reload
      doesn't lose them (still fully client-side).
- [ ] Bundle-size work: the vendor chunks are large; split and lazy-load the
      2D/prediction paths.

### Expanded vendor formats (investigated 2026-07)

`@zakodium/nmrium-core` exposes a first-class extension point for this:
`core.registerPlugin({ supportedExtensions, onFile })` hooks new parsers
into `processFileCollection` without forking `nmr-load-save`. Plan, in
order of value:

- [ ] **Magritek Spinsolve `.1d` / `.2d` binaries** — port the reader from
      nmrglue's `fileio/spinsolve.py` (BSD-3, attribution required) to
      TypeScript and register it as a plugin. The formats are simple
      header + float32 arrays; the main work is acquiring reference data
      to validate against (`acqu.par` + `data.1d`).
- [ ] **Varian/Agilent 2D `.fid` folders** — open item (deferred). Single-FID
      and _arrayed 1D_ Varian now load (see the ssNMR section); true 2D still
      needs the interleaved block structure + hypercomplex/States handling,
      which is genuinely harder and distinct from the arrayed-1D splitter.
      Blocked on acquiring liquids (COSY/HSQC) and solids 2D test datasets;
      nmrglue `fileio/varian.py` is the reference implementation.
- [ ] Longer term, nmrglue's fileio module list (Pipe, Sparky, RNMRTK,
      SIMPSON, …) is the menu to port from. nmrglue itself is Python and
      cannot run directly in the stateless browser app (Pyodide would add
      ~30 MB+ runtime); for the Pro server, running nmrglue natively
      server-side is a reasonable complement to TS ports.

### nmrXiv integration ✅ (shipped 2026-07)

The data panel's **Browse nmrXiv** opens a searchable catalog of the
FAIR repository's ~2000 public samples (client-only: the nmrXiv API and
its S3 archives are CORS-open). Selecting a sample streams its spectra
zip into the standard web-source loading path. Possible follow-ups:
project-level browsing, dataset-level filtering, and download-size
hints if the API ever exposes them.

### Solid-state NMR (ssNMR) — first-class solid-state support

Browser-based NMR tools have historically centered on liquid-state work; a
core goal of PsiNMR is to make solid-state NMR (and, later, other
magnetic-resonance techniques) first-class.

Shipped (2026-07):

- [x] Sample library reorganized into **Liquids / Solids**; 16 real MAS/CP-MAS
      datasets (Varian `.fid` + a Bruker probe-setup archive) under Solids.
- [x] **νr sideband tool** — on-plot guides at δiso ± n·νr; the recorded MAS
      rate is often stale, so νr is editable to _measure_ the true rate.
- [x] **Sideband peak classification** — picked peaks tagged iso / ±n.
- [x] **ν [Hz] / ν [kHz]** frequency axis; **Solid-state NMR (MAS)** readout in
      the Information panel (rate, CP contact time, pulse sequence).
- [x] Fixed the Varian `Br79` → `79Se` nucleus-normalization bug.
- [x] **Arrayed 1D Varian/Agilent `.fid`** (multi-FID) — split into one
      spectrum per array element, labelled by the arrayed parameter value.
- [x] **Apply processing to all spectra** — replay the active spectrum's
      pipeline onto the whole array (identical FT/apodization/phase).
- [x] **Skyline display** — a VnmrJ `dssh`-style diagonal stacked mode
      (overlay → vertical stack → skyline via the stack toolbar button).

Planned:

- [ ] **Multi-site sideband classification** — the current tool anchors on a
      single δiso; auto-detect multiple isotropic sites and their manifolds.
- [ ] MAS-rate–aware processing helpers (sideband suppression bookkeeping,
      spinning-frequency annotation on export).

#### ssNMR simulation via MRSimulator + WebAssembly (planning)

For advanced simulation the app currently links out to
[MRSimulator](https://github.com/deepanshs/mrsimulator), SIMPSON and Spinach
(Solids → Simulation). The current liquid-oriented simulation component is not
suited to MAS/CSA/quadrupolar lineshapes, so in-app ssNMR simulation is a
deliberate future item — and a strong fit for the existing Rust→Wasm engine:
running it **client-side keeps the stateless Lite model**, and low latency
matters because simulation is interactive (drag a parameter, re-render the
lineshape). MRSimulator is BSD-3, so no licensing blocker.

The open decision — resolve with a short feasibility spike, not now:

- **Path A — port MRSimulator's C core** (`src/c_lib`) with Emscripten and
  reimplement its thin Python "Method" orchestration in TS. Inherits its
  validated breadth (CSA, central/satellite quadrupolar, MAS/static); risk is
  its numerical deps (an FFT — already have one — and possibly BLAS-like
  routines) and rebuilding the orchestration layer.
- **Path B — Rust-native lineshape kernel** matching the existing engine.
  Architecturally consistent, smaller, full control; cost is owning the
  physics + validation. For the common 80% (1D static/MAS CSA + quadrupolar
  powder patterns) this is well-bounded and may be _less_ total effort.
- Pyodide + an MRSimulator wheel is a fast prototype but a heavy product
  (~6–15 MB runtime + numpy, slow cold start) — undercuts the latency/size win.

Phasing: (1) spike — try `emcc` on MRSimulator's `c_lib` to gauge how
self-contained it is; check for an existing emscripten/Pyodide wheel.
(2) Decide A vs B on what the spike finds. (3) Prototype one method
(`BlochDecaySpectrum` / central-transition MAS) behind the engine bridge,
validated numerically against MRSimulator's reference output. (4) Expand
methods/interactions; keep the external-tool links as the escape hatch.

### Native clients — desktop & mobile (planning)

Two planning documents scope PsiNMR beyond the browser tab, both reusing the
existing static app + Rust/Wasm core rather than rewriting the UI:

- **[planning/DESKTOP_APP.md](planning/DESKTOP_APP.md)** — a standalone,
  installable desktop app (Linux/macOS/Windows) via **Tauri**, distributed
  through Homebrew / winget / Flathub. Unlocks native folder access, `.nmrium`
  file associations and true offline use for instrument PCs. Verdict:
  high-viability "wrap and sign"; the recurring cost is code-signing, not
  engineering.
- **[planning/MOBILE_APP.md](planning/MOBILE_APP.md)** — a touch-first mobile
  web view (PWA) as a second UI component, then a **Capacitor**-wrapped iOS and
  Android app reusing that same view. Verdict: viable and high-impact, but a
  genuine interaction-design project (every desktop gesture is overloaded);
  ship the PWA first, wrap for the stores second.

## v2 — PsiNMR Pro (accounts + data library)

Adds an optional backend so users can keep a durable, private library of NMR
data with richer interactivity over time.

- [ ] Auth (email + OAuth) and per-user workspaces.
- [ ] Upload NMR datasets to object storage; metadata + processing state in a
      database. The stateless client remains the default; Pro is additive.
- [ ] Standardized store / recall: versioned processing recipes, saved views,
      annotations, and comparison across a user's own spectra.
- [ ] Server-side heavy compute for very large datasets, reusing the same
      Rust core compiled natively (not just Wasm) so results match the client.
- [ ] Sharing: read-only links and team libraries.

Suggested stack (keeps the door open for the Psi platform): a small API
(FastAPI or Axum) + Postgres + object storage, with the React app talking to
it only when a user is signed in.

## v3 — The Psi platform (multi-technique)

Generalize the shell so each scientific-data technique is a thin app over
shared infrastructure. The data hub, theming, auth, storage and the
Rust compute host are common; each technique contributes its parsers,
processing kernels and plot types.

Planned members:

| App          | Technique                         |
| ------------ | --------------------------------- |
| **PsiNMR**   | Nuclear magnetic resonance        |
| **PsiXRD**   | X-ray diffraction                 |
| **PsiDSC**   | Differential scanning calorimetry |
| **PsiRaman** | Raman spectroscopy                |
| **PsiIR**    | FT-IR                             |
| **PsiMS**    | Mass spectrometry                 |
| **PsiUV**    | UV-Vis                            |

Architectural notes for getting there:

- The theme is already variable-driven (`src/demo/psinmr/theme.css`) and the
  chrome (TopBar, DataPanel, engine status) is technique-agnostic — these are
  the seeds of a shared `@psi/shell` package.
- `psinmr-core` becomes `psi-core` with per-technique feature modules (e.g. a
  `xrd` module for Rietveld/peak-fit, a `thermal` module for DSC integration),
  all exposed through one Wasm bridge with the same JS-fallback contract.
- The data-source resolvers (files, GitHub, directory listings) are not
  NMR-specific; only the recognised file extensions differ per technique.
