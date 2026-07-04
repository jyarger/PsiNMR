import type {
  AxisUnit1DFid,
  AxisUnit1DFt,
  AxisUnit2DFid,
  AxisUnit2DFt,
  AxisUnit,
  Nucleus1DUnit,
  Nucleus2DUnit,
} from '@zakodium/nmrium-core';
import {
  axisUnits1DFid,
  axisUnits1DFt,
  axisUnits2DFid,
  axisUnits2DFt,
  defaultAxisUnit1DFid,
  defaultAxisUnit1DFt,
  defaultAxisUnit2DFid,
  defaultAxisUnit2DFt,
} from '@zakodium/nmrium-core';
import { scaleLinear } from 'd3-scale';
import { useCallback, useMemo } from 'react';
import { assert, assertUnreachable } from 'react-science/ui';
import { match } from 'ts-pattern';

import { isSpectrum2D } from '../../data/data2d/Spectrum2D/index.ts';
import { useScale2DX, useScale2DY } from '../2d/utilities/scale.ts';
import { useChartData } from '../context/ChartContext.tsx';
import { useDispatch } from '../context/DispatchContext.tsx';
import { useScaleChecked } from '../context/ScaleContext.tsx';

import { useActiveNucleusTab } from './useActiveNucleusTab.ts';
import { useActiveSpectra } from './useActiveSpectra.ts';
import useSpectrum from './useSpectrum.ts';
import { useVisibleSpectra1D } from './use_visible_spectra_1d.ts';

/**
 * PsiNMR extends the stock unit set with kHz: solid-state spectra are
 * routinely plotted in frequency (kHz), where MAS sideband spacings and
 * wideline patterns read directly.
 */
export type PsiAxisUnit = AxisUnit | 'khz';
type PsiAxisUnit1DFt = AxisUnit1DFt | 'khz';

const psiAxisUnits1DFt: readonly PsiAxisUnit1DFt[] = [...axisUnits1DFt, 'khz'];

export const axisUnitToLabel: Record<PsiAxisUnit, string> = {
  s: 'time [s]',
  hz: 'frequency [Hz]',
  khz: 'ν [kHz]',
  ppm: 'δ [ppm]',
  pt: 'index [pt]',
};

function assertIn<V, T extends V>(value: V, values: T[]): asserts value is T {
  if (values.includes(value as any)) return;

  throw new Error(`Value ${String(value)} is not in [${values.join(',')}]`);
}

export function useHorizontalAxisUnit() {
  const {
    originDomain: { xDomain: originXDomain },
  } = useChartData();
  const spectra = useVisibleSpectra1D();
  const activeSpectra = useActiveSpectra();
  const firstActiveSpectrum = useMemo(() => {
    const firstSelected = activeSpectra?.find((s) => s.selected);
    return firstSelected
      ? spectra.find((s) => s.id === firstSelected.id)
      : spectra[0];
  }, [activeSpectra, spectra]);
  const { scaleX } = useScaleChecked();

  const { nucleus, nucleusUnits } = useAxisUnit1D();
  const dispatch = useDispatch();

  const mode: keyof Nucleus1DUnit['horizontal'] = firstActiveSpectrum?.info.isFt
    ? 'ft'
    : 'fid';
  const unit: AxisUnit1DFid | PsiAxisUnit1DFt = nucleusUnits.horizontal[mode];
  const allowedUnits: readonly AxisUnit1DFid[] | readonly PsiAxisUnit1DFt[] =
    mode === 'ft' ? psiAxisUnits1DFt : axisUnits1DFid;

  const domain = useMemo(() => {
    // nmrium-core's view-state type doesn't model PsiNMR's 'khz', so match on
    // the widened unit with plain conditionals rather than ts-pattern.
    const psiUnit = unit as PsiAxisUnit;

    if (psiUnit === 'pt') {
      const maxPt = firstActiveSpectrum?.data.x.length ?? 0;
      const ppmToPoint = scaleLinear(originXDomain, [0, maxPt]);
      return scaleX()
        .domain()
        .map((v) => ppmToPoint(v));
    }

    if (mode === 'ft' && (psiUnit === 'hz' || psiUnit === 'khz')) {
      if (!firstActiveSpectrum) return undefined;
      // δ(ppm) × observe frequency (MHz) = frequency offset in Hz (÷1000 → kHz).
      const divider = psiUnit === 'khz' ? 1000 : 1;
      return scaleX()
        .domain()
        .map((v) => (v * firstActiveSpectrum.info.originFrequency) / divider);
    }

    // 's' (fid) and 'ppm' (ft) both use the natural scale domain.
    return undefined;
  }, [firstActiveSpectrum, mode, originXDomain, scaleX, unit]);

  const setUnit = useCallback(
    (unit: PsiAxisUnit) => {
      match(mode)
        .with('fid', (mode) => {
          assertIn(unit, axisUnits1DFid);
          return dispatch({
            type: 'SET_AXIS_UNIT_1D_HORIZONTAL',
            payload: { nucleus, mode, unit },
          });
        })
        .with('ft', (mode) => {
          assertIn(unit, psiAxisUnits1DFt as PsiAxisUnit[]);
          return dispatch({
            type: 'SET_AXIS_UNIT_1D_HORIZONTAL',
            // The view state stores the extended PsiNMR unit ('khz').
            payload: { nucleus, mode, unit: unit as AxisUnit1DFt },
          });
        })
        .exhaustive();
    },
    [dispatch, mode, nucleus],
  );

  return { mode, unit, allowedUnits, setUnit, domain };
}

export function useDirectAxisUnit() {
  const {
    originDomain: { xDomain: originXDomain },
  } = useChartData();
  const { nucleus, units } = useAxisUnit2D();
  const spectrum = useSpectrum();
  const dispatch = useDispatch();
  const scaleX = useScale2DX();

  return useMemo(() => {
    if (!spectrum) return;
    if (!isSpectrum2D(spectrum)) return;

    const mode: keyof Nucleus2DUnit['direct'] =
      spectrum.info.isFt || spectrum.info.isFtDimensionOne ? 'ft' : 'fid';
    const unit: AxisUnit2DFid | AxisUnit2DFt = units.direct[mode];
    const allowedUnits: AxisUnit2DFid[] | AxisUnit2DFt[] =
      mode === 'ft' ? axisUnits2DFt : axisUnits2DFid;

    // spectrum.info.spectrumSize = [nbColumns, nbRows];
    // in nmrium-core formatSpectrum2D
    const directAxisIndex = 0;
    function getPtDomain() {
      assert(isSpectrum2D(spectrum));
      const originPtDomain = [0, spectrum.info.spectrumSize[directAxisIndex]];
      const ppmToPoint = scaleLinear(originXDomain, originPtDomain);

      return scaleX.domain().map((v) => ppmToPoint(v));
    }

    const domain = match(mode)
      .with('fid', () =>
        match(unit)
          .with('s', () => undefined)
          .with('pt', getPtDomain)
          .with('hz', 'ppm', (unit) => {
            assertUnreachable(unit as never);
          })
          .exhaustive(),
      )
      .with('ft', () =>
        match(unit)
          .with('ppm', () => undefined)
          .with('pt', getPtDomain)
          .with('hz', () => {
            const frequency = spectrum.info.originFrequency[directAxisIndex];
            return scaleX.domain().map((v) => v * frequency);
          })
          .with('s', (unit) => {
            assertUnreachable(unit as never);
          })
          .exhaustive(),
      )
      .exhaustive();

    function setUnit(unit: AxisUnit) {
      match(mode)
        .with('fid', (mode) => {
          assertIn(unit, axisUnits2DFid);
          return dispatch({
            type: 'SET_AXIS_UNIT_2D_DIRECT',
            payload: { nucleus, mode, unit },
          });
        })
        .with('ft', (mode) => {
          assertIn(unit, axisUnits2DFt);
          return dispatch({
            type: 'SET_AXIS_UNIT_2D_DIRECT',
            payload: { nucleus, mode, unit },
          });
        })
        .exhaustive();
    }

    return { mode, unit, allowedUnits, setUnit, domain };
  }, [dispatch, nucleus, originXDomain, scaleX, spectrum, units.direct]);
}

export function useIndirectAxisUnit() {
  const {
    originDomain: { yDomain: originYDomain },
  } = useChartData();
  const { nucleus, units } = useAxisUnit2D();
  const spectrum = useSpectrum();
  const dispatch = useDispatch();
  const scaleY = useScale2DY();

  return useMemo(() => {
    if (!spectrum) return;
    if (!isSpectrum2D(spectrum)) return;

    const mode: keyof Nucleus2DUnit['direct'] = spectrum.info.isFt
      ? 'ft'
      : 'fid';
    const unit: AxisUnit2DFid | AxisUnit2DFt = units.indirect[mode];
    const allowedUnits: AxisUnit2DFid[] | AxisUnit2DFt[] =
      mode === 'ft' ? axisUnits2DFt : axisUnits2DFid;

    // spectrum.info.spectrumSize = [nbColumns, nbRows];
    // in nmrium-core formatSpectrum2D
    const indirectAxisIndex = 1;
    function getPtDomain() {
      assert(isSpectrum2D(spectrum));
      const originPtDomain = [0, spectrum.info.spectrumSize[indirectAxisIndex]];
      const ppmToPoint = scaleLinear(originYDomain, originPtDomain);

      return scaleY.domain().map((v) => ppmToPoint(v));
    }

    const domain = match(mode)
      .with('fid', () =>
        match(unit)
          .with('s', () => undefined)
          .with('pt', getPtDomain)
          .with('hz', 'ppm', (unit) => {
            assertUnreachable(unit as never);
          })
          .exhaustive(),
      )
      .with('ft', () =>
        match(unit)
          .with('ppm', () => undefined)
          .with('pt', getPtDomain)
          .with('hz', () => {
            const frequency = spectrum.info.originFrequency[indirectAxisIndex];
            return scaleY.domain().map((v) => v * frequency);
          })
          .with('s', (unit) => {
            assertUnreachable(unit as never);
          })
          .exhaustive(),
      )
      .exhaustive();

    function setUnit(unit: AxisUnit) {
      match(mode)
        .with('fid', (mode) => {
          assertIn(unit, axisUnits2DFid);
          return dispatch({
            type: 'SET_AXIS_UNIT_2D_INDIRECT',
            payload: { nucleus, mode, unit },
          });
        })
        .with('ft', (mode) => {
          assertIn(unit, axisUnits2DFt);
          return dispatch({
            type: 'SET_AXIS_UNIT_2D_INDIRECT',
            payload: { nucleus, mode, unit },
          });
        })
        .exhaustive();
    }

    return { mode, unit, allowedUnits, setUnit, domain };
  }, [dispatch, nucleus, originYDomain, scaleY, spectrum, units.indirect]);
}

const defaultUnit1D: Nucleus1DUnit = {
  horizontal: {
    fid: defaultAxisUnit1DFid,
    ft: defaultAxisUnit1DFt,
  },
};

function useAxisUnit1D() {
  const nucleus = useActiveNucleusTab();
  const { view } = useChartData();

  const nucleusUnits = view.units1D[nucleus] ?? defaultUnit1D;

  return { nucleus, nucleusUnits };
}

const defaultUnit2D: Nucleus2DUnit = {
  direct: {
    fid: defaultAxisUnit2DFid,
    ft: defaultAxisUnit2DFt,
  },
  indirect: {
    fid: defaultAxisUnit2DFid,
    ft: defaultAxisUnit2DFt,
  },
};

function useAxisUnit2D() {
  const nucleus = useActiveNucleusTab();
  const { view } = useChartData();

  const units = view.units2D[nucleus] ?? defaultUnit2D;

  return { nucleus, units };
}
