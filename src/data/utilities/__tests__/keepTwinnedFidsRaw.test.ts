import type { Spectrum } from '@zakodium/nmrium-core';
import { describe, expect, it } from 'vitest';

import { keepTwinnedFidsRaw } from '../keepTwinnedFidsRaw.js';

const AUTO_CHAIN = [
  { name: 'digitalFilter' },
  { name: 'apodization' },
  { name: 'zeroFilling' },
  { name: 'fft' },
  { name: 'phaseCorrection' },
];

function spectrum(partial: {
  name?: string;
  nucleus: string | string[];
  dimension?: number;
  isFid: boolean;
  filters?: Array<{ name: string }>;
}): Spectrum {
  const { name = 'exp/1', nucleus, dimension = 1, isFid, filters } = partial;
  return {
    info: { name, nucleus, dimension, isFid },
    filters: filters ?? (isFid ? structuredClone(AUTO_CHAIN) : []),
  } as unknown as Spectrum;
}

describe('keepTwinnedFidsRaw', () => {
  it('clears the queued chain on a FID whose processed twin is present, keeping the digital-filter correction', () => {
    const fid = spectrum({ nucleus: '1H', isFid: true });
    const processed = spectrum({ nucleus: '1H', isFid: false });
    keepTwinnedFidsRaw([fid, processed]);
    // The group-delay rotation stays (the FID remains time-domain and the
    // 1D fft filter needs it to phase correctly); everything else goes.
    expect(fid.filters).toEqual([{ name: 'digitalFilter' }]);
  });

  it('drops the whole chain when there is no digital filter (non-Bruker data)', () => {
    const fid = spectrum({
      nucleus: '1H',
      isFid: true,
      filters: [{ name: 'apodization' }, { name: 'fft' }],
    });
    const processed = spectrum({ nucleus: '1H', isFid: false });
    keepTwinnedFidsRaw([fid, processed]);
    expect(fid.filters).toHaveLength(0);
  });

  it('keeps the chain on a FID without a processed twin (FID-only import)', () => {
    const fid = spectrum({ nucleus: '79Br', isFid: true, name: 'kbr/1' });
    keepTwinnedFidsRaw([fid]);
    expect(fid.filters).toHaveLength(AUTO_CHAIN.length);
  });

  it('does not pair across different experiments or nuclei', () => {
    const fid1 = spectrum({ nucleus: '31P', isFid: true, name: 'setup/5' });
    const fid2 = spectrum({ nucleus: '1H', isFid: true, name: 'setup/2' });
    const processedOther = spectrum({
      nucleus: '31P',
      isFid: false,
      name: 'setup/6',
    });
    const processedWrongNucleus = spectrum({
      nucleus: '13C',
      isFid: false,
      name: 'setup/2',
    });
    keepTwinnedFidsRaw([fid1, fid2, processedOther, processedWrongNucleus]);
    expect(fid1.filters).toHaveLength(AUTO_CHAIN.length);
    expect(fid2.filters).toHaveLength(AUTO_CHAIN.length);
  });

  it('pairs 2D ser with its processed 2D twin, matching dimension', () => {
    const ser = spectrum({
      nucleus: ['1H', '13C'],
      dimension: 2,
      isFid: true,
      name: 'hsqc/10',
      filters: [
        { name: 'digitalFilter2D' },
        { name: 'apodizationDimension2' },
        { name: 'fftDimension1' },
      ],
    });
    const processed2D = spectrum({
      nucleus: ['1H', '13C'],
      dimension: 2,
      isFid: false,
      name: 'hsqc/10',
    });
    // A 1D processed spectrum with the same name must NOT satisfy the 2D FID.
    const unrelated1D = spectrum({
      nucleus: '1H',
      dimension: 1,
      isFid: false,
      name: 'cosy/11',
    });
    const ser2 = spectrum({
      nucleus: ['1H', '1H'],
      dimension: 2,
      isFid: true,
      name: 'cosy/11',
    });
    keepTwinnedFidsRaw([ser, processed2D, unrelated1D, ser2]);
    expect(ser.filters).toEqual([{ name: 'digitalFilter2D' }]);
    expect(ser2.filters).toHaveLength(AUTO_CHAIN.length);
  });

  it('ignores spectra without a usable name and tolerates missing filters', () => {
    const anonymousFid = spectrum({ nucleus: '1H', isFid: true, name: '' });
    const anonymousProcessed = spectrum({
      nucleus: '1H',
      isFid: false,
      name: '',
    });
    const bare = { info: { isFid: true } } as unknown as Spectrum;
    keepTwinnedFidsRaw([anonymousFid, anonymousProcessed, bare]);
    expect(anonymousFid.filters).toHaveLength(AUTO_CHAIN.length);
  });
});
