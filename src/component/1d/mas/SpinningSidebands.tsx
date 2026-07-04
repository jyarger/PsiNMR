import { memo, useMemo } from 'react';

import { isSpectrum1D } from '../../../data/data1d/Spectrum1D/index.js';
import { useChartData } from '../../context/ChartContext.js';
import { useScaleChecked } from '../../context/ScaleContext.js';
import useSpectrum from '../../hooks/useSpectrum.js';

import { useMasSidebands } from './masSidebandsState.js';

/**
 * Vertical guides marking magic-angle-spinning sidebands at
 * δiso ± n·νr for the active 1D spectrum. νr is in Hz; the ppm spacing is
 * νr / observation frequency (MHz). See masSidebandsState.ts.
 */
function SpinningSidebands() {
  const { enabled, rate, anchor, count } = useMasSidebands();
  const { height, margin } = useChartData();
  const { scaleX } = useScaleChecked();
  const spectrum = useSpectrum(null);

  const spectrum1D = spectrum && isSpectrum1D(spectrum) ? spectrum : null;

  // Auto-anchor: the tallest point of the real trace (the isotropic line
  // usually dominates), used until the user types an explicit position.
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

  const observationMHz = spectrum1D.info.originFrequency;
  if (!observationMHz || rate <= 0) return null;

  const anchorPpm = anchor ?? autoAnchor;
  if (anchorPpm === null) return null;

  const spacing = rate / observationMHz; // ppm per sideband order
  const y1 = margin.top;
  const y2 = height - margin.bottom;

  const guides: Array<{ order: number; ppm: number }> = [];
  for (let n = -count; n <= count; n++) {
    guides.push({ order: n, ppm: anchorPpm + n * spacing });
  }

  return (
    <g
      className="mas-sidebands"
      style={{ pointerEvents: 'none' }}
      data-testid="mas-sidebands"
    >
      {guides.map(({ order, ppm }) => {
        const x = scaleX()(ppm);
        const isAnchor = order === 0;
        return (
          <g key={order}>
            <line
              x1={x}
              x2={x}
              y1={y1}
              y2={y2}
              stroke="var(--psi-accent, #3d8f85)"
              strokeWidth={isAnchor ? 1.5 : 1}
              strokeDasharray={isAnchor ? undefined : '5 4'}
              opacity={isAnchor ? 0.9 : 0.55}
            />
            <text
              x={x}
              y={y1 + 12}
              textAnchor="middle"
              fontSize={11}
              fill="var(--psi-accent, #3d8f85)"
              opacity={0.9}
            >
              {isAnchor ? 'δiso' : `${order > 0 ? '+' : ''}${order}νr`}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default memo(SpinningSidebands);
