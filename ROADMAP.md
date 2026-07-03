# PsiNMR / Psi platform roadmap

PsiNMR is the first application of a broader **Psi** platform: a shared shell
for uploading, processing, analyzing and visualizing complex scientific data,
specialized per technique. This document tracks the intended evolution.

## v1 — Stateless PsiNMR ✅ (current)

A rebrand and modernization of NMRium into a self-contained, Docker-deployable
web app. No accounts, no server-side state.

- [x] Rebrand NMRium → PsiNMR (Ψ), new favicon/logo/About.
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
- [ ] **Varian/Agilent 2D `.fid` folders** — extend beyond the current 1D
      support: parse `procpar` array dimensions and the interleaved 2D
      block structure (nmrglue `fileio/varian.py` is the reference
      implementation).
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
