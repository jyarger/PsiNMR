# 1D processing

A typical 1D workflow in PsiNMR: load an FID, Fourier transform, phase,
correct the baseline, then pick peaks / integrate / define ranges.

## Fourier transform

Load a raw FID (e.g. _Sample library → Liquids → Simple spectra → 13C FID cytisine_) and open the
**Processing** panel. Apply apodization (exponential is typical for 13C),
zero filling, then the Fourier transform. Each step is recorded in the
processing history and can be toggled or removed.

## Phase correction (`a`)

Choose manual, automatic, or absolute mode:

- **Manual** — drag to adjust PH0/PH1, or type values. Click in the spectrum
  to move the pivot.
- **Automatic** — a phase-detection algorithm sets PH0/PH1 for you.
- **Absolute** — magnitude spectrum (no phase information retained).

## Baseline correction (`b`)

Polynomial and spline baselines are available; the polynomial degree is
adjustable with a live preview of the corrected baseline.

## Peak picking (`p`)

Automatic peak detection with an adjustable noise threshold, or click
individual peaks. Peaks appear in the **Peaks** panel with shift, intensity
and width; peak shapes can be fitted (Lorentzian/Gaussian).

## Integration (`i`)

Drag across a signal to integrate. Set an absolute or relative reference in
the **Integrals** panel and other integrals rescale accordingly.

## Ranges and multiplet analysis (`r`)

Ranges combine integration with automatic multiplet analysis (J-couplings,
multiplicity) and are the basis for assignment to structures. The
**Ranges / Multiplet analysis** panel shows the resolved patterns and lets
you publish an ACS-style string.

## Processing history

Every filter is listed in the **Processing** panel in order. You can disable
individual steps, remove them, or replay the pipeline — the raw data is
never destroyed.
