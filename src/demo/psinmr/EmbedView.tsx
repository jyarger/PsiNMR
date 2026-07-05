import styled from '@emotion/styled';
import type { CoreReadReturn } from '@zakodium/nmrium-core';
import { FileCollection } from 'file-collection';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';

import type {
  NMRiumChangeCb,
  NMRiumRefAPI,
} from '../../component/main/index.js';
import { NMRium } from '../../component/main/index.js';
import { demoCore } from '../utility/core.js';

import PsiLogo from './PsiLogo.js';
import type { ActionRequest, LoadData } from './embedEvents.js';
import { onEmbedEvent, triggerEmbedEvent } from './embedEvents.js';
import { setPsiTheme, togglePsiTheme, usePsiTheme } from './themeStatus.js';

const Overlay = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
  position: absolute;
  right: 10px;
  top: 8px;
  z-index: 10;
`;

const ThemeButton = styled.button`
  align-items: center;
  background: var(--psi-chrome-raised);
  border: 1px solid var(--psi-chrome-border);
  border-radius: 6px;
  color: var(--psi-text-on-chrome);
  cursor: pointer;
  display: flex;
  height: 28px;
  justify-content: center;
  width: 28px;

  &:hover {
    color: var(--psi-accent-on-chrome);
  }
`;

const BrandLink = styled.a`
  align-items: center;
  background: var(--psi-chrome);
  border: 1px solid var(--psi-chrome-border);
  border-radius: 999px;
  display: flex;
  opacity: 0.85;
  padding: 3px 10px 3px 5px;
  text-decoration: none;

  &:hover {
    opacity: 1;
  }
`;

/**
 * Chrome-less embed target (route `#/embed`): the NMRium component driven
 * entirely over the postMessage bridge in embedEvents.ts, so external apps
 * can host PsiNMR in an iframe. Wire-compatible with the NMRium react wrapper.
 */
export default function EmbedView() {
  const [data, setData] = useState<CoreReadReturn>();
  const [loadKey, setLoadKey] = useState(0);
  const apiRef = useRef<NMRiumRefAPI>(null);
  const theme = usePsiTheme();
  const [searchParams] = useSearchParams();

  // Honour an initial theme set by the host via the iframe URL (?theme=light).
  useEffect(() => {
    const requested = searchParams.get('theme');
    if (requested === 'light' || requested === 'dark') setPsiTheme(requested);
  }, [searchParams]);

  const handleLoad = useCallback(async (payload: LoadData) => {
    try {
      let result: CoreReadReturn;
      if (payload.type === 'nmrium') {
        result = await demoCore.readNMRiumObject(payload.data, undefined, {
          baseURL: `${window.location.origin}/`,
        });
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

  // Zero-JS embed: `?url=` on the iframe src auto-loads data on mount, so a
  // host can embed a spectrum with only an <iframe> tag.
  useEffect(() => {
    const initialUrls = searchParams.get('url');
    const activeTab = searchParams.get('activeTab') ?? undefined;
    if (initialUrls) {
      const list = initialUrls
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);
      if (list.length > 0) {
        void handleLoad({ type: 'url', data: list, activeTab });
      }
    }
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback<NMRiumChangeCb>((state, source) => {
    triggerEmbedEvent('data-change', { state, source });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <Overlay>
        <ThemeButton
          type="button"
          title={
            theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
          }
          onClick={togglePsiTheme}
        >
          {theme === 'dark' ? <FaSun /> : <FaMoon />}
        </ThemeButton>
        <BrandLink
          href={`${window.location.origin}${window.location.pathname}`}
          target="_blank"
          rel="noreferrer noopener"
          title="Open the full app at PsiNMR"
        >
          <PsiLogo size={20} spin="intro" wordmark="ketmark" />
        </BrandLink>
      </Overlay>
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
