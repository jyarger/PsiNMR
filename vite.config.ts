import fs from 'node:fs';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import type { AliasOptions } from 'vite';
import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default () => {
  let resolveAliases: AliasOptions = [];
  if (process.env.WITH_PROFILING) {
    resolveAliases = [
      { find: 'react-dom/client', replacement: 'react-dom/profiling' },
      { find: 'scheduler/tracing', replacement: 'scheduler/tracing-profiling' },
    ];
  }

  const isMonorepo = checkMonorepo();

  return defineConfig({
    base: './',
    server: {
      // Same-origin reverse proxy for the BMRB data server, which sends no
      // CORS headers (see src/demo/psinmr/bmrb.ts). Mirrored in
      // docker/nginx.conf for the production container.
      proxy: {
        '/bmrb-data': {
          target: 'https://bmrb.io',
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(
              /^\/bmrb-data/,
              '/ftp/pub/bmrb/metabolomics/entry_directories',
            ),
        },
      },
    },
    build: {
      sourcemap: 'inline',
      rolldownOptions: {
        output: {
          strictExecutionOrder: true,
          codeSplitting: {
            groups: [
              {
                name: 'openchemlib',
                test: 'node_modules/openchemlib/',
                entriesAware: true,
              },
              {
                name: 'd3',
                test: /node_modules\/d3[-/]/,
                entriesAware: true,
              },
              {
                name: 'blueprint',
                test: 'node_modules/@blueprintjs/',
                entriesAware: true,
              },
              {
                name: 'vendor',
                test: 'node_modules/',
                entriesAware: true,
                maxSize: 500_000,
              },
            ],
          },
        },
      },
      minify: process.env.NO_MINIFY ? false : 'oxc',
    },
    plugins: [react()],
    resolve: {
      conditions: isMonorepo
        ? ['nmrium-internal', ...defaultClientConditions]
        : undefined,
      alias: resolveAliases,
    },
    ssr: {
      resolve: {
        conditions: isMonorepo
          ? ['nmrium-internal', ...defaultServerConditions]
          : undefined,
      },
    },
    test: {
      include: ['./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
  });
};

function checkMonorepo() {
  const monorepoPkg = path.join(import.meta.dirname, '..', 'package.json');
  if (!fs.existsSync(monorepoPkg)) return false;
  const pkg = JSON.parse(fs.readFileSync(monorepoPkg, 'utf8'));
  return pkg.name === '@zakodium/nmrium-monorepo';
}
