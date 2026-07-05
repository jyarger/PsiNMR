# Embedding PsiNMR in your app

PsiNMR can be embedded in any web application via an `<iframe>` and driven with
`window.postMessage` — no framework lock-in, no build integration. It is
**wire-compatible with the NMRium react wrapper**, so an app that already
embeds NMRium can point its iframe at PsiNMR's `#/embed` route and keep the
same messages.

## 1. Add the iframe

```html
<iframe
  id="psinmr"
  src="https://psinmr.com/#/embed"
  style="width: 100%; height: 600px; border: 0"
  allow="clipboard-write"
></iframe>
```

Any origin may embed PsiNMR. The `#/embed` route is a chrome-less viewer (no
PsiNMR top bar or data panel) — just the spectra workspace.

## 2. Send data in

Post a `nmr-wrapper:load` message to the iframe once it has loaded. Three data
kinds are supported:

```js
const iframe = document.getElementById('psinmr');

// (a) From URLs (zips, JCAMP-DX, Bruker/Varian folders, .nmrium, …)
iframe.contentWindow.postMessage(
  {
    type: 'nmr-wrapper:load',
    data: { type: 'url', data: ['https://example.org/my-spectrum.zip'] },
  },
  '*',
);

// (b) From File objects (e.g. a drop or file input in your app)
iframe.contentWindow.postMessage(
  { type: 'nmr-wrapper:load', data: { type: 'file', data: fileList } },
  '*',
);

// (c) From an existing .nmrium object (full processing state)
iframe.contentWindow.postMessage(
  { type: 'nmr-wrapper:load', data: { type: 'nmrium', data: nmriumObject } },
  '*',
);
```

Every `load` payload also accepts an optional `activeTab` (e.g. `'1H'`) to
select the initial nucleus.

## 3. Get changes back out

Listen for messages from the iframe. Whenever the user processes or edits the
data, PsiNMR posts the full state back, so your app can save it:

```js
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message?.type === 'nmr-wrapper:data-change') {
    const { state, source } = message.data; // source: 'data' | 'view' | 'settings'
    // Persist `state` — it is a .nmrium object you can re-load later.
  }
  if (message?.type === 'nmr-wrapper:error') {
    console.error('PsiNMR error:', message.data.message);
  }
});
```

## 4. Request an action (optional)

Ask PsiNMR to export the current view, and receive the result:

```js
iframe.contentWindow.postMessage(
  {
    type: 'nmr-wrapper:action-request',
    data: { type: 'exportSpectraViewerAsBlob' },
  },
  '*',
);

window.addEventListener('message', (event) => {
  if (event.data?.type === 'nmr-wrapper:action-response') {
    const { blob, width, height } = event.data.data; // PNG/SVG blob of the viewer
  }
});
```

## Message reference

All messages are `{ type: 'nmr-wrapper:<event>', data }`.

| Event             | Direction     | `data` payload                                            |
| ----------------- | ------------- | --------------------------------------------------------- |
| `load`            | host → PsiNMR | `{ type: 'url' \| 'file' \| 'nmrium', data, activeTab? }` |
| `action-request`  | host → PsiNMR | `{ type: 'exportSpectraViewerAsBlob' }`                   |
| `data-change`     | PsiNMR → host | `{ state, source }`                                       |
| `action-response` | PsiNMR → host | `{ type, data }`                                          |
| `error`           | PsiNMR → host | `{ message }`                                             |

## Notes

- **Statelessness.** PsiNMR keeps nothing server-side; the embedded instance
  holds data only in the iframe's memory. Persist the `data-change` state in
  your own app to make it durable.
- **Timing.** Send `load` after the iframe's `load` event fires. If a spectrum
  doesn't appear, the message likely arrived before the app mounted — retry
  once on a short delay.
- **Migrating from NMRium.** The event names, namespace and payloads match the
  NMRium react wrapper, so in most cases only the iframe `src` changes.
