# Chemical structures & assignment

The **Chemical structures** panel links spectra to molecules.

## Adding a structure

Open the panel and draw a molecule in the built-in editor, or paste a SMILES
string / MOL file. Multiple structures can be attached to a dataset; the
molecular formula and exact mass are computed automatically.

## Assignment

With ranges (1D) or zones (2D) defined:

1. Activate assignment mode from the structure panel.
2. Click a range (or zone), then click the atom(s) it belongs to.
3. Assigned atoms are highlighted whenever the corresponding signal is
   hovered — in the spectrum, the tables, and the structure.

The **Summary** panel aggregates all assignments and correlations (from
COSY/HSQC/HMBC zones) into a correlation table you can export.

## Labelling

Atom numbering follows the structure editor's canonical order; custom labels
can be edited directly in the structure panel and are stored in the
`.nmrium` file together with the assignments.
