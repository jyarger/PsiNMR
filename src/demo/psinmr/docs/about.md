# About PsiNMR

PsiNMR (Ψ|NMR⟩) is a free, open-source web application for processing,
analyzing and visualizing NMR data entirely in your browser — nothing is
uploaded; all computation happens locally, accelerated by a Rust → WebAssembly
compute engine. It is the first application of the Psi scientific-data
platform.

- **Website:** [psinmr.com](https://psinmr.com)
- **Source code:** [github.com/jyarger/PsiNMR](https://github.com/jyarger/PsiNMR)
- **Releases & release notes:** [github.com/jyarger/PsiNMR/releases](https://github.com/jyarger/PsiNMR/releases)
- **Changelog:** [CHANGELOG.md](https://github.com/jyarger/PsiNMR/blob/main/CHANGELOG.md)
- **Report a problem / request a feature:** [github.com/jyarger/PsiNMR/issues](https://github.com/jyarger/PsiNMR/issues)

## Which version am I running?

Two ways to check, whether you are on psinmr.com or a self-hosted instance:

1. **In the app** — click the **Ψ** button at the top of the left toolbar in
   the NMR view. The About dialog shows the version (linked to its GitHub
   tag) and, for CI-built releases, the exact git commit of the build.
2. **From anywhere** — fetch the deployment's version endpoint:

   ```
   curl -s https://psinmr.com/version.json
   ```

   It returns the version, the git commit the image was built from, and the
   build timestamp:

   ```json
   {
     "name": "PsiNMR",
     "version": "0.4.0",
     "gitSha": "ae584ba…",
     "builtAt": "2026-11-21T18:00:00.000Z"
   }
   ```

Compare against the [releases page](https://github.com/jyarger/PsiNMR/releases)
to see whether a deployment is current. Operators: the upgrade procedure for
a live server is documented in
[UPGRADE.md](https://github.com/jyarger/PsiNMR/blob/main/UPGRADE.md).

## Versioning

PsiNMR follows a `v0.x` beta series (v0.3, v0.4, …) that will culminate in a
stable **v1.0** release. Each release is tagged on GitHub and published as a
versioned Docker image, so any deployment can be pinned, verified and rolled
back exactly.

## Authorship & license

PsiNMR is developed by Prof. Jeff Yarger and released under the
[MIT license](https://github.com/jyarger/PsiNMR/blob/main/LICENSE).
Development started from the open-source
[NMRium](https://github.com/cheminfo/nmrium) project (MIT license), developed
by Zakodium Sàrl (Switzerland), the University of Cologne (Germany), Johannes
Gutenberg University Mainz (Germany) and Universidad del Valle (Colombia),
and PsiNMR retains that attribution with gratitude. PsiNMR has been developed
independently since July 2026.
