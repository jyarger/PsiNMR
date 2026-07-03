# The Ψ compute engine

PsiNMR offloads its heaviest numerics to **psinmr-core**, a Rust crate
compiled to WebAssembly. The engine chip in the top bar shows which backend
is active:

- **Rust/Wasm** — the engine loaded and is handling supported computations.
- **JS** — the Wasm module could not load (old browser, blocked Wasm);
  PsiNMR transparently falls back to the original JavaScript
  implementations. Everything still works, just slower on large data.

## What runs on the engine today

| Kernel                    | Used for                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CONREC contour generation | 2D spectrum rendering. The intensity matrix stays resident in Wasm memory (`ContourGrid`), so interactive contour-level changes never re-copy it. Typically 2–5× faster than the JS path, growing with matrix size. |
| FFT / inverse FFT         | Any transform length, with cached plans                                                                                                                                                                             |
| Polynomial baseline       | ModPoly-style iterative estimation                                                                                                                                                                                  |
| Peak picking              | Local maxima with parabolic interpolation                                                                                                                                                                           |

## Roadmap

Deeper pipeline integration (apodization, zero-filling, phasing, the full 1D
FT path) and Web Worker execution — so the UI thread never blocks — are
planned; see `ROADMAP.md` in the repository.

## Benchmarks

Development builds expose micro-benchmarks in the browser console:

```js
await window.__psinmr.benchmarkContours(2048, 20);
await window.__psinmr.benchmarkFft(65536, 50);
```

Both compare the Wasm engine against the same JavaScript libraries NMRium
uses, and verify the outputs match.
