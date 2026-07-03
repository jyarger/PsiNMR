# Peaks, integrals & ranges

The right-hand panels hold the analysis results. Each panel has its own
settings (gear icon) controlling columns, precision and display.

## Peaks panel

Lists every picked peak with δ, intensity, width and kind. Peak shape
fitting (Lorentzian / pseudo-Voigt) refines positions and widths;
out-of-range peaks can be filtered automatically.

## Integrals panel

Shows each integral with absolute and relative values. Set one integral as
the reference (e.g. 3.00 for a methyl) and the rest rescale. The integral
sum constraint and the polynomial used under each integral are adjustable.

## Ranges / multiplet analysis

Ranges are the publication-oriented view: each range carries its multiplet
analysis (multiplicity, J-couplings) and relative integration.

- **Auto ranges** — automatic detection over the whole spectrum.
- **ACS string** — copy an "δ 7.26 (d, J = 8.1 Hz, 2H)…"-style string for a
  manuscript from the ranges context menu.

## Zoom & scale tips

| Action           | Effect                               |
| ---------------- | ------------------------------------ |
| Scroll           | Zoom x-axis around cursor            |
| `Shift` + scroll | Intensity scale                      |
| Drag             | Zoom to rectangle (2D) / region (1D) |
| Double-click     | Reset zoom                           |
| `f`              | Full zoom out                        |

## Exporting results

Peaks, integrals and ranges tables can be copied to the clipboard or saved,
and the spectrum view can be exported as SVG/PNG (always rendered in
publication style — black on white — regardless of the on-screen theme) or
saved as a `.nmrium` file with the full state.
