import type { CoreReadReturn } from '@zakodium/nmrium-core';
import { FileCollection } from 'file-collection';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  NMRiumChangeCb,
  NMRiumRefAPI,
} from '../../component/main/index.js';
import { NMRium } from '../../component/main/index.js';
import { demoCore } from '../utility/core.js';

import type { ActionRequest, LoadData } from './embedEvents.js';
import { onEmbedEvent, triggerEmbedEvent } from './embedEvents.js';

/**
 * Chrome-less embed target (route `#/embed`): the NMRium component driven
 * entirely over the postMessage bridge in embedEvents.ts, so external apps
 * can host PsiNMR in an iframe. Wire-compatible with the NMRium react wrapper.
 */
export default function EmbedView() {
  const [data, setData] = useState<CoreReadReturn>();
  const [loadKey, setLoadKey] = useState(0);
  const apiRef = useRef<NMRiumRefAPI>(null);

  const handleLoad = useCallback(async (payload: LoadData) => {
    try {
      let result: CoreReadReturn;
      if (payload.type === 'nmrium') {
        result = await demoCore.readNMRiumObject(payload.data);
      } else if (payload.type === 'file') {
        const collection = await new FileCollection().appendFileList(
          payload.data,
        );
        result = await demoCore.read(collection);
      } else {
        const entries = payload.data.map((url) => {
          const parsed = new URL(url);
          return { relativePath: parsed.pathname, baseURL: parsed.origin };
        });
        result = await demoCore.readFromWebSource({ entries });
      }

      // Honour an explicit active nucleus tab when the host provides one.
      if (payload.activeTab && result.state.view?.spectra) {
        result.state.view.spectra.activeTab = payload.activeTab;
      }

      setData(result);
      setLoadKey((key) => key + 1);
    } catch (error) {
      triggerEmbedEvent('error', {
        message:
          error instanceof Error ? error.message : 'Failed to load data.',
      });
    }
  }, []);

  const handleAction = useCallback((request: ActionRequest) => {
    if (request.type === 'exportSpectraViewerAsBlob') {
      const blob = apiRef.current?.getSpectraViewerAsBlob();
      if (blob) {
        triggerEmbedEvent('action-response', {
          type: 'exportSpectraViewerAsBlob',
          data: blob,
        });
      }
    }
  }, []);

  useEffect(() => {
    const offLoad = onEmbedEvent('load', (payload) => void handleLoad(payload));
    const offAction = onEmbedEvent('action-request', handleAction);
    return () => {
      offLoad();
      offAction();
    };
  }, [handleLoad, handleAction]);

  const handleChange = useCallback<NMRiumChangeCb>((state, source) => {
    triggerEmbedEvent('data-change', { state, source });
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <NMRium
        key={loadKey}
        ref={apiRef}
        workspace="embedded"
        state={data?.state}
        aggregator={data?.aggregator}
        onChange={handleChange}
        onError={(error) =>
          triggerEmbedEvent('error', {
            message: error instanceof Error ? error.message : 'Error',
          })
        }
      />
    </div>
  );
}
