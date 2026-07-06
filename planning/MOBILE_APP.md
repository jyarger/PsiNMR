# Planning: PsiNMR on phones — mobile web → iOS/Android app

**Status:** planning / design. Nothing here is built yet.
**Goal:** a phone-first way to process and visualize NMR, delivered first as a
**mobile web experience** (a second UI component of the cloud app) and
ultimately as **native iOS and Android apps**.
**TL;DR:** Don't shrink the desktop UI — build a **separate touch-first mobile
view** that reuses the existing compute + data-loading layers. Ship it as an
installable **PWA**, then wrap that same view with **Capacitor** for the App
Store and Play Store. The engineering is real but well-bounded; the hard part
is interaction design, not plumbing.

---

## Why the desktop UI can't just be "made responsive"

NMRium's UI — the foundation PsiNMR inherited — is built for a mouse and a big
screen:

- **Multi-panel layout** (spectra list + plot + processing + info) assumes
  width most phones don't have.
- **Hover** drives tooltips, crosshairs and highlights — phones have no hover.
- **Right-click menus** and tiny toolbar targets — no right-click, and fingers
  need ~44 px targets.
- **Drag semantics are overloaded** — the same drag means zoom, pan, integrate,
  pick a range, or phase, depending on the active tool. On touch, a drag also
  competes with the browser's own scroll/back-swipe.

CSS breakpoints alone produce a cramped, frustrating result. The right move is a
**dedicated mobile component** that presents a deliberately smaller, gesture-
driven feature set — while sharing everything below the UI.

---

## Architecture: one core, two front-ends

```
        ┌───────────────────────────────────────────────┐
        │  Shared, UI-agnostic layers (already exist)     │
        │   • data loading / parsers (FileCollection)     │
        │   • processing pipeline + .nmrium state         │
        │   • psinmr-core (Rust → Wasm) compute engine    │
        └───────────────┬───────────────────┬────────────┘
                        │                   │
             ┌──────────▼─────────┐  ┌──────▼──────────────┐
             │  Desktop view       │  │  Mobile view (new)   │
             │  (existing NMRium)  │  │  touch-first shell    │
             └─────────────────────┘  └──────┬──────────────┘
                                             │  same build wrapped by
                                    ┌────────▼─────────┐
                                    │ PWA / Capacitor   │ → iOS + Android
                                    └───────────────────┘
```

- **Reuse the whole stack under the UI.** Parsing, the processing/`.nmrium`
  state model, and the Wasm engine are UI-independent and stay shared.
- **New: a mobile route/shell.** Detect small touch viewports (or an explicit
  `#/m` route / subdomain `m.psinmr.com`) and mount a purpose-built mobile
  component instead of the desktop workspace.
- **The plot canvas can be largely reused** — it's SVG/D3 rendering that already
  scales — but wrapped in a **touch gesture layer** rather than mouse handlers.

---

## Mobile UX design (phone)

Design principles: **one thing on screen at a time**, gestures over toolbars,
bottom sheets over side panels, and a curated 80% toolset rather than the full
desktop menu.

### Layout

- **Full-bleed spectrum** as the home surface; chrome collapses away.
- **Top bar:** spectrum title + nucleus tab(s) + a single overflow menu.
- **Bottom sheet** (swipe up) for everything that's a side panel on desktop:
  _Spectra_, _Processing_, _Peaks/Integrals/Ranges_, _Info_ — one tab bar,
  drag-to-expand, tap-to-collapse.
- **Floating action button** for the active tool; long-press to switch tools.
- **Landscape mode** is first-class — a wide spectrum is exactly what a phone
  held sideways is good at.

### Gestures (replacing mouse drags)

| Intent                 | Desktop               | Mobile                                                          |
| ---------------------- | --------------------- | --------------------------------------------------------------- |
| Zoom                   | scroll / drag-box     | **pinch** (x, or x+y on 2D)                                     |
| Pan                    | drag                  | **two-finger drag**                                             |
| Reset view             | double-click          | **double-tap**                                                  |
| Read value / cursor    | hover                 | **tap** (persistent crosshair) or long-press                    |
| Integrate / pick range | drag with tool active | **one-finger drag** while a tool is selected in the FAB         |
| Phase                  | drag                  | **dedicated phase mode** with two thumb sliders (pivot + order) |

Reserving one-finger drag for the _active tool only_ (and two-finger for
pan/zoom) resolves the overloaded-drag problem and avoids fighting browser
scroll. A brief on-screen hint the first time each tool is used goes a long way.

### Curated feature set for v1 mobile

Ship the operations people actually do on a phone; leave the long tail to
desktop/web:

- View & navigate 1D (and read-only 2D) spectra
- Zoom / pan / reset, cursor readout
- Auto-phase + manual phase, baseline, apodization, zero-fill, FT
- Peak picking, integration, simple ranges
- Load from: **Files/iCloud/Drive share sheet**, a `?url=` link, nmrXiv/BMRB
  browse, and (native) "open with PsiNMR"
- Export/share a PNG/SVG or the `.nmrium` via the OS share sheet

### Data loading on phones

- **Web/PWA:** file input + `?url=` links + the existing nmrXiv/BMRB browsers.
- **Native (Capacitor):** register as a handler for `.nmrium` and vendor zips so
  they open from Files/email; use the share sheet for import/export. Large
  Bruker/Varian folders are awkward on iOS (no real folder picker) — favor
  zipped datasets and cloud links on mobile.

---

## Delivery path

### Phase A — Mobile web component (the "2nd component")

A touch-first view served by the same app, installable as a **PWA**
(add-to-home-screen, offline via service worker, app icon, splash). This alone
"opens NMR processing to everyone's phone" via a URL — no store, no install
friction. It's also the exact artifact the native wrapper will ship.

### Phase B — Native iOS + Android via Capacitor

**Capacitor** (Ionic) wraps the mobile web build in a native shell and produces
real App Store / Play Store binaries while reusing 100% of the Phase-A UI. It
exposes native file handling, share sheet, and status-bar/safe-area control
through JS plugins. This is the **lowest-effort path to "an app,"** because
there's no second UI codebase.

- **Why Capacitor over React Native:** RN would mean rebuilding the entire UI in
  native components and re-bridging the Wasm engine — a rewrite. Capacitor keeps
  one web UI. (Tauri 2 Mobile is the Rust-native alternative and pairs naturally
  with [the desktop plan](DESKTOP_APP.md), but it's younger for mobile; revisit
  if we go native-compute-heavy.)
- **Wasm on mobile:** runs fine in iOS/Android webviews; watch memory on large
  2D datasets (cap sizes, stream contours).

---

## Effort & phasing

| Phase                    | Scope                                                                                                              | Effort                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| **A0 — Prototype**       | Mobile route, full-screen plot, pinch/pan/double-tap gesture layer over the existing viewer                        | ~3–5 days                |
| **A1 — Mobile v1**       | Bottom-sheet panels, FAB tools, curated processing set, share-sheet/`?url=` loading, PWA manifest + service worker | ~2–3 weeks               |
| **B1 — Capacitor shell** | Wrap A1, native file associations + share sheet, safe-area/status-bar, build pipelines                             | ~1 week                  |
| **B2 — Store launch**    | App Store + Play Store listings, icons/screenshots, review submissions                                             | ~1 week + review latency |

**Mobile web (Phase A): ~3–4 focused weeks. Native apps on top (Phase B):
~2 more weeks + store review.** Phase A delivers most of the value on its own.

### Costs

- **Apple App Store:** $99/yr developer account + review (can be strict).
- **Google Play:** $25 one-time + review.
- **PWA:** $0 — reason to lead with it.

---

## Viability verdict

**Viable and high-impact, but it's a genuine design project, not a wrapper
job.** The plumbing (shared core, PWA, Capacitor) is well-trodden; the risk and
effort live in the **touch interaction design** for a tool whose every gesture
is overloaded on desktop. Mitigate by shipping the **PWA first** with a curated
feature set, learning from real phone use, and only then wrapping it for the
stores.

**Recommended sequencing:** Phase A (mobile web/PWA) is worth doing relatively
soon — it's self-contained, reuses everything, and instantly widens reach. Hold
Phase B (native store apps) until the PWA's mobile UX is validated, so the store
binaries ship a UI that already feels good.

---

## Open questions

- **Detection vs. explicit route:** auto-switch to the mobile view on small
  touch viewports, or keep it at `m.psinmr.com` / a "mobile version" toggle so
  users can opt into either? (Lean: auto-switch with an escape hatch.)
- **2D on phones:** read-only viewer only, or basic processing too? (Lean:
  view-only for v1.)
- **Offline depth:** how much of a session should the service worker persist
  (last spectrum + state) given the app is otherwise stateless?
- **Shared component boundary:** how much of the desktop plot/interaction code
  can be refactored into a UI-agnostic core both views import, to avoid drift?
