# 2D processing

PsiNMR handles homonuclear (COSY, TOCSY, NOESY) and heteronuclear
(HSQC, HMBC) experiments, FID or processed. 2D contour generation runs on
the Ψ Rust/Wasm engine, which keeps large matrices resident in WebAssembly
memory — interactive contour changes stay fast even for 4096×4096 grids.

## Viewing 2D spectra

Load a 2D dataset (e.g. _Sample library → Liquids → Simple spectra → COSY cytisine_). Projections
of matching 1D spectra are shown along both axes when they are loaded
together with the 2D experiment.

- **Contour levels** — scroll the mouse wheel over the spectrum to raise or
  lower the minimum contour level. Hold `Alt` to adjust only the positive
  levels.
- **Zoom** — drag a rectangle; double-click to reset.
- **Slicing** — the slicing tool shows live 1D traces through the crosshair
  position.

## Zones (`r` in 2D)

Zone picking detects cross-peaks in a dragged region and lists them in the
**Zones** panel with their F1/F2 coordinates. Zones are the 2D counterpart
of ranges and feed assignment.

## Processing 2D FIDs

Raw 2D data can be Fourier transformed in both dimensions from the
**Processing** panel, with apodization and phasing per dimension.

## Assignment

With a structure loaded (see [Structures](#/docs/structures)), zones and
ranges can be assigned to atoms; the **Summary** panel correlates 1D and 2D
evidence into an assignment table.
