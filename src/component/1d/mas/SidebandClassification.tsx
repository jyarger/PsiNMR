import { memo, useMemo } from 'react';

import { isSpectrum1D } from '../../../data/data1d/Spectrum1D/index.js';
import { useScaleChecked } from '../../context/ScaleContext.js';
import useSpectrum from '../../hooks/useSpectrum.js';

import { useMasSidebands } from './masSidebandsState.js';

/**
 * Tags picked peaks that sit on the magic-angle-spinning grid (δiso ± n·νr)
 * as spinning sidebands, and the one at the anchor as isotropic. Works with
 * the νr tool: set the rate and δiso anchor, and your picked peaks get
 * labelled iso / ±n so real (chemically distinct) peaks are easy to tell
 * apart from sidebands of a single site.
 *
 * Classification is relative to the single δiso anchor, matching the tool's
 * model; a peak counts as an order-n sideband when it lands within 30% of the
 * sideband spacing of δiso + n·νr.
 */
function SidebandClassification() {
  const { enabled, rate, anchor, count } = useMasSidebands();
  const { scaleX, scaleY } = useScaleChecked();
  const spectrum = useSpectrum(null);

  const spectrum1D = spectrum && isSpectrum1D(spectrum) ? spectrum : null;

  const autoAnchor = useMemo(() => {
    if (!spectrum1D || spectrum1D.info.isFid) return null;
    const { x, re } = spectrum1D.data;
    if (!x || !re || x.length === 0) return null;
    let maxIndex = 0;
    for (let i = 1; i < re.length; i++) {
      if (re[i] > re[maxIndex]) maxIndex = i;
    }
    return x[maxIndex];
  }, [spectrum1D]);

  if (!enabled || !spectrum1D || spectrum1D.info.isFid) return null;

  const peaks = spectrum1D.peaks?.values ?? [];
  const observationMHz = spectrum1D.info.originFrequency;
  const anchorPpm = anchor ?? autoAnchor;
  if (
    peaks.length === 0 ||
    !observationMHz ||
    rate <= 0 ||
    anchorPpm === null
  ) {
    return null;
  }

  const spacing = rate / observationMHz; // ppm per sideband order

  return (
    <g
      className="mas-sideband-classification"
      style={{ pointerEvents: 'none' }}
      data-testid="mas-sideband-classification"
    >
      {peaks.map((peak) => {
        const order = Math.round((peak.x - anchorPpm) / spacing);
        if (Math.abs(order) > count) return null;
        const residual = Math.abs(peak.x - (anchorPpm + order * spacing));
        if (residual > spacing * 0.3) return null;

        const isIsotropic = order === 0;
        const label = isIsotropic
          ? 'iso'
          : `${order > 0 ? '+' : '−'}${Math.abs(order)}`;
        const x = scaleX()(peak.x);
        const y = scaleY()(peak.y);

        return (
          <g key={peak.id} transform={`translate(${x},${y})`}>
            <rect
              x={-11}
              y={-30}
              width={22}
              height={14}
              rx={3}
              fill={
                isIsotropic
                  ? 'var(--psi-plot-surface, #fff)'
                  : 'var(--psi-accent, #3d8f85)'
              }
              stroke="var(--psi-accent, #3d8f85)"
              strokeWidth={1}
              opacity={0.92}
            />
            <text
              x={0}
              y={-20}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill={
                isIsotropic
                  ? 'var(--psi-accent, #3d8f85)'
                  : 'var(--psi-on-accent, #fff)'
              }
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default memo(SidebandClassification);
