import type { Spectrum1D, Spectrum2D } from '@zakodium/nmrium-core';
import type { NmrData1D } from 'cheminfo-types';
import { xSequentialFillFromTo } from 'ml-spectra-processing';

import type { UsedColors } from '../../../types/UsedColors.js';
import { initiateDatum1D } from '../../data1d/Spectrum1D/index.js';

import { isFid2DData } from './isSpectrum2D.js';

export type FidTraceMode = 'first' | 'sum';

export interface ExtractFidTraceOptions {
  mode: FidTraceMode;
  usedColors?: UsedColors;
}

const TRACE_LABELS: Record<FidTraceMode, string> = {
  first: 'direct FID (first increment)',
  sum: 'direct FID (sum of increments)',
};

/**
 * Extract a direct-dimension 1D FID trace from a raw 2D FID (e.g. a Bruker
 * `ser`) as a standalone complex time-domain Spectrum1D, so the full
 * interactive 1D processing suite (apodization, zero filling, FT, phasing)
 * applies to it. One row of the matrix is the acquisition FID of a single
 * increment ('first'), 'sum' takes the complex sum of all increments.
 *
 * When the source carries a digital-filter group delay (Bruker), the trace
 * is created with the same queued `digitalFilter` correction the loader
 * gives every raw 1D FID, so a later FT phases correctly.
 *
 * Indirect-dimension (t1 interferogram) extraction is intentionally not
 * offered yet: a correct complex t1 FID requires acquisition-scheme-aware
 * recombination of the increment rows (States / TPPI / echo-antiecho) and a
 * true t1 time axis — the raw matrix's y range is an increment index, not
 * seconds.
 *
 * Returns null when the spectrum has no raw 2D FID data.
 */
export function extractFidTrace(
  spectrum: Spectrum2D,
  options: ExtractFidTraceOptions,
): Spectrum1D | null {
  const { mode, usedColors } = options;
  const { data, info } = spectrum;

  if (!info.isFid || !isFid2DData(data)) return null;

  const { re, im } = data;
  const size = re.z[0]?.length ?? 0;
  const yLength = re.z.length;
  if (size === 0 || yLength === 0) return null;

  const reTrace = new Float64Array(size);
  const imTrace = im ? new Float64Array(size) : undefined;

  const lastRow = mode === 'first' ? 0 : yLength - 1;
  for (let row = 0; row <= lastRow; row++) {
    for (let i = 0; i < size; i++) {
      reTrace[i] += re.z[row][i];
      if (imTrace && im) imTrace[i] += im.z[row][i];
    }
  }

  const baseName =
    typeof info.name === 'string' && info.name.length > 0
      ? info.name
      : 'spectrum';

  const scalarInfo = scalarizeInfo(
    info as unknown as Record<string, unknown>,
    0,
  );
  const traceInfo = {
    ...scalarInfo,
    dimension: 1,
    experiment: '1d',
    isFid: true,
    isFt: false,
    isFtDimensionOne: false,
    isComplex: Boolean(imTrace),
    name: `${baseName} — ${TRACE_LABELS[mode]}`,
  };

  const traceData: NmrData1D = {
    x: xSequentialFillFromTo({ from: re.minX, to: re.maxX, size }),
    re: reTrace,
    ...(imTrace && { im: imTrace }),
  };

  // Queue the group-delay correction exactly like the loader does for raw
  // 1D FIDs; initiateDatum1D applies it, and the 1D fft filter then handles
  // the fractional part. Without it an interactive FT of digitally filtered
  // Bruker data would carry a huge first-order phase roll.
  const digitalFilterValue = scalarInfo.digitalFilter;
  const filters =
    imTrace && typeof digitalFilterValue === 'number' && digitalFilterValue > 0
      ? [
          {
            name: 'digitalFilter',
            value: { digitalFilterValue },
            enabled: true,
          },
        ]
      : [];

  return initiateDatum1D(
    { info: traceInfo, data: traceData, filters },
    { usedColors },
  );
}

/**
 * Collapse a 2D info object to one dimension: per-dimension array values
 * (nucleus, originFrequency, ...) take the element at `index`, scalars are
 * kept as-is. Same convention as getMissingProjection.
 */
function scalarizeInfo(
  info: Record<string, unknown>,
  index: number,
): Record<string, unknown> {
  const newInfo: Record<string, unknown> = {};
  for (const key in info) {
    const value = info[key];
    newInfo[key] = Array.isArray(value) ? value[index] : value;
  }
  return newInfo;
}
