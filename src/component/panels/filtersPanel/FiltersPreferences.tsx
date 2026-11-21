import type { DataSelectionOption } from '@zakodium/nmrium-core';
import { forwardRef, memo, useCallback } from 'react';
import { useForm } from 'react-hook-form';

import { usePreferences } from '../../context/PreferencesContext.js';
import { CheckController } from '../../elements/CheckController.tsx';
import { GroupPane } from '../../elements/GroupPane.tsx';
import type { LabelStyle } from '../../elements/Label.tsx';
import Label from '../../elements/Label.tsx';
import { Select2Controller } from '../../elements/Select2Controller.tsx';
import { PreferencesContainer } from '../extra/preferences/PreferencesContainer.js';
import type { SettingsRef } from '../extra/utilities/settingImperativeHandle.js';
import { useSettingImperativeHandle } from '../extra/utilities/settingImperativeHandle.js';

interface DataSelectionItem {
  label: string;
  value: DataSelectionOption;
}

const DATA_SELECTION_ITEMS: DataSelectionItem[] = [
  { label: 'Raw FIDs and processed spectra', value: 'both' },
  { label: 'Prefer processed spectra', value: 'preferFT' },
  { label: 'Prefer raw FIDs', value: 'preferFID' },
  { label: 'Processed spectra only', value: 'ft' },
  { label: 'Raw FIDs only', value: 'fid' },
];

interface FiltersPreferencesValues {
  autoProcessing: boolean;
  dataSelection: DataSelectionOption;
}

// The preferences flip container is always light, so the text color must not
// follow the app theme (var(--psi-text) is near-white in dark mode).
const labelStyle: LabelStyle = {
  label: {
    flex: 4,
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#232323',
  },
  wrapper: {
    flex: 8,
  },
};

export default memo(
  forwardRef<SettingsRef | null>(function FiltersPreferences(_, ref) {
    const preferences = usePreferences();
    const { onLoadProcessing, nmrLoaders } = preferences.current;

    const saveHandler = useCallback(
      (values: FiltersPreferencesValues) => {
        preferences.dispatch({
          type: 'SET_PREFERENCES',
          payload: {
            onLoadProcessing: {
              ...onLoadProcessing,
              autoProcessing: values.autoProcessing,
            },
            nmrLoaders: {
              ...nmrLoaders,
              general: {
                ...nmrLoaders?.general,
                dataSelection: values.dataSelection,
              },
            },
          },
        });
      },
      [preferences, onLoadProcessing, nmrLoaders],
    );

    const { handleSubmit, control } = useForm<FiltersPreferencesValues>({
      defaultValues: {
        autoProcessing: onLoadProcessing?.autoProcessing ?? true,
        dataSelection: nmrLoaders?.general?.dataSelection ?? 'both',
      },
    });

    useSettingImperativeHandle(ref, handleSubmit, saveHandler);

    return (
      <PreferencesContainer style={{ color: '#232323' }}>
        <GroupPane text="On import" style={{ header: { color: '#005d9e' } }}>
          <CheckController
            control={control}
            name="autoProcessing"
            label="Auto-process FIDs (FIDs imported alongside a processed spectrum stay raw)"
            style={{ color: '#232323' }}
          />
          <Label title="Data to load:" style={labelStyle}>
            <Select2Controller<DataSelectionItem, FiltersPreferencesValues>
              control={control}
              name="dataSelection"
              items={DATA_SELECTION_ITEMS}
            />
          </Label>
        </GroupPane>
      </PreferencesContainer>
    );
  }),
);
