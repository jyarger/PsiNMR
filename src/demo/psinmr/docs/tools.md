# Tools: Predict & Simulate

The **Tools** menu hosts spectrum prediction and simulation workspaces.

## Predict

Draw or paste a structure and PsiNMR predicts its NMR spectra — 1H and 13C
shifts (plus COSY / HSQC / HMBC correlations) computed from the structure.
Predicted spectra open in the viewer like any other dataset, so you can
overlay them with measured data to verify an assignment.

Typical uses:

- Sanity-check an assignment against predicted shifts.
- Generate a reference spectrum for a target compound before running it.
- Teach coupling patterns from known structures.

## Simulate

The simulation workspace builds 1D spectra from first principles: define a
spin system (chemical shifts, J-coupling matrix), the field strength, and
line width — PsiNMR computes the resulting spectrum interactively. Great for
exploring how second-order effects evolve with field strength or coupling
constants.

Both tools run fully in the browser; no structure or spectrum is sent to a
server.
