import {
  SvgNmrApodization,
  SvgNmrFourierTransform,
  SvgNmrZeroFilling,
} from 'cheminfo-font';
import { useCallback, useRef, useState } from 'react';

import { useChartData } from '../../context/ChartContext.js';
import { useDispatch } from '../../context/DispatchContext.js';
import { useToaster } from '../../context/ToasterContext.js';
import type { AlertButton } from '../../elements/Alert.js';
import { useAlert } from '../../elements/Alert.js';
import type { ToolbarPopoverMenuItem } from '../../elements/ToolbarPopoverItem.js';
import { ToolbarPopoverItem } from '../../elements/ToolbarPopoverItem.js';
import useCheckExperimentalFeature from '../../hooks/useCheckExperimentalFeature.ts';
import { useCheckToolsVisibility } from '../../hooks/useCheckToolsVisibility.js';
import useSpectrum from '../../hooks/useSpectrum.js';
import useToolsFunctions from '../../hooks/useToolsFunctions.js';
import type { MainTool } from '../../toolbar/ToolTypes.js';
import { options } from '../../toolbar/ToolTypes.js';
import { TablePanel } from '../extra/BasicPanelStyle.js';
import type { SettingsRef } from '../extra/utilities/settingImperativeHandle.js';
import type { ToolbarItemProps } from '../header/DefaultPanelHeader.js';
import DefaultPanelHeader from '../header/DefaultPanelHeader.js';
import PreferencesHeader from '../header/PreferencesHeader.js';

import { FiltersSectionsPanel } from './Filters/FiltersSectionsPanel.js';
import FiltersPreferences from './FiltersPreferences.js';
import { ProcessingsSectionsPanel } from './processings_sections_panel.tsx';

type FTMenuAction = 'fftDimension1' | 'fftDimension2' | 'fftBothDimensions';

export default function FiltersPanel() {
  const dispatch = useDispatch();
  const toaster = useToaster();
  const { showAlert } = useAlert();
  const { id: activeSpectrumId, filters } = useSpectrum({ filters: [] });
  const isExperimental = useCheckExperimentalFeature();
  const [isFlipped, setFlipStatus] = useState(false);
  const settingRef = useRef<SettingsRef | null>(null);
  const {
    displayerMode,
    toolOptions: { selectedTool },
  } = useChartData();
  const isToolEnabled = useCheckToolsVisibility();
  const { handleChangeOption } = useToolsFunctions();

  function handleDeleteFilter() {
    const buttons: AlertButton[] = [
      {
        text: 'Yes',
        onClick: async () => {
          const hideLoading = await toaster.showAsyncLoading({
            message: 'Delete filters process in progress',
          });
          dispatch({ type: 'DELETE_FILTER', payload: {} });
          hideLoading();
        },
        intent: 'danger',
      },
      { text: 'No' },
    ];

    showAlert({
      message: 'You are about to delete all processing steps, Are you sure?',
      buttons,
    });
  }

  function settingsPanelHandler() {
    setFlipStatus((flipped) => !flipped);
  }

  async function saveSettingHandler() {
    const isSettingsValid = await settingRef.current?.saveSetting();
    if (isSettingsValid) {
      setFlipStatus(false);
    }
  }

  const applyFFTFilter = useCallback(() => {
    dispatch({ type: 'APPLY_FFT_FILTER' });
  }, [dispatch]);

  const handleOptionMenuSelect = useCallback(
    (data?: { id: MainTool }) => {
      if (data?.id) {
        handleChangeOption(data.id);
      }
    },
    [handleChangeOption],
  );

  const handleFTMenuSelect = useCallback(
    (data?: { action: FTMenuAction }) => {
      switch (data?.action) {
        case 'fftDimension1':
          dispatch({ type: 'APPLY_FFT_DIMENSION_1_FILTER' });
          break;
        case 'fftDimension2':
          dispatch({ type: 'APPLY_FFT_DIMENSION_2_FILTER' });
          break;
        case 'fftBothDimensions':
          dispatch({ type: 'APPLY_FFT_DIMENSION_1_FILTER' });
          dispatch({ type: 'APPLY_FFT_DIMENSION_2_FILTER' });
          break;
        default:
      }
    },
    [dispatch],
  );

  // The reducer actions below all target the active spectrum; without one
  // they would silently no-op, so the buttons are disabled in that state.
  const hasActiveSpectrum = !!activeSpectrumId;

  const leftButtons: ToolbarItemProps[] = [];

  if (displayerMode === '1D') {
    const canApodize = hasActiveSpectrum && isToolEnabled('apodization');
    const canZeroFill = hasActiveSpectrum && isToolEnabled('zeroFilling');
    const canFT = hasActiveSpectrum && isToolEnabled('fft');
    const fidHint = ' (select a single raw FID spectrum)';

    leftButtons.push(
      {
        id: 'filter-apodization',
        icon: <SvgNmrApodization />,
        tooltip: `${options.apodization.label} — window functions${canApodize ? '' : fidHint}`,
        disabled: !canApodize,
        active: selectedTool === options.apodization.id,
        onClick: () => handleChangeOption('apodization'),
      },
      {
        id: 'filter-zero-filling',
        icon: <SvgNmrZeroFilling />,
        tooltip: `${options.zeroFilling.label}${canZeroFill ? '' : fidHint}`,
        disabled: !canZeroFill,
        active: selectedTool === options.zeroFilling.id,
        onClick: () => handleChangeOption('zeroFilling'),
      },
      {
        id: 'filter-fourier-transform',
        icon: <SvgNmrFourierTransform />,
        tooltip: `${options.fft.label}${canFT ? '' : fidHint}`,
        disabled: !canFT,
        onClick: applyFFTFilter,
      },
    );
  }

  if (displayerMode === '2D') {
    const canApodizeDim1 =
      hasActiveSpectrum && isToolEnabled('apodizationDimension1');
    const canApodizeDim2 =
      hasActiveSpectrum && isToolEnabled('apodizationDimension2');
    const canZeroFillDim1 =
      hasActiveSpectrum && isToolEnabled('zeroFillingDimension1');
    const canZeroFillDim2 =
      hasActiveSpectrum && isToolEnabled('zeroFillingDimension2');
    const canFTDim1 = hasActiveSpectrum && isToolEnabled('fftDimension1');
    const canFTDim2 = hasActiveSpectrum && isToolEnabled('fftDimension2');

    const apodizationMenuItems: Array<
      ToolbarPopoverMenuItem<{ id: MainTool }>
    > = [
      {
        text: 'Dimension 1',
        data: { id: 'apodizationDimension1' },
        disabled: !canApodizeDim1,
      },
      {
        text: 'Dimension 2',
        data: { id: 'apodizationDimension2' },
        disabled: !canApodizeDim2,
      },
    ];

    const zeroFillingMenuItems: Array<
      ToolbarPopoverMenuItem<{ id: MainTool }>
    > = [
      {
        text: 'Dimension 1',
        data: { id: 'zeroFillingDimension1' },
        disabled: !canZeroFillDim1,
      },
      {
        text: 'Dimension 2',
        data: { id: 'zeroFillingDimension2' },
        disabled: !canZeroFillDim2,
      },
    ];

    const ftMenuItems: Array<ToolbarPopoverMenuItem<{ action: FTMenuAction }>> =
      [
        {
          text: 'Full 2D FT (both dimensions)',
          data: { action: 'fftBothDimensions' },
          disabled: !canFTDim1,
        },
        {
          text: 'FT dimension 1',
          data: { action: 'fftDimension1' },
          disabled: !canFTDim1,
        },
        {
          text: 'FT dimension 2',
          data: { action: 'fftDimension2' },
          disabled: !canFTDim2,
        },
      ];

    leftButtons.push(
      {
        component: (
          <ToolbarPopoverItem<{ id: MainTool }>
            id="filter-apodization"
            icon={<SvgNmrApodization />}
            tooltip="Apodization — window functions per dimension"
            disabled={!canApodizeDim1 && !canApodizeDim2}
            active={
              selectedTool === 'apodizationDimension1' ||
              selectedTool === 'apodizationDimension2'
            }
            options={apodizationMenuItems}
            onClick={handleOptionMenuSelect}
          />
        ),
      },
      {
        component: (
          <ToolbarPopoverItem<{ id: MainTool }>
            id="filter-zero-filling"
            icon={<SvgNmrZeroFilling />}
            tooltip="Zero filling per dimension"
            disabled={!canZeroFillDim1 && !canZeroFillDim2}
            active={
              selectedTool === 'zeroFillingDimension1' ||
              selectedTool === 'zeroFillingDimension2'
            }
            options={zeroFillingMenuItems}
            onClick={handleOptionMenuSelect}
          />
        ),
      },
      {
        component: (
          <ToolbarPopoverItem<{ action: FTMenuAction }>
            id="filter-fourier-transform"
            icon={<SvgNmrFourierTransform />}
            tooltip="Fourier transform — full 2D or a single dimension"
            disabled={!canFTDim1 && !canFTDim2}
            options={ftMenuItems}
            onClick={handleFTMenuSelect}
          />
        ),
      },
    );
  }

  return (
    <TablePanel isFlipped={isFlipped}>
      {!isFlipped && (
        <DefaultPanelHeader
          deleteTooltip="Delete all filters"
          onDelete={handleDeleteFilter}
          total={filters?.length}
          hideCounter
          leftButtons={leftButtons}
          onSettingClick={settingsPanelHandler}
        />
      )}
      {isFlipped && (
        <PreferencesHeader
          onSave={saveSettingHandler}
          onClose={settingsPanelHandler}
        />
      )}
      <div className="inner-container">
        {!isFlipped ? (
          <>
            <FiltersSectionsPanel />

            {isExperimental && (
              <>
                <hr />
                <ProcessingsSectionsPanel />
              </>
            )}
          </>
        ) : (
          <FiltersPreferences ref={settingRef} />
        )}
      </div>
    </TablePanel>
  );
}
