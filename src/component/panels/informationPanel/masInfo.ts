/**
 * Derives a friendly solid-state-NMR (magic-angle-spinning) readout from a
 * spectrum's acquisition metadata for the Information panel. The raw
 * parameters are already listed under "Other spectrum parameters"; this
 * surfaces the few that matter for MAS with human labels and units.
 *
 * Currently reads Varian parameter names (srate, tHX, seqfil) with common
 * Bruker fallbacks (MASR, PULPROG); returns only the fields that resolve, so
 * the section is hidden for non-MAS data. Values come straight from the
 * recorded metadata — the recorded MAS rate can be stale, so the on-plot νr
 * tool is the way to measure the true spinning rate.
 */
export function getMasInfo(
  meta: Record<string, unknown> | undefined | null,
): Record<string, string> {
  if (!meta) return {};

  const first = (key: string): unknown => {
    const value = meta[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const num = (key: string): number | undefined => {
    const value = Number(first(key));
    return Number.isFinite(value) ? value : undefined;
  };

  const sequenceValue = first('seqfil') ?? first('PULPROG');
  const sequence =
    typeof sequenceValue === 'string' ? sequenceValue.trim() : '';
  const isCrossPolarization = /cp/i.test(sequence);

  const rateHz = num('srate') ?? num('MASR') ?? num('masr');
  const contactUs = isCrossPolarization ? num('tHX') : undefined;

  const out: Record<string, string> = {};
  if (sequence) out['Pulse sequence'] = sequence;
  if (rateHz !== undefined) {
    out['MAS rate'] = `${rateHz} Hz (${(rateHz / 1000).toFixed(2)} kHz)`;
  }
  if (contactUs !== undefined) {
    out['CP contact time'] = `${contactUs} µs (${(contactUs / 1000).toFixed(
      2,
    )} ms)`;
  }
  return out;
}
