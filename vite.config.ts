import fs from 'node:fs';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import type { AliasOptions, Plugin } from 'vite';
import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

const packageJson: { version: string } = JSON.parse(
  fs.readFileSync(new URL('package.json', import.meta.url), 'utf8'),
);

/**
 * Emit a small /version.json into the build so a deployment's exact version
 * can be checked remotely (e.g. `curl https://psinmr.com/version.json`).
 * GIT_SHA is provided by the Docker/CI build (see Dockerfile and
 * .github/workflows/docker-publish.yml); local builds leave it null.
 */
function versionJsonPlugin(): Plugin {
  return {
    name: 'psinmr-version-json',
    apply: 'build',
    generateBundle() {
      const payload = {
        name: 'PsiNMR',
        version: packageJson.version,
        gitSha: process.env.GIT_SHA || null,
        builtAt: new Date().toISOString(),
      };
      // eslint-disable-next-line unicorn/no-this-outside-of-class -- `this` is Rollup's PluginContext inside a plugin hook.
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify(payload, null, 2)}\n`,
      });
    },
  };
}

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
      // Production bundles ship WITHOUT sourcemaps: inline maps would embed
      // the full readable source in every JS chunk (large payload + source
      // exposure). Profiling builds keep inline maps for the React profiler.
      // Set SOURCEMAP=hidden to emit external .map files (e.g. to upload to
      // an error tracker) without referencing them from the served bundle.
      sourcemap: process.env.WITH_PROFILING
        ? 'inline'
        : process.env.SOURCEMAP === 'hidden'
          ? 'hidden'
          : false,
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
    // Build-time constants for the About dialog (src/versionInfo.ts);
    // declared for TypeScript in src/types/build-constants.d.ts.
    define: {
      __PSINMR_VERSION__: JSON.stringify(packageJson.version),
      __PSINMR_GIT_SHA__: JSON.stringify(process.env.GIT_SHA ?? ''),
    },
    plugins: [react(), versionJsonPlugin()],
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
