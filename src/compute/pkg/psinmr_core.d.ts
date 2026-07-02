/* tslint:disable */
/* eslint-disable */

/**
 * A 2D intensity grid kept resident in Wasm memory.
 *
 * Interactive contour-level changes (wheel zoom) recompute contours on
 * the same matrix over and over; keeping the matrix on this side of the
 * JS/Wasm boundary means only the levels and the resulting segments are
 * copied per call.
 */
export class ContourGrid {
    free(): void;
    [Symbol.dispose](): void;
    contours(levels: Float64Array, timeout_ms: number): Float64Array;
    constructor(z: Float64Array, rows: number, cols: number, xs: Float64Array, ys: Float64Array);
}

/**
 * Iterative polynomial baseline estimation (ModPoly-style).
 * Fits a polynomial of `degree` to `y`, then clips points above the fit
 * and refits, `iterations` times. Returns the estimated baseline.
 */
export function baseline_polynomial(y: Float64Array, degree: number, iterations: number): Float64Array;

/**
 * CONREC contour generation, matching ml-conrec's `Conrec` with
 * `swapAxes: false` and the `basic` contour drawer.
 *
 * * `z` - row-major matrix of intensities (`rows` x `cols`)
 * * `xs` - column coordinates (length `cols`)
 * * `ys` - row coordinates (length `rows`)
 * * `levels` - contour levels (sorted ascending internally)
 * * `timeout_ms` - abort after this many milliseconds (0 = no timeout)
 *
 * Returns a flat Float64Array:
 * `[timeoutFlag, nLevels, sortedLevel_0..n, segLen_0..n, segments...]`
 * where each level's segment data is `[x1, y1, x2, y2, ...]` in plot
 * coordinates (x from `xs`, y from `ys`), identical to
 * `BasicContourDrawer` output with `swapAxes: false`.
 */
export function conrec_basic(z: Float64Array, rows: number, cols: number, xs: Float64Array, ys: Float64Array, levels: Float64Array, timeout_ms: number): Float64Array;

/**
 * In-place FFT (or inverse FFT) of a complex signal given as separate
 * real and imaginary arrays. Uses rustfft's mixed-radix planner, so any
 * length is supported. The inverse transform is normalized by 1/n.
 */
export function fft(re: Float64Array, im: Float64Array, inverse: boolean): void;

/**
 * Simple 1D peak picking: local maxima above `min_height`, refined with
 * parabolic interpolation. Returns flat `[position, height, ...]` pairs
 * where `position` is a fractional index into `y`.
 */
export function peak_pick(y: Float64Array, min_height: number): Float64Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_contourgrid_free: (a: number, b: number) => void;
    readonly baseline_polynomial: (a: number, b: number, c: number, d: number) => [number, number];
    readonly conrec_basic: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
    readonly contourgrid_contours: (a: number, b: number, c: number, d: number) => [number, number];
    readonly contourgrid_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly fft: (a: number, b: number, c: any, d: number, e: number, f: any, g: number) => void;
    readonly peak_pick: (a: number, b: number, c: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
