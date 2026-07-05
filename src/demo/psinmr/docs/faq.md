# FAQ

## Is my data uploaded anywhere?

No. The stateless version of PsiNMR parses and processes everything in your
browser. Files you drop never leave your machine; URL scanning fetches data
directly from the source you provide into your browser.

## Why did my "Your data" list disappear after a reload?

The stateless version keeps user-added data in memory only. Save a
`.nmrium` file to persist your work, or re-scan the URL. Account-based
storage is planned for PsiNMR Pro.

## Which browsers are supported?

Current Chrome, Edge, Firefox and Safari. WebAssembly is used when
available; otherwise PsiNMR falls back to JavaScript automatically.

## My Varian 2D dataset doesn't load

Varian/Agilent 2D `.fid` packages are not parsed yet (1D works). Expanded
vendor coverage — including Varian 2D and Magritek Spinsolve binary
formats — is on the roadmap. As a workaround, export from the instrument
software to JCAMP-DX, which loads fine.

## How do I report a bug or request a feature?

Open an issue at
[github.com/jyarger/PsiNMR](https://github.com/jyarger/PsiNMR/issues).

## How does PsiNMR relate to NMRium?

PsiNMR began as a fork of the open-source (MIT) NMRium project and is now
developed independently, with its own shell, theme, data hub, solid-state NMR
support, Rust/WebAssembly compute core and Docker packaging. As the MIT
license requires, NMRium's copyright and credits are retained — see the About
dialog (Ψ button in the viewer toolbar).
