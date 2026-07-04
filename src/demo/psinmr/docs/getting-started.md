# Getting started

PsiNMR (ΨNMR) processes, analyzes and visualizes 1D and 2D NMR data entirely
in your browser. Nothing is uploaded to a server — parsing, Fourier
transforms, baseline correction and contour generation all run locally, with
the heavy numerics executed by the Ψ compute engine (Rust → WebAssembly).

## The interface

- **INTERACTIVE NMR** (top bar) opens the interactive workspace: an empty
  spectrum viewer ready for your data.
- **Data panel** (☰, top-left) is where data comes from: drop files, scan a
  public URL, or open the bundled sample library.
- **Tools** menu holds Predict and Simulate.
- **Docs** — this manual.
- **Ψ engine chip** (top-right) shows whether heavy computation is running on
  `Rust/Wasm` or the JavaScript fallback.
- **Theme toggle** (sun/moon, top-right) switches between the default dark
  theme and a light theme. Your choice is remembered.

## Your first spectrum

1. Open the data panel and expand **Sample library → Liquids → Simple spectra**.
2. Click **1H cytisine**. The proton spectrum opens in the viewer.
3. Scroll to zoom the x-axis; press `Shift` and scroll to change intensity;
   double-click to reset the view.
4. Open the panels on the right (Peaks, Integrals, Ranges) to start analyzing.

## Solid-state NMR

The sample library is organized by state: **Liquids** and **Solids**. The
Solids section carries magic-angle-spinning (MAS) examples recorded on real
instruments — ¹H→¹³C cross-polarization (CP-MAS) spectra of adamantane,
glycine and pharmaceutical compounds, ⁷⁹Br MAS of KBr at two spinning rates,
and a multi-nucleus (¹H/³¹P/⁷⁹Br) probe-setup series. These arrive as raw
FIDs: open one, then walk the usual 1D workflow — apodization, Fourier
transform, phasing — exactly as you would for a liquid-state ¹³C spectrum.

After the Fourier transform, a **ν<sub>r</sub>** chip appears at the top-right
of the plot: it draws sideband guides at δiso ± n·νr to help separate
isotropic peaks from spinning sidebands. The spinning rate defaults from the
acquisition metadata (when present) but stays editable — adjust νr until
the guides land on the sidebands and you have measured the actual spinning
rate. Try it on the ⁷⁹Br KBr spectra, the classic sideband standard.

With the νr tool on, any peaks you pick are labelled against the grid — **iso**
for the isotropic line and **±1, ±2, …** for the spinning sidebands of that
site — so the real (chemically distinct) peaks are easy to tell apart from
sidebands.

**MAS parameters.** When a spectrum carries acquisition metadata, the
Information panel gains a **Solid-state NMR (MAS)** section listing the pulse
sequence, MAS rate, and (for cross-polarization) the CP contact time.

**Frequency axis.** Right-click the x-axis unit label to switch a
transformed spectrum between **δ [ppm]** and **ν [kHz]**. Solid-state
spectra are routinely plotted in frequency (kHz), where sideband spacings
equal the spinning rate directly and wideline patterns are easiest to read.

## Loading your own data

Drag a dataset — a zip of a Bruker/Varian/Jeol folder, a JCAMP-DX file, or a
`.nmrium` file — either onto the viewer itself or into the data panel's
drop zone. See [Loading data](#/docs/loading-data) for every supported route.

## Keyboard essentials

| Key   | Action              |
| ----- | ------------------- |
| `z`   | Zoom tool           |
| `p`   | Peak picking        |
| `i`   | Integration         |
| `r`   | Ranges              |
| `a`   | Phase correction    |
| `b`   | Baseline correction |
| `f`   | Full zoom out       |
| `Del` | Delete selected     |
