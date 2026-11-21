import type { Spectrum } from '@zakodium/nmrium-core';

/**
 * Keep raw FIDs raw when their processed twin was imported alongside them.
 *
 * With the import option `dataSelection: 'both'`, a dataset that contains a
 * vendor-processed spectrum and its raw FID (e.g. a Bruker experiment with
 * both `fid` and `pdata/1/1r`, or a 2D `ser` with `2rr`) yields two spectra
 * for the same experiment. At read time the auto-processing plugin queues a
 * full filter chain (digitalFilter → apodization → zeroFilling → fft →
 * phaseCorrection) on every FID; those filters are executed when the
 * spectrum is initiated, which would turn the kept FID into a second,
 * near-identical processed spectrum.
 *
 * This pass runs before initiation and clears the queued filters on any FID
 * whose processed twin is present, so the FID stays time-domain — visible as
 * raw data and processable interactively from the Processing panel. FIDs
 * without a processed twin (FID-only imports) are untouched and keep today's
 * auto-processing behavior.
 *
 * The queued digital-filter correction (`digitalFilter` / `digitalFilter2D`)
 * is kept: it is a time-domain group-delay rotation that the loader queues
 * on every digitally filtered Bruker FID regardless of the auto-processing
 * preference, and the 1D fft filter phases its fractional part only when
 * that filter entry was applied — without it an interactive FT would carry
 * a large first-order phase roll.
 *
 * Twins are matched by the loader-assigned experiment identity: identical
 * `info.name` (source path incl. experiment number), same dimension and the
 * same nucleus / nuclei.
 */
export function keepTwinnedFidsRaw(spectra: Spectrum[]) {
  const processedKeys = new Set<string>();
  for (const spectrum of spectra) {
    const key = twinKey(spectrum);
    if (key && !spectrum.info?.isFid) {
      processedKeys.add(key);
    }
  }
  if (processedKeys.size === 0) return;

  for (const spectrum of spectra) {
    const key = twinKey(spectrum);
    if (
      key &&
      spectrum.info?.isFid &&
      Array.isArray(spectrum.filters) &&
      spectrum.filters.length > 0 &&
      processedKeys.has(key)
    ) {
      spectrum.filters = spectrum.filters.filter((filter) =>
        isDigitalFilterCorrection((filter as { name?: string })?.name),
      ) as typeof spectrum.filters;
    }
  }
}

function isDigitalFilterCorrection(name: string | undefined): boolean {
  return name === 'digitalFilter' || name === 'digitalFilter2D';
}

function twinKey(spectrum: Spectrum): string | null {
  const info = spectrum.info;
  if (!info || typeof info.name !== 'string' || info.name.length === 0) {
    return null;
  }
  return `${info.dimension}|${String(info.nucleus)}|${info.name}`;
}
