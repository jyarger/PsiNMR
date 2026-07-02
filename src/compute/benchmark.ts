/* eslint-disable no-console */
import FFTjs from 'fft.js';
import { Conrec } from 'ml-conrec';

import { getWasmEngine, initComputeEngine, wasmContours } from './engine.js';

/**
 * Dev-only benchmarks comparing the Rust/Wasm engine against the
 * JavaScript implementations NMRium uses today. Exposed on
 * `window.__psinmr` in dev builds.
 */

function syntheticMatrix(size: number): Float64Array[] {
  const z: Float64Array[] = [];
  for (let i = 0; i < size; i++) {
    const row = new Float64Array(size);
    for (let j = 0; j < size; j++) {
      // A few gaussian "peaks" plus mild noise, NMR-like.
      const g1 = Math.exp(-((i - size * 0.3) ** 2 + (j - size * 0.7) ** 2) / (size * 2));
      const g2 = Math.exp(-((i - size * 0.6) ** 2 + (j - size * 0.25) ** 2) / (size * 1.2));
      const g3 = Math.exp(-((i - size * 0.8) ** 2 + (j - size * 0.8) ** 2) / (size * 0.8));
      row[j] = g1 + 0.8 * g2 + 0.6 * g3 + 0.01 * Math.sin(i * 0.7 + j * 1.3);
    }
    z.push(row);
  }
  return z;
}

export async function benchmarkContours(size = 1024, nbLevels = 10) {
  await initComputeEngine();
  const z = syntheticMatrix(size);
  const xs = Array.from({ length: size }, (_, i) => i / (size - 1));
  const ys = Array.from({ length: size }, (_, i) => i / (size - 1));
  const levels = Array.from(
    { length: nbLevels },
    (_, i) => 0.05 + (i * 0.9) / nbLevels,
  );

  // Best of 3 for the JS path (lets the JIT warm up).
  let jsMs = Number.POSITIVE_INFINITY;
  let js!: ReturnType<Conrec['drawContour']>;
  for (let run = 0; run < 3; run++) {
    const t0 = performance.now();
    const conrec = new Conrec(z, { xs, ys, swapAxes: false });
    js = conrec.drawContour({ contourDrawer: 'basic', levels, timeout: 0 });
    jsMs = Math.min(jsMs, performance.now() - t0);
  }

  // Wasm: first call uploads the matrix into Wasm memory (cold); further
  // calls on the same spectrum (the interactive wheel path) are warm.
  const tCold = performance.now();
  const wasm = wasmContours({ z, xs, ys, levels, timeout: 0 });
  const coldMs = performance.now() - tCold;
  let warmMs = Number.POSITIVE_INFINITY;
  for (let run = 0; run < 3; run++) {
    const t = performance.now();
    wasmContours({ z, xs, ys, levels, timeout: 0 });
    warmMs = Math.min(warmMs, performance.now() - t);
  }

  const jsSegments = js.contours.reduce((sum, c) => sum + c.lines.length, 0);
  const wasmSegments =
    wasm?.contours.reduce((sum, c) => sum + c.lines.length, 0) ?? 0;

  const result = {
    matrix: `${size}x${size}`,
    levels: nbLevels,
    jsMs: +jsMs.toFixed(1),
    wasmColdMs: +coldMs.toFixed(1),
    wasmWarmMs: +warmMs.toFixed(1),
    speedupWarm: +(jsMs / warmMs).toFixed(2),
    jsSegments,
    wasmSegments,
    identicalSegmentCount: jsSegments === wasmSegments,
  };
  console.table([result]);
  return result;
}

export async function benchmarkFft(size = 65536, repeats = 20) {
  await initComputeEngine();
  const engine = getWasmEngine();
  if (!engine) throw new Error('Wasm engine not available');

  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    re[i] =
      Math.sin(i * 0.02) * Math.exp(-i / (size / 4)) + 0.05 * Math.sin(i * 1.7);
  }

  // fft.js (the fast JS radix-4 implementation used in the cheminfo stack)
  const fftjs = new FFTjs(size);
  const input = fftjs.createComplexArray();
  const output = fftjs.createComplexArray();
  for (let i = 0; i < size; i++) {
    input[2 * i] = re[i];
    input[2 * i + 1] = im[i];
  }
  const t0 = performance.now();
  for (let r = 0; r < repeats; r++) {
    fftjs.transform(output, input);
  }
  const t1 = performance.now();

  const wasmRe = new Float64Array(re);
  const wasmIm = new Float64Array(im);
  const t2 = performance.now();
  for (let r = 0; r < repeats; r++) {
    engine.fft(wasmRe, wasmIm, false);
  }
  const t3 = performance.now();

  const result = {
    size,
    repeats,
    jsMs: +(t1 - t0).toFixed(1),
    wasmMs: +(t3 - t2).toFixed(1),
    speedup: +((t1 - t0) / (t3 - t2)).toFixed(2),
  };
  console.table([result]);
  return result;
}
