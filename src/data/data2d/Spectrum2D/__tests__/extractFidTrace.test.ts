import type { Spectrum2D } from '@zakodium/nmrium-core';
import { describe, expect, it } from 'vitest';

import type { ExtractFidTraceOptions } from '../extractFidTrace.js';
import { extractFidTrace } from '../extractFidTrace.js';

const usedColors = { '1d': [], '2d': [] };

function makeSer(options: { digitalFilter?: number } = {}): Spectrum2D {
  const { digitalFilter } = options;
  // 3 increments x 4 direct points.
  const re = {
    z: [
      [1, 2, 3, 4],
      [10, 20, 30, 40],
      [100, 200, 300, 400],
    ],
    minX: 0,
    maxX: 0.3,
    minY: 0,
    maxY: 3,
    minZ: 1,
    maxZ: 400,
  };
  const im = {
    z: [
      [-1, -2, -3, -4],
      [-10, -20, -30, -40],
      [-100, -200, -300, -400],
    ],
    minX: 0,
    maxX: 0.3,
    minY: 0,
    maxY: 3,
    minZ: -400,
    maxZ: -1,
  };
  return {
    info: {
      name: 'cosy/2',
      nucleus: ['1H', '13C'],
      originFrequency: [400.13, 100.61],
      isFid: true,
      isComplex: true,
      dimension: 2,
      ...(digitalFilter !== undefined && { digitalFilter }),
    },
    data: { re, im },
  } as unknown as Spectrum2D;
}

function extractOrThrow(spectrum: Spectrum2D, options: ExtractFidTraceOptions) {
  const trace = extractFidTrace(spectrum, options);
  if (!trace) throw new Error('expected a trace');
  return trace;
}

describe('extractFidTrace', () => {
  it('extracts the first increment as a complex 1D FID', () => {
    const trace = extractOrThrow(makeSer(), { mode: 'first', usedColors });
    expect([...trace.data.re]).toEqual([1, 2, 3, 4]);
    expect([...(trace.data.im as Float64Array)]).toEqual([-1, -2, -3, -4]);
    expect(trace.data.x).toHaveLength(4);
    expect(trace.data.x[0]).toBe(0);
    expect(trace.data.x.at(-1)).toBeCloseTo(0.3);
    expect(trace.info).toMatchObject({
      nucleus: '1H',
      originFrequency: 400.13,
      isFid: true,
      isComplex: true,
      isFt: false,
      dimension: 1,
    });
    expect(trace.info.name).toContain('cosy/2');
    expect(trace.info.name).toContain('first increment');
  });

  it('sums all increments complex-wise', () => {
    const trace = extractOrThrow(makeSer(), { mode: 'sum', usedColors });
    expect([...trace.data.re]).toEqual([111, 222, 333, 444]);
    expect([...(trace.data.im as Float64Array)]).toEqual([
      -111, -222, -333, -444,
    ]);
  });

  it('queues and applies the digital-filter correction when present', () => {
    const trace = extractOrThrow(makeSer({ digitalFilter: 2 }), {
      mode: 'first',
      usedColors,
    });
    expect(trace.filters).toHaveLength(1);
    expect(trace.filters[0]).toMatchObject({
      name: 'digitalFilter',
      enabled: true,
      value: { digitalFilterValue: 2 },
    });
    // initiateDatum1D re-applies queued filters: the first floor(2) points
    // are rotated away, so the trace now starts at the third point.
    expect([...trace.data.re].slice(0, 2)).toEqual([3, 4]);
  });

  it('returns null for a spectrum without raw 2D FID data', () => {
    const ser = makeSer();
    (ser as { info: { isFid: boolean } }).info.isFid = false;
    expect(extractFidTrace(ser, { mode: 'first', usedColors })).toBeNull();
  });
});
