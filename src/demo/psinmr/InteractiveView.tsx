import styled from '@emotion/styled';
import type { CoreReadReturn } from '@zakodium/nmrium-core';
import { FileCollection } from 'file-collection';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import type { NMRiumWorkspace } from '../../component/main/index.js';
import { NMRium } from '../../component/main/index.js';
import { demoCore } from '../utility/core.js';

import { PsiMark } from './PsiLogo.js';
import type { UserDataset } from './userData.js';
import { useUserData } from './userData.js';

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px;
`;

const NmriumContainer = styled.div`
  background: var(--psi-surface);
  border-radius: var(--psi-radius);
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const Message = styled.div<{ isError?: boolean }>`
  align-items: center;
  color: ${({ isError }) =>
    isError ? 'var(--psi-danger)' : 'var(--psi-text-muted)'};
  display: flex;
  flex: 1;
  font-size: 14px;
  justify-content: center;
  padding: 24px;
  text-align: center;
`;

async function loadSample(
  file: string,
  base?: string | null,
): Promise<CoreReadReturn> {
  const response = await fetch(file);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
  }
  const nmriumObject = await response.json();
  const baseURL = !base || base === './' ? `${window.location.origin}/` : base;
  return await demoCore.readNMRiumObject(nmriumObject, undefined, { baseURL });
}

async function loadUserDataset(dataset: UserDataset): Promise<CoreReadReturn> {
  if (dataset.kind === 'files' && dataset.files) {
    const collection = new FileCollection();
    await collection.appendFileList(dataset.files);
    return await demoCore.read(collection);
  }
  if (dataset.kind === 'web' && dataset.entries) {
    return await demoCore.readFromWebSource({ entries: dataset.entries });
  }
  throw new Error('This dataset is empty.');
}

interface InteractiveViewProps {
  workspace?: NMRiumWorkspace;
}

export default function InteractiveView(props: InteractiveViewProps) {
  const { workspace } = props;
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const file = searchParams.get('file');
  const base = searchParams.get('base');
  const { findDataset } = useUserData();

  const [data, setData] = useState<CoreReadReturn>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const contentKey = file || id || workspace || 'default';

  useEffect(() => {
    let cancelled = false;
    setData(undefined);
    setError(undefined);

    async function load() {
      try {
        let result: CoreReadReturn | undefined;
        if (file) {
          setLoading(true);
          result = await loadSample(file, base);
        } else if (id) {
          const dataset = findDataset(id);
          if (!dataset) {
            throw new Error(
              'Dataset not found. Data added in a previous session is cleared on reload — drop the files or scan the URL again.',
            );
          }
          setLoading(true);
          result = await loadUserDataset(dataset);
        }
        if (!cancelled && result) setData(result);
      } catch (error_) {
        if (!cancelled) {
          setError(
            error_ instanceof Error
              ? error_.message
              : 'Failed to load this dataset.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // findDataset changes identity with the sources list; the dataset id is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, base, id]);

  if (error) {
    return (
      <Frame>
        <Message isError>{error}</Message>
      </Frame>
    );
  }

  if (loading) {
    return (
      <Frame>
        <Message>
          <div>
            <PsiMark size={44} spin="loading" />
            <div style={{ marginTop: 14 }}>Parsing NMR data…</div>
          </div>
        </Message>
      </Frame>
    );
  }

  return (
    <Frame>
      <NmriumContainer>
        <NMRium
          key={contentKey}
          state={data?.state}
          aggregator={data?.aggregator}
          {...(workspace && { workspace })}
        />
      </NmriumContainer>
    </Frame>
  );
}
