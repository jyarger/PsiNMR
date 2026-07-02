import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import { initComputeEngine } from '../../compute/engine.js';

import DataPanel from './DataPanel.js';
import InteractiveView from './InteractiveView.js';
import Landing from './Landing.js';
import TopBar from './TopBar.js';
import { setEngineBackend } from './engineStatus.js';
import { UserDataProvider } from './userData.js';

const Shell = styled.div`
  background: var(--psi-bg);
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const Content = styled.main`
  flex: 1;
  min-width: 0;
`;

interface AppLayoutProps {
  routes?: any[];
  baseURL?: string;
}

export default function AppLayout(props: AppLayoutProps) {
  const { routes = [], baseURL } = props;
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    void initComputeEngine().then(setEngineBackend);
    if (import.meta.env.DEV) {
      void import('../../compute/benchmark.js').then((benchmark) => {
        (window as any).__psinmr = benchmark;
      });
    }
  }, []);

  return (
    <UserDataProvider>
      <Shell>
        <TopBar onDataPanelToggle={() => setPanelOpen(!panelOpen)} />
        <Body>
          {panelOpen && <DataPanel samples={routes} baseURL={baseURL} />}
          <Content>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/nmr" element={<InteractiveView />} />
              <Route path="/nmr/sample" element={<InteractiveView />} />
              <Route path="/nmr/user/:id" element={<InteractiveView />} />
              <Route
                path="/tools/predict"
                element={<InteractiveView workspace="prediction" />}
              />
              <Route
                path="/tools/simulate"
                element={<InteractiveView workspace="simulation" />}
              />
              <Route path="*" element={<Landing />} />
            </Routes>
          </Content>
        </Body>
      </Shell>
    </UserDataProvider>
  );
}
