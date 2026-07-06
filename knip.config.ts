import type { KnipConfig } from 'knip';

export default {
  ignoreBinaries: ['jq'],
  ignoreDependencies: ['@simbathesailor/use-what-changed'],
  // Standalone native-shell sub-projects with their own package.json / tooling
  // (Tauri desktop, Capacitor mobile) — not part of the web app's module graph.
  ignore: ['desktop/**', 'mobile/**'],
} satisfies KnipConfig;
