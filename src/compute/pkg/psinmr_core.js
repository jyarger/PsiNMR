/* @ts-self-types="./psinmr_core.d.ts" */

/**
 * A 2D intensity grid kept resident in Wasm memory.
 *
 * Interactive contour-level changes (wheel zoom) recompute contours on
 * the same matrix over and over; keeping the matrix on this side of the
 * JS/Wasm boundary means only the levels and the resulting segments are
 * copied per call.
 */
export class ContourGrid {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ContourGridFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_contourgrid_free(ptr, 0);
    }
    /**
     * @param {Float64Array} levels
     * @param {number} timeout_ms
     * @returns {Float64Array}
     */
    contours(levels, timeout_ms) {
        const ptr0 = passArrayF64ToWasm0(levels, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.contourgrid_contours(this.__wbg_ptr, ptr0, len0, timeout_ms);
        var v2 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v2;
    }
    /**
     * @param {Float64Array} z
     * @param {number} rows
     * @param {number} cols
     * @param {Float64Array} xs
     * @param {Float64Array} ys
     */
    constructor(z, rows, cols, xs, ys) {
        const ptr0 = passArrayF64ToWasm0(z, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(xs, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF64ToWasm0(ys, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.contourgrid_new(ptr0, len0, rows, cols, ptr1, len1, ptr2, len2);
        this.__wbg_ptr = ret;
        ContourGridFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) ContourGrid.prototype[Symbol.dispose] = ContourGrid.prototype.free;

/**
 * Iterative polynomial baseline estimation (ModPoly-style).
 * Fits a polynomial of `degree` to `y`, then clips points above the fit
 * and refits, `iterations` times. Returns the estimated baseline.
 * @param {Float64Array} y
 * @param {number} degree
 * @param {number} iterations
 * @returns {Float64Array}
 */
export function baseline_polynomial(y, degree, iterations) {
    const ptr0 = passArrayF64ToWasm0(y, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.baseline_polynomial(ptr0, len0, degree, iterations);
    var v2 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v2;
}

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
 * @param {Float64Array} z
 * @param {number} rows
 * @param {number} cols
 * @param {Float64Array} xs
 * @param {Float64Array} ys
 * @param {Float64Array} levels
 * @param {number} timeout_ms
 * @returns {Float64Array}
 */
export function conrec_basic(z, rows, cols, xs, ys, levels, timeout_ms) {
    const ptr0 = passArrayF64ToWasm0(z, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(xs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF64ToWasm0(ys, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayF64ToWasm0(levels, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.conrec_basic(ptr0, len0, rows, cols, ptr1, len1, ptr2, len2, ptr3, len3, timeout_ms);
    var v5 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v5;
}

/**
 * In-place FFT (or inverse FFT) of a complex signal given as separate
 * real and imaginary arrays. Uses rustfft's mixed-radix planner, so any
 * length is supported. The inverse transform is normalized by 1/n.
 * @param {Float64Array} re
 * @param {Float64Array} im
 * @param {boolean} inverse
 */
export function fft(re, im, inverse) {
    var ptr0 = passArrayF64ToWasm0(re, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    var ptr1 = passArrayF64ToWasm0(im, wasm.__wbindgen_malloc);
    var len1 = WASM_VECTOR_LEN;
    wasm.fft(ptr0, len0, re, ptr1, len1, im, inverse);
}

/**
 * Simple 1D peak picking: local maxima above `min_height`, refined with
 * parabolic interpolation. Returns flat `[position, height, ...]` pairs
 * where `position` is a fractional index into `y`.
 * @param {Float64Array} y
 * @param {number} min_height
 * @returns {Float64Array}
 */
export function peak_pick(y, min_height) {
    const ptr0 = passArrayF64ToWasm0(y, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.peak_pick(ptr0, len0, min_height);
    var v2 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v2;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_copy_to_typed_array_4db0cbe2cc60dbee: function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_throw_344f42d3211c4765: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_now_86c0d4ba3fa605b8: function() {
            const ret = Date.now();
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./psinmr_core_bg.js": import0,
    };
}

const ContourGridFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_contourgrid_free(ptr, 1));

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('psinmr_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
