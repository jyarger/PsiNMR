import styled from '@emotion/styled';
import type { CoreReadReturn } from '@zakodium/nmrium-core';
import { FileCollection } from 'file-collection';
import { useCallback, useEffect, useState } from 'react';
import { FaMoon, FaSlidersH, FaSun } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';

import { NMRium } from '../../component/main/index.js';
import { demoCore } from '../utility/core.js';

import PsiLogo from './PsiLogo.js';
import { useDoubleTap } from './mobileGestures.js';
import { setPsiTheme, togglePsiTheme, usePsiTheme } from './themeStatus.js';

/**
 * Touch-first mobile view (route `#/m`). A full-screen spectrum with mobile
 * chrome — designed for phones, deliberately smaller than the desktop
 * workspace. This is the "second component" of the web app and the exact UI a
 * Capacitor iOS/Android shell wraps, so improvements here reach both
 * automatically. Bottom-sheet panels and the tool FAB are stubs for the next
 * phase (A1); A0 establishes the layout, loading and gesture scaffolding.
 */

// Names are `M…`-prefixed so no styled component collides with an NMRium
// component under Playwright's `_react=` selectors in the production bundle.
const MPage = styled.div`
  background: var(--psi-surface);
  color: var(--psi-text);
  display: flex;
  flex-direction: column;
  font-family: var(--psi-font);
  height: 100dvh;
  overflow: hidden;
`;

const MBar = styled.header`
  align-items: center;
  background: var(--psi-chrome);
  border-bottom: 1px solid var(--psi-chrome-border);
  color: var(--psi-text-on-chrome);
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  padding: max(env(safe-area-inset-top), 8px) 14px 8px;
`;

const MTitle = styled.div`
  color: var(--psi-text-on-chrome-muted);
  font-size: 13px;
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MThemeBtn = styled.button`
  align-items: center;
  background: var(--psi-chrome-raised);
  border: 1px solid var(--psi-chrome-border);
  border-radius: 8px;
  color: var(--psi-text-on-chrome);
  display: flex;
  height: 36px;
  justify-content: center;
  width: 36px;

  &:active {
    color: var(--psi-accent-on-chrome);
  }
`;

// The plot surface opts out of browser touch handling so the viewer's own
// d3/pointer layer owns pinch-zoom and pan; double-tap-to-reset is added on top.
const MViewer = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  touch-action: none;
`;

const MEmpty = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  justify-content: center;
  padding: 32px;
  text-align: center;
`;

const MTagline = styled.p`
  color: var(--psi-text-muted);
  font-size: 15px;
  line-height: 1.5;
  margin: 0 0 8px;
`;

const MButton = styled.button`
  background: var(--psi-accent);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-family: var(--psi-font);
  font-size: 16px;
  font-weight: 600;
  min-height: 48px;
  padding: 0 22px;
  width: 100%;

  &.ghost {
    background: transparent;
    border: 1px solid var(--psi-chrome-border);
    color: var(--psi-text);
  }

  &:active {
    background: var(--psi-accent-strong);
  }
`;

const MFileLabel = styled.label`
  align-items: center;
  background: var(--psi-accent);
  border-radius: 10px;
  color: #fff;
  display: flex;
  font-size: 16px;
  font-weight: 600;
  justify-content: center;
  min-height: 48px;
  padding: 0 22px;
  width: 100%;

  &:active {
    background: var(--psi-accent-strong);
  }
`;

const MSheet = styled.div<{ open: boolean }>`
  background: var(--psi-chrome);
  border-radius: 16px 16px 0 0;
  bottom: 0;
  box-shadow: 0 -6px 24px rgb(0 0 0 / 25%);
  color: var(--psi-text-on-chrome);
  left: 0;
  max-height: 55dvh;
  position: absolute;
  right: 0;
  transform: translateY(${({ open }) => (open ? '0' : 'calc(100% - 44px)')});
  transition: transform 0.22s ease;
  z-index: 20;
`;

const MSheetHandle = styled.button`
  align-items: center;
  background: none;
  border: none;
  color: var(--psi-text-on-chrome-muted);
  display: flex;
  font-size: 12px;
  font-weight: 700;
  gap: 8px;
  height: 44px;
  justify-content: center;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  width: 100%;
`;

const MSheetBody = styled.div`
  border-top: 1px solid var(--psi-chrome-border);
  color: var(--psi-text-on-chrome-muted);
  font-size: 14px;
  line-height: 1.55;
  max-height: calc(55dvh - 44px);
  overflow-y: auto;
  padding: 14px 18px calc(18px + env(safe-area-inset-bottom));
`;

const MFab = styled.button`
  align-items: center;
  background: var(--psi-accent);
  border: none;
  border-radius: 50%;
  bottom: calc(60px + env(safe-area-inset-bottom));
  box-shadow: 0 4px 14px rgb(0 0 0 / 30%);
  color: #fff;
  display: flex;
  font-size: 20px;
  height: 56px;
  justify-content: center;
  position: absolute;
  right: 16px;
  width: 56px;
  z-index: 15;

  &:active {
    background: var(--psi-accent-strong);
  }
`;

const MBusy = styled.div`
  align-items: center;
  background: var(--psi-surface);
  color: var(--psi-text-muted);
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
  z-index: 30;
`;

function toEntries(urls: string[]) {
  return urls.map((url) => {
    const parsed = new URL(url, window.location.origin);
    return { relativePath: parsed.pathname, baseURL: parsed.origin };
  });
}

// A small, known-good bundled dataset for the "Load example" action.
const EXAMPLE_URL = '/data/solids/simple/79Br_KBr_10kHz_MAS.zip';

export default function MobileView() {
  const [data, setData] = useState<CoreReadReturn>();
  const [loadKey, setLoadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const theme = usePsiTheme();
  const [searchParams] = useSearchParams();

  const loadUrls = useCallback(async (urls: string[]) => {
    setBusy(true);
    try {
      const result = await demoCore.readFromWebSource({
        entries: toEntries(urls),
      });
      setData(result);
      setLoadKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }, []);

  const loadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const collection = await new FileCollection().appendFileList(files);
      const result = await demoCore.read(collection);
      setData(result);
      setLoadKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }, []);

  // Honour ?theme and ?url on first mount so a shared/deep link opens directly.
  useEffect(() => {
    const requested = searchParams.get('theme');
    if (requested === 'light' || requested === 'dark') setPsiTheme(requested);
    const urls = searchParams.get('url');
    if (urls) {
      const list = urls
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      if (list.length > 0) void loadUrls(list);
    }
    // First mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-keying the viewer with the same data resets its zoom/pan to full view.
  const resetView = useCallback(() => setLoadKey((key) => key + 1), []);
  const onViewerTouchEnd = useDoubleTap(resetView);

  return (
    <MPage>
      <MBar>
        <PsiLogo size={24} wordmark="ketmark" />
        <MTitle>
          {data ? 'Double-tap to reset · pinch to zoom' : 'Mobile'}
        </MTitle>
        <MThemeBtn
          type="button"
          aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          onClick={togglePsiTheme}
        >
          {theme === 'dark' ? <FaSun /> : <FaMoon />}
        </MThemeBtn>
      </MBar>

      {data ? (
        <MViewer onTouchEnd={onViewerTouchEnd}>
          <NMRium
            key={loadKey}
            workspace="embedded"
            state={data.state}
            aggregator={data.aggregator}
          />
          <MFab
            type="button"
            aria-label="Tools"
            onClick={() => setSheetOpen((o) => !o)}
          >
            <FaSlidersH />
          </MFab>
          <MSheet open={sheetOpen}>
            <MSheetHandle type="button" onClick={() => setSheetOpen((o) => !o)}>
              Spectra · Processing · Peaks
            </MSheetHandle>
            <MSheetBody>
              Panel controls arrive in the next phase. For now, use pinch to
              zoom, two-finger drag to pan, and double-tap to reset the view.
            </MSheetBody>
          </MSheet>
        </MViewer>
      ) : (
        <MEmpty>
          <PsiLogo size={64} showWordmark={false} />
          <MTagline>
            Process, analyze and visualize NMR spectra on your phone.
          </MTagline>
          <MFileLabel>
            Open a spectrum
            <input
              type="file"
              hidden
              multiple
              onChange={(event) => void loadFiles(event.target.files)}
            />
          </MFileLabel>
          <MButton
            className="ghost"
            type="button"
            onClick={() => void loadUrls([EXAMPLE_URL])}
          >
            Load an example
          </MButton>
        </MEmpty>
      )}

      {busy ? <MBusy>Loading spectrum…</MBusy> : null}
    </MPage>
  );
}
