# Pipe to Ψ|NMR⟩

PsiNMR is a free, stateless, open web app — anyone can send NMR data to it for
processing and visualization, with no accounts and no server. Pick the option
that fits your app or notebook, from a one-line link to a full two-way
integration. Everything below works against the public instance at
`https://psinmr.com`.

## Option 1 — an "Open in Ψ|NMR⟩" link (simplest)

Point users at PsiNMR with the data URL in the query string. No JavaScript, no
iframe — just a link. Great for electronic lab notebooks, data repositories and
READMEs.

```
https://psinmr.com/#/nmr?url=<your-data-url>
```

The URL can point at a zip (Bruker/Varian/Jeol folder), a JCAMP-DX file, or a
`.nmrium` file, and may be a comma-separated list. Add a ready-made badge:

```html
<a href="https://psinmr.com/#/nmr?url=https://example.org/spectrum.zip">
  <img
    src="https://psinmr.com/badges/open-in-psinmr-dark.svg"
    alt="Open in PsiNMR"
    height="36"
  />
</a>
```

Badges: [`open-in-psinmr-dark.svg`](/badges/open-in-psinmr-dark.svg) for dark
backgrounds, [`open-in-psinmr-light.svg`](/badges/open-in-psinmr-light.svg) for
light. (The data server must allow cross-origin fetches — send `Access-Control-
Allow-Origin`; most public data hosts already do.)

## Option 2 — a zero-JS embed

Show a live, interactive spectrum inside your own page with a single `<iframe>`.
The `#/embed` route is a chrome-less viewer; `?url=` auto-loads the data on
mount, and `?theme=light|dark` matches your UI.

```html
<iframe
  src="https://psinmr.com/#/embed?url=https://example.org/spectrum.zip&theme=light"
  style="width: 100%; height: 600px; border: 0"
></iframe>
```

## Option 3 — an interactive embed (two-way)

For apps that load data dynamically and want the processed result back, drive
the iframe over `window.postMessage`. PsiNMR is wire-compatible with the NMRium
react wrapper, so the events are the standard `nmr-wrapper:*` ones:

```js
const frame = document.querySelector('#psinmr');

// send data
frame.contentWindow.postMessage(
  {
    type: 'nmr-wrapper:load',
    data: { type: 'url', data: ['https://example.org/spectrum.zip'] },
  },
  '*',
);

// get the processed state back to save it
window.addEventListener('message', (event) => {
  if (event.data?.type === 'nmr-wrapper:data-change') {
    const { state } = event.data.data; // a .nmrium object
  }
});
```

Full protocol (load `file`/`url`/`nmrium`, `action-request`, `data-change`,
`action-response`, `error`) is on the **[Embedding PsiNMR](#/docs/embedding)**
page. See it running on the **[live embed demo](#/embed-demo)**.

## Option 4 — the React component

If your app is React and you'd rather embed the component than an iframe, the
underlying NMRium component is available from the `psinmr` package
(`state` / `aggregator` props in, `onChange` out, plus a ref API).

## Which should I use?

| You want to…                                        | Use                       |
| --------------------------------------------------- | ------------------------- |
| Link out from a notebook / repo / README            | Option 1 (link + badge)   |
| Show a spectrum inside your page, read-only-ish     | Option 2 (zero-JS iframe) |
| Load data dynamically and save the processed result | Option 3 (postMessage)    |
| Embed directly in a React app                       | Option 4 (component)      |

All options are free to use against `psinmr.com`, or against your own
self-hosted PsiNMR (see the repository's `DEPLOY.md`).
