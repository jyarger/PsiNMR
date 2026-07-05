# Loading data

PsiNMR reads most common NMR formats directly in the browser. Everything is
parsed locally; your data never leaves your machine in the stateless version.

## Supported formats

| Source             | Format                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| Bruker             | TopSpin folders (`fid`/`ser`, `acqus`, `pdata`) — as a folder drop or zip      |
| Varian / Agilent   | `.fid` folders with `procpar` (1D) — zipped or dropped                         |
| Jeol               | `.jdf` files                                                                   |
| JCAMP-DX           | `.dx`, `.jdx`, `.jcamp` (1D and 2D, FID or processed)                          |
| PsiNMR             | `.nmrium` files (data + processing state + assignments)                        |
| Magritek Spinsolve | JCAMP-DX exports (`.dx`) — native `.1d`/`.2d` binary support is on the roadmap |

## Ways to load

### Drag and drop

Drop files, folders or zips onto the spectrum viewer or into the data panel's
drop zone. Multiple spectra load into the same view and appear in the
**Spectra** panel.

### Scan a public URL

Paste a URL into the data panel's **Add data** field and press **Scan**:

- **A direct file link** — loads that dataset.
- **A GitHub repository or folder** — PsiNMR scans the repo through the
  GitHub API and lists every NMR file it finds under _Your data_, with an
  "All" entry to open everything at once. Example:
  `https://github.com/cheminfo/nmr-dataset-demo`
- **A plain web directory listing** (Apache/nginx autoindex) — scanned for
  NMR file links.

### Public NMR Data

The data panel's **Public NMR Data** section connects PsiNMR to open
repositories:

- **Browse nmrXiv** — a searchable catalog of the
  [nmrXiv](https://nmrxiv.org) FAIR NMR repository (nearly 2000 public
  samples with structures, molecular formulas and experiment types).
  Search by compound name, formula, experiment (e.g. `cosy`) or
  identifier, then **Open in PsiNMR** to download the sample's spectra
  archive and load it directly.
- **Browse BMRB** — search the
  [Biological Magnetic Resonance Data Bank](https://bmrb.io) metabolomics
  collection by compound (e.g. `glucose`, `citrate`) and open an entry's
  Bruker spectrum in one click.

Larger datasets can take a moment to download and parse. BMRB's data
server does not send CORS headers, so BMRB spectra are fetched through a
same-origin reverse proxy built into the PsiNMR server (nginx / the dev
server); no third-party proxy is involved.

### Sample library

The bundled examples (cytisine, ethylbenzene, and more, including 2D COSY /
HSQC / HMBC data) live in the data panel under **Sample library** — useful
for exploring features before loading your own data.

## Saving your work

Use the export options (top-right toolbar inside the viewer) to save a
`.nmrium` file — it captures the data, processing history and assignments,
and can be reloaded later or shared. In the stateless version this is your
persistence mechanism; reloading the page clears the _Your data_ list.
