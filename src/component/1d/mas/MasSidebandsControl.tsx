import styled from '@emotion/styled';
import type { Spectrum1D } from '@zakodium/nmrium-core';
import { useRef } from 'react';
import { FaTimes } from 'react-icons/fa';

import { isSpectrum1D } from '../../../data/data1d/Spectrum1D/index.js';
import { useChartData } from '../../context/ChartContext.js';
import useSpectrum from '../../hooks/useSpectrum.js';

import { setMasSidebands, useMasSidebands } from './masSidebandsState.js';

const Chip = styled.button`
  background: var(--psi-plot-surface, white);
  border: 1px solid var(--psi-chrome-border, #ccc);
  border-radius: 999px;
  color: var(--psi-plot-fg, #333);
  cursor: pointer;
  font-family: var(--psi-font, sans-serif);
  font-size: 15px;
  font-weight: 700;
  opacity: 0.85;
  padding: 4px 13px;

  sub {
    font-size: 0.7em;
  }

  &:hover {
    border-color: var(--psi-accent, #3d8f85);
    color: var(--psi-accent, #3d8f85);
    opacity: 1;
  }
`;

const Card = styled.div`
  align-items: center;
  background: var(--psi-plot-surface, white);
  border: 1px solid var(--psi-chrome-border, #ccc);
  border-radius: 8px;
  box-shadow: 0 4px 14px rgb(0 0 0 / 25%);
  color: var(--psi-plot-fg, #333);
  display: flex;
  font-family: var(--psi-font, sans-serif);
  font-size: 12px;
  gap: 8px;
  padding: 6px 10px;

  label {
    align-items: center;
    display: flex;
    gap: 5px;
    white-space: nowrap;
  }

  input {
    background: var(--psi-plot-bg, #fff);
    border: 1px solid var(--psi-chrome-border, #ccc);
    border-radius: 5px;
    color: var(--psi-plot-fg, #333);
    font-family: var(--psi-font, sans-serif);
    font-size: 12px;
    padding: 3px 6px;
    width: 64px;

    &:focus {
      border-color: var(--psi-accent, #3d8f85);
      outline: none;
    }
  }
`;

const CloseButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: var(--psi-plot-fg, #333);
  cursor: pointer;
  display: flex;
  font-size: 11px;
  opacity: 0.7;
  padding: 2px;

  &:hover {
    opacity: 1;
  }
`;

const Wrapper = styled.div`
  position: absolute;
  right: 12px;
  top: 8px;
  z-index: 5;
`;

/** Reads Varian's spinning-rate parameter (Hz) from the spectrum metadata. */
function metaSpinningRate(spectrum: Spectrum1D): number | null {
  const srate = (spectrum.meta as Record<string, unknown> | undefined)?.srate;
  const value = Array.isArray(srate) ? srate[0] : srate;
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/**
 * Floating control for the MAS sideband guides (solid-state NMR). Shown on
 * frequency-domain 1D spectra; collapsed to a small "νr MAS" chip until
 * needed. The spinning rate defaults from the acquisition metadata
 * (Varian `srate`) when available but stays editable — recorded rates are
 * often stale, and matching the guides to the sidebands measures the
 * actual rate.
 */
export function MasSidebandsControl() {
  const { displayerMode } = useChartData();
  const state = useMasSidebands();
  const spectrum = useSpectrum(null);
  const initializedFor = useRef<string>();

  if (displayerMode !== '1D' || !spectrum || !isSpectrum1D(spectrum)) {
    return null;
  }
  const spectrum1D = spectrum;
  if (spectrum1D.info.isFid || !spectrum1D.info.originFrequency) return null;

  function open() {
    // Seed the rate from acquisition metadata once per spectrum.
    let { rate } = state;
    if (initializedFor.current !== spectrum1D.id) {
      initializedFor.current = spectrum1D.id;
      rate = metaSpinningRate(spectrum1D) ?? rate;
    }
    setMasSidebands({ enabled: true, rate });
  }

  if (!state.enabled) {
    return (
      <Wrapper>
        <Chip
          type="button"
          title="Show magic-angle-spinning sideband guides (δiso ± n·νr)"
          onClick={open}
        >
          ν<sub>r</sub>
        </Chip>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Card>
        <label>
          νr (Hz)
          <input
            type="number"
            min={1}
            step={100}
            value={state.rate}
            onChange={(event) => {
              const rate = Number(event.target.value);
              if (Number.isFinite(rate)) setMasSidebands({ rate });
            }}
          />
        </label>
        <label>
          δiso (ppm)
          <input
            type="number"
            step={0.1}
            placeholder="auto"
            value={state.anchor ?? ''}
            onChange={(event) => {
              const { value } = event.target;
              setMasSidebands({
                anchor: value === '' ? null : Number(value),
              });
            }}
          />
        </label>
        <label>
          ±n
          <input
            type="number"
            min={1}
            max={20}
            value={state.count}
            style={{ width: 44 }}
            onChange={(event) => {
              const count = Math.round(Number(event.target.value));
              if (Number.isFinite(count) && count >= 1) {
                setMasSidebands({ count: Math.min(count, 20) });
              }
            }}
          />
        </label>
        <CloseButton
          type="button"
          title="Hide sideband guides"
          onClick={() => setMasSidebands({ enabled: false })}
        >
          <FaTimes />
        </CloseButton>
      </Card>
    </Wrapper>
  );
}
