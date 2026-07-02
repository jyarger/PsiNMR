//! PsiNMR compute engine.
//!
//! Heavy numerical routines for NMR processing, compiled to WebAssembly:
//! - CONREC contour generation for 2D spectra (port of ml-conrec, itself
//!   based on Paul D. Bourke's CONREC algorithm)
//! - FFT / inverse FFT (rustfft)
//! - Iterative polynomial baseline correction
//! - 1D peak picking with parabolic interpolation

use std::cell::RefCell;
use std::collections::HashMap;
use std::sync::Arc;

use rustfft::num_complex::Complex;
use rustfft::{Fft, FftPlanner};
use wasm_bindgen::prelude::*;

const EPSILON: f64 = f64::EPSILON;

thread_local! {
    // Wasm is single-threaded; cache FFT plans per (size, direction) so
    // repeated transforms (interactive reprocessing) skip planning.
    static FFT_CACHE: RefCell<HashMap<(usize, bool), Arc<dyn Fft<f64>>>> =
        RefCell::new(HashMap::new());
}

/// CONREC contour generation, matching ml-conrec's `Conrec` with
/// `swapAxes: false` and the `basic` contour drawer.
///
/// * `z` - row-major matrix of intensities (`rows` x `cols`)
/// * `xs` - column coordinates (length `cols`)
/// * `ys` - row coordinates (length `rows`)
/// * `levels` - contour levels (sorted ascending internally)
/// * `timeout_ms` - abort after this many milliseconds (0 = no timeout)
///
/// Returns a flat Float64Array:
/// `[timeoutFlag, nLevels, sortedLevel_0..n, segLen_0..n, segments...]`
/// where each level's segment data is `[x1, y1, x2, y2, ...]` in plot
/// coordinates (x from `xs`, y from `ys`), identical to
/// `BasicContourDrawer` output with `swapAxes: false`.
#[wasm_bindgen]
pub fn conrec_basic(
    z: &[f64],
    rows: usize,
    cols: usize,
    xs: &[f64],
    ys: &[f64],
    levels: &[f64],
    timeout_ms: f64,
) -> Vec<f64> {
    conrec_core(z, rows, cols, xs, ys, levels, timeout_ms)
}

/// A 2D intensity grid kept resident in Wasm memory.
///
/// Interactive contour-level changes (wheel zoom) recompute contours on
/// the same matrix over and over; keeping the matrix on this side of the
/// JS/Wasm boundary means only the levels and the resulting segments are
/// copied per call.
#[wasm_bindgen]
pub struct ContourGrid {
    z: Vec<f64>,
    rows: usize,
    cols: usize,
    xs: Vec<f64>,
    ys: Vec<f64>,
}

#[wasm_bindgen]
impl ContourGrid {
    #[wasm_bindgen(constructor)]
    pub fn new(z: Vec<f64>, rows: usize, cols: usize, xs: Vec<f64>, ys: Vec<f64>) -> ContourGrid {
        ContourGrid { z, rows, cols, xs, ys }
    }

    pub fn contours(&self, levels: &[f64], timeout_ms: f64) -> Vec<f64> {
        conrec_core(
            &self.z, self.rows, self.cols, &self.xs, &self.ys, levels, timeout_ms,
        )
    }
}

fn conrec_core(
    z: &[f64],
    rows: usize,
    cols: usize,
    xs: &[f64],
    ys: &[f64],
    levels: &[f64],
    timeout_ms: f64,
) -> Vec<f64> {
    let mut sorted_levels: Vec<f64> = levels.to_vec();
    sorted_levels.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let nc = sorted_levels.len();

    // Per-level output segments: [x1, y1, x2, y2, ...]
    let mut lines: Vec<Vec<f64>> = vec![Vec::new(); nc];
    let mut timed_out = false;

    if nc > 0 && rows > 1 && cols > 1 {
        // In ml-conrec with swapAxes=false: the algorithm's `x` axis runs
        // along the matrix rows (coordinates = ys) and its `y` axis along
        // the columns (coordinates = xs); the drawer then emits (y, x).
        let x = ys; // length rows
        let y = xs; // length cols

        let z0 = sorted_levels[0];
        let znc1 = sorted_levels[nc - 1];

        let im = [0usize, 1, 1, 0];
        let jm = [0usize, 0, 1, 1];
        let castab: [[[i32; 3]; 3]; 3] = [
            [[0, 0, 8], [0, 2, 5], [7, 6, 9]],
            [[0, 3, 4], [1, 3, 1], [4, 3, 0]],
            [[9, 6, 7], [5, 2, 0], [8, 0, 0]],
        ];

        let mut h = [0f64; 5];
        let mut sh = [0i32; 5];
        let mut xh = [0f64; 5];
        let mut yh = [0f64; 5];

        let start = js_sys::Date::now();
        // SAFETY: i < rows and j < cols are guaranteed by the loop bounds;
        // unchecked access removes bounds checks from the hot loop.
        let at = |i: usize, j: usize| unsafe { *z.get_unchecked(i * cols + j) };

        // Unlike ml-conrec (outer loop over columns), iterate rows in the
        // outer loop so the flat matrix is read sequentially. The emitted
        // segment set is identical, only its order differs, and order is
        // irrelevant for the disconnected-segment SVG paths NMRium draws.
        for i in 0..rows - 1 {
            if timeout_ms > 0.0 && js_sys::Date::now() - start > timeout_ms {
                timed_out = true;
                break;
            }
            for j in 0..cols - 1 {
                let dij = at(i, j);
                let dij1 = at(i, j + 1);
                let di1j = at(i + 1, j);
                let di1j1 = at(i + 1, j + 1);

                let (min1, max1) = if dij > dij1 { (dij1, dij) } else { (dij, dij1) };
                let (min2, max2) = if di1j > di1j1 {
                    (di1j1, di1j)
                } else {
                    (di1j, di1j1)
                };
                let dmin = min1.min(min2);
                let dmax = max1.max(max2);
                if dmax < z0 || dmin > znc1 {
                    continue;
                }
                for k in 0..nc {
                    let level = sorted_levels[k];
                    if level < dmin || level > dmax {
                        continue;
                    }
                    for m in (0..=4usize).rev() {
                        if m > 0 {
                            h[m] = at(i + im[m - 1], j + jm[m - 1]) - level;
                            xh[m] = x[i + im[m - 1]];
                            yh[m] = y[j + jm[m - 1]];
                        } else {
                            h[0] = 0.25 * (h[1] + h[2] + h[3] + h[4]);
                            xh[0] = 0.5 * (x[i] + x[i + 1]);
                            yh[0] = 0.5 * (y[j] + y[j + 1]);
                        }
                        sh[m] = if h[m] > EPSILON {
                            1
                        } else if h[m] < -EPSILON {
                            -1
                        } else {
                            0
                        };
                    }

                    let xsect = |p1: usize, p2: usize, h: &[f64; 5], xh: &[f64; 5]| {
                        (h[p2] * xh[p1] - h[p1] * xh[p2]) / (h[p2] - h[p1])
                    };
                    let ysect = |p1: usize, p2: usize, h: &[f64; 5], yh: &[f64; 5]| {
                        (h[p2] * yh[p1] - h[p1] * yh[p2]) / (h[p2] - h[p1])
                    };

                    for m in 1..=4usize {
                        let m1 = m;
                        let m2 = 0usize;
                        let m3 = if m != 4 { m + 1 } else { 1 };
                        let case_value = castab[(sh[m1] + 1) as usize][(sh[m2] + 1) as usize]
                            [(sh[m3] + 1) as usize];
                        if case_value == 0 {
                            continue;
                        }
                        let (x1, y1, x2, y2) = match case_value {
                            1 => (xh[m1], yh[m1], xh[m2], yh[m2]),
                            2 => (xh[m2], yh[m2], xh[m3], yh[m3]),
                            3 => (xh[m3], yh[m3], xh[m1], yh[m1]),
                            4 => (
                                xh[m1],
                                yh[m1],
                                xsect(m2, m3, &h, &xh),
                                ysect(m2, m3, &h, &yh),
                            ),
                            5 => (
                                xh[m2],
                                yh[m2],
                                xsect(m3, m1, &h, &xh),
                                ysect(m3, m1, &h, &yh),
                            ),
                            6 => (
                                xh[m3],
                                yh[m3],
                                xsect(m1, m2, &h, &xh),
                                ysect(m1, m2, &h, &yh),
                            ),
                            7 => (
                                xsect(m1, m2, &h, &xh),
                                ysect(m1, m2, &h, &yh),
                                xsect(m2, m3, &h, &xh),
                                ysect(m2, m3, &h, &yh),
                            ),
                            8 => (
                                xsect(m2, m3, &h, &xh),
                                ysect(m2, m3, &h, &yh),
                                xsect(m3, m1, &h, &xh),
                                ysect(m3, m1, &h, &yh),
                            ),
                            9 => (
                                xsect(m3, m1, &h, &xh),
                                ysect(m3, m1, &h, &yh),
                                xsect(m1, m2, &h, &xh),
                                ysect(m1, m2, &h, &yh),
                            ),
                            _ => continue,
                        };
                        // BasicContourDrawer with swapAxes=false emits (y, x)
                        let segment = &mut lines[k];
                        segment.push(y1);
                        segment.push(x1);
                        segment.push(y2);
                        segment.push(x2);
                    }
                }
            }
        }
    }

    let total: usize = lines.iter().map(|l| l.len()).sum();
    let mut out = Vec::with_capacity(2 + 2 * nc + total);
    out.push(if timed_out { 1.0 } else { 0.0 });
    out.push(nc as f64);
    out.extend_from_slice(&sorted_levels);
    for level_lines in &lines {
        out.push(level_lines.len() as f64);
    }
    for level_lines in &lines {
        out.extend_from_slice(level_lines);
    }
    out
}

/// In-place FFT (or inverse FFT) of a complex signal given as separate
/// real and imaginary arrays. Uses rustfft's mixed-radix planner, so any
/// length is supported. The inverse transform is normalized by 1/n.
#[wasm_bindgen]
pub fn fft(re: &mut [f64], im: &mut [f64], inverse: bool) {
    let n = re.len();
    if n == 0 || im.len() != n {
        return;
    }
    let mut buffer: Vec<Complex<f64>> = re
        .iter()
        .zip(im.iter())
        .map(|(&r, &i)| Complex::new(r, i))
        .collect();

    let transform = FFT_CACHE.with(|cache| {
        cache
            .borrow_mut()
            .entry((n, inverse))
            .or_insert_with(|| {
                let mut planner = FftPlanner::new();
                if inverse {
                    planner.plan_fft_inverse(n)
                } else {
                    planner.plan_fft_forward(n)
                }
            })
            .clone()
    });
    transform.process(&mut buffer);

    let scale = if inverse { 1.0 / n as f64 } else { 1.0 };
    for (index, value) in buffer.iter().enumerate() {
        re[index] = value.re * scale;
        im[index] = value.im * scale;
    }
}

/// Iterative polynomial baseline estimation (ModPoly-style).
/// Fits a polynomial of `degree` to `y`, then clips points above the fit
/// and refits, `iterations` times. Returns the estimated baseline.
#[wasm_bindgen]
pub fn baseline_polynomial(y: &[f64], degree: usize, iterations: usize) -> Vec<f64> {
    let n = y.len();
    if n == 0 {
        return Vec::new();
    }
    let degree = degree.min(6).max(1);
    let mut work: Vec<f64> = y.to_vec();
    // Normalized x to keep the Vandermonde system well conditioned.
    let xs: Vec<f64> = (0..n)
        .map(|i| (i as f64 / (n.max(2) - 1) as f64) * 2.0 - 1.0)
        .collect();
    let mut baseline = vec![0.0; n];

    for _ in 0..iterations.max(1) {
        let coefficients = polyfit(&xs, &work, degree);
        for i in 0..n {
            let mut value = 0.0;
            for (p, &c) in coefficients.iter().enumerate() {
                value += c * xs[i].powi(p as i32);
            }
            baseline[i] = value;
            if work[i] > value {
                work[i] = value;
            }
        }
    }
    baseline
}

fn polyfit(xs: &[f64], ys: &[f64], degree: usize) -> Vec<f64> {
    let m = degree + 1;
    // Normal equations: A^T A c = A^T y with A the Vandermonde matrix.
    let mut ata = vec![vec![0.0f64; m]; m];
    let mut aty = vec![0.0f64; m];
    for (&x, &y) in xs.iter().zip(ys.iter()) {
        let mut powers = vec![1.0f64; m];
        for p in 1..m {
            powers[p] = powers[p - 1] * x;
        }
        for r in 0..m {
            aty[r] += powers[r] * y;
            for c in 0..m {
                ata[r][c] += powers[r] * powers[c];
            }
        }
    }
    // Gaussian elimination with partial pivoting.
    for col in 0..m {
        let mut pivot = col;
        for row in col + 1..m {
            if ata[row][col].abs() > ata[pivot][col].abs() {
                pivot = row;
            }
        }
        ata.swap(col, pivot);
        aty.swap(col, pivot);
        let diag = ata[col][col];
        if diag.abs() < 1e-12 {
            continue;
        }
        for row in col + 1..m {
            let factor = ata[row][col] / diag;
            for c in col..m {
                ata[row][c] -= factor * ata[col][c];
            }
            aty[row] -= factor * aty[col];
        }
    }
    let mut coefficients = vec![0.0f64; m];
    for row in (0..m).rev() {
        let mut sum = aty[row];
        for c in row + 1..m {
            sum -= ata[row][c] * coefficients[c];
        }
        let diag = ata[row][row];
        coefficients[row] = if diag.abs() < 1e-12 { 0.0 } else { sum / diag };
    }
    coefficients
}

/// Simple 1D peak picking: local maxima above `min_height`, refined with
/// parabolic interpolation. Returns flat `[position, height, ...]` pairs
/// where `position` is a fractional index into `y`.
#[wasm_bindgen]
pub fn peak_pick(y: &[f64], min_height: f64) -> Vec<f64> {
    let n = y.len();
    let mut peaks = Vec::new();
    if n < 3 {
        return peaks;
    }
    for i in 1..n - 1 {
        let value = y[i];
        if value < min_height || value < y[i - 1] || value <= y[i + 1] {
            continue;
        }
        // Parabolic interpolation around the maximum.
        let denominator = y[i - 1] - 2.0 * value + y[i + 1];
        let (position, height) = if denominator.abs() > 1e-12 {
            let delta = 0.5 * (y[i - 1] - y[i + 1]) / denominator;
            let interpolated = value - 0.25 * (y[i - 1] - y[i + 1]) * delta;
            (i as f64 + delta, interpolated)
        } else {
            (i as f64, value)
        };
        peaks.push(position);
        peaks.push(height);
    }
    peaks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn baseline_of_flat_signal_is_flat() {
        let y = vec![5.0; 32];
        let baseline = baseline_polynomial(&y, 3, 10);
        for value in baseline {
            assert!((value - 5.0).abs() < 1e-6);
        }
    }

    #[test]
    fn fft_then_ifft_roundtrips() {
        let mut re: Vec<f64> = (0..16).map(|i| (i as f64).sin()).collect();
        let mut im = vec![0.0; 16];
        let original = re.clone();
        fft(&mut re, &mut im, false);
        fft(&mut re, &mut im, true);
        for (a, b) in re.iter().zip(original.iter()) {
            assert!((a - b).abs() < 1e-9);
        }
    }

    #[test]
    fn peak_pick_finds_single_peak() {
        let mut y = vec![0.0; 21];
        for (i, value) in y.iter_mut().enumerate() {
            *value = (-((i as f64 - 10.0).powi(2)) / 4.0).exp();
        }
        let peaks = peak_pick(&y, 0.1);
        assert_eq!(peaks.len(), 2);
        assert!((peaks[0] - 10.0).abs() < 0.5);
    }
}
