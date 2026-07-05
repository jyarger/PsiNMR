import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';

import PsiLogo from './PsiLogo.js';

/**
 * A live host-page demo of the PsiNMR embed bridge: it frames `#/embed`,
 * drives it with the `nmr-wrapper:*` postMessage protocol, and logs the
 * messages it receives — so integrators can see (and copy) the pattern.
 */

const Page = styled.div`
  background: var(--psi-surface);
  color: var(--psi-text);
  display: flex;
  flex-direction: column;
  font-family: var(--psi-font);
  height: 100vh;
`;

// Named DemoBar (not Header) so it doesn't collide with NMRium's own Header
// component under Playwright's `_react=Header` selectors in the prod bundle.
const DemoBar = styled.header`
  align-items: center;
  background: var(--psi-chrome);
  border-bottom: 1px solid var(--psi-chrome-border);
  color: var(--psi-text-on-chrome);
  display: flex;
  gap: 16px;
  padding: 10px 16px;
`;

const Title = styled.div`
  color: var(--psi-text-on-chrome-muted);
  font-size: 13px;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`;

const Btn = styled.button`
  background: var(--psi-accent);
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-family: var(--psi-font);
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 12px;

  &:hover {
    background: var(--psi-accent-strong);
  }

  &.ghost {
    background: transparent;
    border: 1px solid var(--psi-chrome-border);
    color: var(--psi-text-on-chrome);
  }
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const Frame = styled.iframe`
  border: 0;
  flex: 1;
  height: 100%;
`;

const Log = styled.div`
  background: var(--psi-chrome);
  border-left: 1px solid var(--psi-chrome-border);
  color: var(--psi-text-on-chrome);
  display: flex;
  flex-direction: column;
  font-size: 11.5px;
  width: 320px;
`;

const LogHead = styled.div`
  border-bottom: 1px solid var(--psi-chrome-border);
  color: var(--psi-text-on-chrome-muted);
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 8px 12px;
  text-transform: uppercase;
`;

const LogList = styled.div`
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, monospace;
  overflow: auto;
  padding: 8px 12px;
`;

const LogItem = styled.div`
  border-bottom: 1px solid var(--psi-chrome-raised);
  padding: 5px 0;

  b {
    color: var(--psi-accent-on-chrome);
  }
`;

const SAMPLES = {
  '¹³C MAS adamantane': '/data/solids/simple/13C_Adamantane_MAS.zip',
  '⁷⁹Br MAS KBr': '/data/solids/simple/79Br_KBr_10kHz_MAS.zip',
};

export default function EmbedDemoView() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [log, setLog] = useState<Array<{ type: string; detail: string }>>([]);
  const embedSrc = `${window.location.origin}${window.location.pathname}#/embed`;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = event.data as { type?: string; data?: unknown };
      if (typeof message?.type !== 'string') return;
      if (!message.type.startsWith('nmr-wrapper:')) return;
      let detail = '';
      const data = message.data as
        { source?: string; message?: string; type?: string } | undefined;
      if (message.type.endsWith('data-change')) {
        detail = `source: ${data?.source}`;
      } else if (message.type.endsWith('error')) {
        detail = data?.message ?? '';
      } else if (message.type.endsWith('action-response')) {
        detail = data?.type ?? '';
      }
      setLog((current) =>
        [{ type: message.type as string, detail }, ...current].slice(0, 40),
      );
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function post(data: unknown) {
    frameRef.current?.contentWindow?.postMessage(data, '*');
  }

  function loadSample(path: string) {
    post({
      type: 'nmr-wrapper:load',
      data: { type: 'url', data: [window.location.origin + path] },
    });
  }

  return (
    <Page>
      <DemoBar>
        <PsiLogo size={26} wordmark="ketmark" />
        <Title>Live embed demo — driving the iframe over postMessage</Title>
        <Controls>
          {Object.entries(SAMPLES).map(([label, path]) => (
            <Btn key={path} type="button" onClick={() => loadSample(path)}>
              Load {label}
            </Btn>
          ))}
          <Btn
            className="ghost"
            type="button"
            onClick={() =>
              post({
                type: 'nmr-wrapper:action-request',
                data: { type: 'exportSpectraViewerAsBlob' },
              })
            }
          >
            Export view
          </Btn>
        </Controls>
      </DemoBar>
      <Body>
        <Frame ref={frameRef} src={embedSrc} title="PsiNMR embed" />
        <Log>
          <LogHead>Messages from the iframe</LogHead>
          <LogList>
            {log.length === 0 ? (
              <div style={{ opacity: 0.6 }}>
                Load a sample to see nmr-wrapper events…
              </div>
            ) : (
              log.map((entry, index) => (
                <LogItem key={index}>
                  <b>{entry.type.replace('nmr-wrapper:', '')}</b>
                  {entry.detail ? ` — ${entry.detail}` : ''}
                </LogItem>
              ))
            )}
          </LogList>
        </Log>
      </Body>
    </Page>
  );
}
