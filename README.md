<div align="center">

# Ψ PsiNMR

**Process, analyze and visualize NMR spectra in your browser.**

PsiNMR is a modernized, Docker-deployable web application for 1D & 2D NMR,
built on the open-source [NMRium](https://github.com/cheminfo/nmrium) engine
with heavy numerical work offloaded to a Rust → WebAssembly compute core.

</div>

---

## Highlights

- **Hybrid compute architecture** — the TypeScript/React frontend stays, but
  the expensive kernels (2D contour generation, FFT, baseline correction,
  peak picking) run in a Rust crate compiled to WebAssembly. Every kernel has
  a JavaScript fallback, so PsiNMR still works if Wasm is unavailable.
- **Flexible data ingestion** — drag-and-drop zip datasets or JCAMP/JEOL/nmrium
  files straight into the data panel, or paste a **public folder / GitHub repo
  URL** and PsiNMR scans it for NMR data automatically.
- **Low-eye-strain UI** — a warm-paper + deep-slate palette with the Inter
  typeface, exposed entirely through CSS variables for the wider Psi family.
- **Ships as a container** — a multi-stage Docker build produces a small nginx
  image serving a fully static app (correct `application/wasm` MIME type,
  gzip, immutable asset caching, SPA routing).

## Quick start

### Docker (recommended)

```bash
docker compose up --build
# open http://localhost:8080  (or https://localhost:8443)
```

or without compose:

```bash
docker build -t psinmr:latest .
docker run --rm -p 8080:80 -p 8443:443 psinmr:latest
```

HTTPS uses a self-signed certificate generated fresh at container startup,
so the browser shows a one-time trust warning for `https://localhost:8443` —
click through ("Advanced → Proceed") to continue. Plain HTTP on port 8080
works without any warning.

### Local development

Requires Node 24+, Rust with the `wasm32-unknown-unknown` target, and
[`wasm-pack`](https://rustwasm.github.io/wasm-pack/).

```bash
npm install
npm run wasm        # build the Rust compute engine to src/compute/pkg
npm run dev         # Vite dev server on http://localhost:3000
```

## Using PsiNMR

- **INTERACTIVE NMR** — the primary call-to-action; opens the interactive
  plotting workspace.
- **Data panel** (top-left toggle):
  - *Add data* — drop files/zips, or scan a public URL. Recognised sources:
    a direct file link, a GitHub repo/folder (scanned via the GitHub API into
    raw file links), or a plain web directory listing.
  - *Your data* — everything you've added this session, grouped by source.
  - *Sample library* — the bundled example spectra.
- **Tools menu** — Predict and Simulate (the former Teaching-menu tools).
- **Ψ engine chip** (top-right) — shows whether contour/FFT work is running on
  `Rust/Wasm` or the `JS` fallback.

Because v1 is **stateless**, data you add lives only in the current browser
session; reloading clears it. Persistence arrives with the Pro version (see
the roadmap).

## The compute engine

The Rust crate lives in [`rust/psinmr-core`](rust/psinmr-core) and exposes:

| Function | Purpose |
| --- | --- |
| `conrec_basic` / `ContourGrid` | CONREC contour generation for 2D spectra (a faithful port of `ml-conrec`; `ContourGrid` keeps the matrix resident in Wasm memory so interactive level changes don't re-copy it) |
| `fft` | Forward/inverse FFT (rustfft, any length, cached plans) |
| `baseline_polynomial` | Iterative polynomial (ModPoly-style) baseline estimation |
| `peak_pick` | 1D local-maxima peak picking with parabolic interpolation |

The TypeScript bridge is [`src/compute/engine.ts`](src/compute/engine.ts).
It lazily instantiates the module and reports `wasm`/`js` to the UI. The 2D
contour path in
[`src/data/data2d/Spectrum2D/contours.ts`](src/data/data2d/Spectrum2D/contours.ts)
tries the Wasm engine first and falls back to `ml-conrec` on any error.

### Benchmarks

In dev builds, `window.__psinmr` exposes comparisons against the JS libraries
NMRium ships today. Measured in Chrome on an Apple-silicon Mac
(`benchmarkContours`, warm = interactive re-contour on a resident grid):

| Workload | JS | Wasm (warm) | Speedup |
| --- | --- | --- | --- |
| CONREC contours, 1024² | 10.2 ms | 4.6 ms | **2.2×** |
| CONREC contours, 2048² | 75 ms | 18 ms | **4.1×** |
| CONREC contours, 4096² | 287 ms | 61 ms | **4.7×** |
| FFT, 64k points | 62 ms | 40 ms | **1.5×** |

Segment output is verified identical to `ml-conrec`. Run them yourself in the
browser console:

```js
await window.__psinmr.benchmarkContours(2048, 20);
await window.__psinmr.benchmarkFft(65536, 50);
```

## Architecture at a glance

```
┌────────────────────────────────────────────────────────┐
│  React / TypeScript UI  (Psi shell + NMRium component)   │
│    TopBar · DataPanel · InteractiveView · Landing        │
└───────────────┬──────────────────────────┬──────────────┘
                │ light UI + orchestration  │ heavy math
                ▼                            ▼
      nmrium-core / ml-*            src/compute/engine.ts
      (parsing, state)                       │
                                             ▼
                                psinmr-core (Rust → Wasm)
                                CONREC · FFT · baseline · peaks
```

Key directories:

```
rust/psinmr-core/     Rust compute crate (compiled to Wasm)
src/compute/          TS bridge + generated pkg/ + dev benchmarks
src/demo/psinmr/      Psi app shell (TopBar, DataPanel, InteractiveView, theme)
docker/               nginx config for the runtime image
```

## Relationship to NMRium

PsiNMR is a downstream project of NMRium and remains **MIT-licensed**. The
original copyright is retained in [`LICENSE`](LICENSE), the upstream README is
preserved as [`README_NMRium_upstream.md`](README_NMRium_upstream.md), and the
About dialog credits the upstream authors (Zakodium, University of Cologne,
JGU Mainz, Universidad del Valle). Improvements here — the Wasm compute core,
the data hub, the Psi shell and theming, and the Docker packaging — are
additive.

See [ROADMAP.md](ROADMAP.md) for where this is going: a Pro version with
accounts and a data library, and generalizing the shell into a **Psi**
platform for other scientific-data domains (PsiXRD, PsiDSC, PsiRaman, PsiIR,
PsiMS, PsiUV-Vis).

## License

MIT — see [LICENSE](LICENSE).
