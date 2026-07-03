/**
 * PsiNMR compute engine bridge.
 *
 * Lazily instantiates the Rust/Wasm module (`rust/psinmr-core`) and exposes
 * typed helpers. Every consumer must keep a JavaScript fallback: if the
 * Wasm module fails to load (old browser, blocked wasm, missing asset)
 * `getWasmEngine()` stays `null` and callers use the JS implementation.
 */

import type * as PsiNmrCore from './pkg/psinmr_core.js';

type WasmModule = typeof PsiNmrCore;

let wasmEngine: WasmModule | null = null;
let initPromise: Promise<'wasm' | 'js'> | undefined;

export function initComputeEngine(): Promise<'wasm' | 'js'> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const module = await import('./pkg/psinmr_core.js');
        await module.default();
        wasmEngine = module;
        return 'wasm' as const;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          '[PsiNMR] Wasm compute engine unavailable, falling back to JavaScript.',
          error,
        );
        return 'js' as const;
      }
    })();
  }
  return initPromise;
}

export function getWasmEngine(): WasmModule | null {
  return wasmEngine;
}

export interface WasmContourResult {
  contours: Array<{ zValue: number; lines: Float64Array }>;
  timeout: boolean;
}

// One resident-in-Wasm grid per spectrum matrix. Keyed by the `z` row
// array's identity: interactive level changes reuse the uploaded matrix
// instead of copying it across the JS/Wasm boundary on every call.
// wasm-bindgen frees the Wasm-side memory via FinalizationRegistry once
// the JS wrapper is garbage collected together with the spectrum data.
const gridCache = new WeakMap<
  object,
  InstanceType<WasmModule['ContourGrid']>
>();

function getContourGrid(
  engine: WasmModule,
  z: ArrayLike<ArrayLike<number>>,
  xs: number[] | Float64Array,
  ys: number[] | Float64Array,
) {
  const cached = gridCache.get(z);
  if (cached) return cached;

  const rows = z.length;
  const cols = z[0].length;
  const flat = new Float64Array(rows * cols);
  for (let row = 0; row < rows; row++) {
    const source = z[row];
    // Rows of parsed NMR data are typically Float64Array already.
    if (source instanceof Float64Array) {
      flat.set(source, row * cols);
    } else {
      for (let col = 0; col < cols; col++) {
        flat[row * cols + col] = source[col];
      }
    }
  }
  const grid = new engine.ContourGrid(
    flat,
    rows,
    cols,
    Float64Array.from(xs),
    Float64Array.from(ys),
  );
  gridCache.set(z, grid);
  return grid;
}

/**
 * Contour generation through the Wasm CONREC port. Accepts the same data
 * layout used by `ml-conrec` in NMRium: `z` as an array of rows, `xs` as
 * column coordinates and `ys` as row coordinates.
 * Returns `null` when the Wasm engine is not (yet) available.
 */
export function wasmContours(options: {
  z: ArrayLike<ArrayLike<number>>;
  xs: number[] | Float64Array;
  ys: number[] | Float64Array;
  levels: number[];
  timeout?: number;
}): WasmContourResult | null {
  const engine = wasmEngine;
  if (!engine) return null;

  const { z, xs, ys, levels, timeout = 0 } = options;
  if (z.length === 0) return { contours: [], timeout: false };

  const grid = getContourGrid(engine, z, xs, ys);
  const out = grid.contours(Float64Array.from(levels), timeout);

  const timedOut = out[0] === 1;
  const levelCount = out[1];
  const sortedLevels = out.subarray(2, 2 + levelCount);
  const lengths = out.subarray(2 + levelCount, 2 + 2 * levelCount);

  const contours: WasmContourResult['contours'] = [];
  let offset = 2 + 2 * levelCount;
  for (let k = 0; k < levelCount; k++) {
    const length = lengths[k];
    contours.push({
      zValue: sortedLevels[k],
      lines: out.subarray(offset, offset + length),
    });
    offset += length;
  }

  return { contours, timeout: timedOut };
}
