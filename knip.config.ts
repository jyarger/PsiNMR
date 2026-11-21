import type { KnipConfig } from 'knip';

export default {
  ignoreBinaries: ['jq'],
  ignoreDependencies: ['@simbathesailor/use-what-changed'],
  // Standalone native-shell sub-project with its own package.json / tooling
  // (Capacitor mobile) — not part of the web app's module graph. The Tauri
  // desktop/ dir needs no entry: it holds no TS files knip would scan.
  ignore: ['mobile/**'],
} satisfies KnipConfig;
