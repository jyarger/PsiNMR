import styled from '@emotion/styled';
import { memo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FaChevronDown,
  FaChevronRight,
  FaFileImport,
  FaGlobe,
  FaLayerGroup,
  FaTimes,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

import { resolveRemoteSource } from './remoteData.js';
import type { UserDataset } from './userData.js';
import { useUserData } from './userData.js';

const PANEL_WIDTH = 280;

const Panel = styled.aside`
  background: var(--psi-chrome);
  color: var(--psi-text-on-chrome);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden auto;
  width: ${PANEL_WIDTH}px;
`;

const Section = styled.div`
  border-bottom: 1px solid var(--psi-chrome-border);
  padding: 12px;
`;

const SectionTitle = styled.div`
  color: var(--psi-text-on-chrome-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  margin-bottom: 8px;
  text-transform: uppercase;
`;

const DropArea = styled.div<{ isDragActive: boolean }>`
  align-items: center;
  border: 1.5px dashed
    ${({ isDragActive }) =>
      isDragActive ? 'var(--psi-accent-on-chrome)' : 'var(--psi-chrome-border)'};
  border-radius: var(--psi-radius);
  color: var(--psi-text-on-chrome-muted);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-size: 12.5px;
  gap: 6px;
  padding: 16px 10px;
  text-align: center;
  transition: border-color 120ms ease;

  svg {
    color: var(--psi-accent-on-chrome);
    font-size: 18px;
  }

  &:hover {
    border-color: var(--psi-accent-on-chrome);
  }
`;

const UrlForm = styled.form`
  display: flex;
  gap: 6px;
`;

const UrlInput = styled.input`
  background: var(--psi-chrome-raised);
  border: 1px solid var(--psi-chrome-border);
  border-radius: 6px;
  color: var(--psi-text-on-chrome);
  flex: 1;
  font-family: var(--psi-font);
  font-size: 12.5px;
  min-width: 0;
  padding: 7px 9px;

  &::placeholder {
    color: var(--psi-text-on-chrome-muted);
  }

  &:focus {
    border-color: var(--psi-accent);
    outline: none;
  }
`;

const LoadButton = styled.button`
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

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
`;

const ErrorText = styled.p`
  color: #e5a29b;
  font-size: 12px;
  margin: 8px 0 0;
`;

const GroupHeader = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--psi-text-on-chrome);
  cursor: pointer;
  display: flex;
  font-family: var(--psi-font);
  font-size: 13px;
  font-weight: 600;
  gap: 8px;
  padding: 7px 8px;
  text-align: left;
  width: 100%;

  svg {
    color: var(--psi-text-on-chrome-muted);
    flex-shrink: 0;
    font-size: 10px;
  }

  &:hover {
    background: var(--psi-chrome-raised);
  }
`;

const Item = styled.button`
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--psi-text-on-chrome-muted);
  cursor: pointer;
  display: block;
  font-family: var(--psi-font);
  font-size: 12.5px;
  overflow: hidden;
  padding: 6px 8px 6px 26px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;

  &:hover {
    background: var(--psi-accent-soft);
    color: var(--psi-text-on-chrome);
  }
`;

const SourceHeader = styled.div`
  align-items: center;
  display: flex;

  > button:first-of-type {
    flex: 1;
  }
`;

const RemoveButton = styled.button`
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--psi-text-on-chrome-muted);
  cursor: pointer;
  font-size: 11px;
  padding: 6px;

  &:hover {
    color: var(--psi-danger);
  }
`;

interface SampleItem {
  title: string;
  file?: string;
  view?: string;
  children?: SampleItem[];
  groupName?: string;
}

function Group({
  title,
  children,
  defaultOpen = false,
  action,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <SourceHeader>
        <GroupHeader type="button" onClick={() => setOpen(!open)}>
          {open ? <FaChevronDown /> : <FaChevronRight />}
          {title}
        </GroupHeader>
        {action}
      </SourceHeader>
      {open && children}
    </div>
  );
}

interface DataPanelProps {
  samples: SampleItem[];
  baseURL?: string;
}

export default memo(function DataPanel(props: DataPanelProps) {
  const { samples, baseURL = './' } = props;
  const navigate = useNavigate();
  const { sources, addSource, removeSource } = useUserData();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted.length === 0) return;
      const title =
        accepted.length === 1
          ? accepted[0].name
          : `${accepted[0].name} (+${accepted.length - 1})`;
      const source = addSource('Dropped files', [
        { title, kind: 'files', files: accepted },
      ]);
      void navigate(`/nmr/user/${source.datasets[0].id}`);
    },
  });

  async function loadFromUrl(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const result = await resolveRemoteSource(url);
      if (result.datasets.length === 0) {
        throw new Error('No NMR data found at this location.');
      }
      const datasets: Array<Omit<UserDataset, 'id'>> = result.datasets.map(
        (dataset) => ({
          title: dataset.title,
          kind: 'web' as const,
          entries: dataset.entries,
        }),
      );
      if (datasets.length > 1) {
        datasets.unshift({
          title: `All (${result.datasets.length} files)`,
          kind: 'web',
          entries: result.datasets.flatMap((dataset) => dataset.entries),
        });
      }
      const source = addSource(result.name, datasets);
      setUrl('');
      if (source.datasets.length === 1) {
        void navigate(`/nmr/user/${source.datasets[0].id}`);
      }
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'Could not load this URL.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel className="psi-chrome">
      <Section>
        <SectionTitle>Add data</SectionTitle>
        <DropArea {...getRootProps({ isDragActive })}>
          <input {...getInputProps()} />
          <FaFileImport />
          Drop NMR files or zip datasets here, or click to browse
        </DropArea>
        <div style={{ height: 10 }} />
        <UrlForm onSubmit={loadFromUrl}>
          <UrlInput
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Public folder / repo / file URL"
            spellCheck={false}
          />
          <LoadButton type="submit" disabled={loading}>
            {loading ? '…' : 'Scan'}
          </LoadButton>
        </UrlForm>
        {error && <ErrorText>{error}</ErrorText>}
      </Section>

      {sources.length > 0 && (
        <Section>
          <SectionTitle>
            <FaGlobe style={{ marginRight: 6, verticalAlign: '-1px' }} />
            Your data
          </SectionTitle>
          {sources.map((source) => (
            <Group
              key={source.id}
              title={source.name}
              defaultOpen
              action={
                <RemoveButton
                  type="button"
                  title="Remove this source"
                  onClick={() => removeSource(source.id)}
                >
                  <FaTimes />
                </RemoveButton>
              }
            >
              {source.datasets.map((dataset) => (
                <Item
                  key={dataset.id}
                  type="button"
                  title={dataset.title}
                  onClick={() => void navigate(`/nmr/user/${dataset.id}`)}
                >
                  {dataset.title}
                </Item>
              ))}
            </Group>
          ))}
        </Section>
      )}

      <Section style={{ borderBottom: 'none' }}>
        <SectionTitle>
          <FaLayerGroup style={{ marginRight: 6, verticalAlign: '-1px' }} />
          Sample library
        </SectionTitle>
        {samples.map((group) => {
          if (!group.children || !group.groupName) return null;
          const items = group.children.filter(
            (item) => item.file && !item.view,
          );
          if (items.length === 0) return null;
          return (
            <Group key={group.groupName} title={group.groupName}>
              {items.map((item) => (
                <Item
                  key={item.file}
                  type="button"
                  title={item.title}
                  onClick={() =>
                    void navigate(
                      `/nmr/sample?file=${encodeURIComponent(
                        item.file as string,
                      )}&base=${encodeURIComponent(baseURL)}`,
                    )
                  }
                >
                  {item.title}
                </Item>
              ))}
            </Group>
          );
        })}
      </Section>
    </Panel>
  );
});
