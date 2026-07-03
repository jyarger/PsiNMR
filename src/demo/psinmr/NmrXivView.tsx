import styled from '@emotion/styled';
import { useEffect, useMemo, useState } from 'react';
import { FaExternalLinkAlt, FaPlay } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

import type { NmrXivSample, SamplesProgress } from './nmrxiv.js';
import {
  getNmrXivSamples,
  sampleToWebEntry,
  searchNmrXivSamples,
} from './nmrxiv.js';
import { useUserData } from './userData.js';

const PAGE = 24;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const Header = styled.div`
  border-bottom: 1px solid var(--psi-chrome-border);
  padding: 18px 26px 14px;
`;

const Title = styled.h1`
  color: var(--psi-text);
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;

  span {
    color: var(--psi-accent);
  }
`;

const Sub = styled.p`
  color: var(--psi-text-muted);
  font-size: 13px;
  margin: 0 0 12px;

  a {
    color: var(--psi-accent);
  }
`;

const SearchInput = styled.input`
  background: var(--psi-surface);
  border: 1px solid var(--psi-chrome-border);
  border-radius: var(--psi-radius);
  color: var(--psi-text);
  font-family: var(--psi-font);
  font-size: 14px;
  max-width: 480px;
  padding: 9px 13px;
  width: 100%;

  &::placeholder {
    color: var(--psi-text-muted);
  }

  &:focus {
    border-color: var(--psi-accent);
    outline: none;
  }
`;

const Status = styled.span`
  color: var(--psi-text-muted);
  font-size: 12px;
  margin-left: 12px;
`;

const Grid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  overflow-y: auto;
  padding: 18px 26px 60px;
`;

const Card = styled.div`
  background: var(--psi-surface);
  border: 1px solid var(--psi-chrome-border);
  border-radius: var(--psi-radius);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
`;

const CardHead = styled.div`
  align-items: center;
  display: flex;
  gap: 10px;
`;

const Structure = styled.img`
  background: #fff;
  border-radius: 6px;
  flex-shrink: 0;
  height: 52px;
  object-fit: contain;
  width: 52px;
`;

const Name = styled.div`
  color: var(--psi-text);
  font-size: 14px;
  font-weight: 650;
  overflow-wrap: anywhere;
`;

const Formula = styled.div`
  color: var(--psi-text-muted);
  font-size: 12px;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Chip = styled.span`
  background: var(--psi-accent-soft);
  border-radius: 999px;
  color: var(--psi-accent);
  font-size: 11px;
  padding: 2px 8px;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: auto;
`;

const OpenButton = styled.button`
  align-items: center;
  background: var(--psi-accent);
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  display: flex;
  font-family: var(--psi-font);
  font-size: 12.5px;
  font-weight: 600;
  gap: 7px;
  padding: 7px 13px;

  &:hover {
    background: var(--psi-accent-strong);
  }
`;

const PageLink = styled.a`
  align-items: center;
  border: 1px solid var(--psi-chrome-border);
  border-radius: 6px;
  color: var(--psi-text-muted);
  display: flex;
  font-size: 12px;
  gap: 6px;
  padding: 7px 11px;
  text-decoration: none;

  &:hover {
    border-color: var(--psi-accent);
    color: var(--psi-accent);
  }
`;

const MoreButton = styled.button`
  background: var(--psi-surface);
  border: 1px solid var(--psi-chrome-border);
  border-radius: var(--psi-radius);
  color: var(--psi-text);
  cursor: pointer;
  font-family: var(--psi-font);
  font-size: 13px;
  grid-column: 1 / -1;
  padding: 10px;

  &:hover {
    border-color: var(--psi-accent);
  }
`;

const Message = styled.div<{ isError?: boolean }>`
  color: ${({ isError }) =>
    isError ? 'var(--psi-danger)' : 'var(--psi-text-muted)'};
  font-size: 14px;
  padding: 40px;
  text-align: center;
`;

export default function NmrXivView() {
  const navigate = useNavigate();
  const { addSource } = useUserData();

  const [samples, setSamples] = useState<NmrXivSample[] | null>(null);
  const [progress, setProgress] = useState<SamplesProgress | null>(null);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    getNmrXivSamples((update) => {
      if (!cancelled) setProgress({ ...update });
    })
      .then((result) => {
        if (!cancelled) setSamples(result);
      })
      .catch((error_: unknown) => {
        if (!cancelled) {
          setError(
            error_ instanceof Error
              ? error_.message
              : 'Could not reach nmrXiv.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (samples ? searchNmrXivSamples(samples, query) : []),
    [samples, query],
  );

  function openSample(sample: NmrXivSample) {
    const source = addSource(`nmrXiv ${sample.identifier || sample.name}`, [
      {
        title: sample.name,
        kind: 'web',
        entries: [sampleToWebEntry(sample)],
      },
    ]);
    void navigate(`/nmr/user/${source.datasets[0].id}`);
  }

  return (
    <Wrapper>
      <Header>
        <Title>
          Browse <span>nmrXiv</span>
        </Title>
        <Sub>
          Open, FAIR NMR data from{' '}
          <a href="https://nmrxiv.org" target="_blank" rel="noreferrer">
            nmrxiv.org
          </a>
          . Pick a sample to load its spectra archive directly into PsiNMR —
          larger studies can take a moment to download and parse.
        </Sub>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SearchInput
            value={query}
            placeholder="Search by compound, formula, experiment (e.g. cosy), or identifier…"
            spellCheck={false}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(PAGE);
            }}
          />
          <Status>
            {error
              ? ''
              : samples
                ? `${filtered.length} of ${samples.length} samples`
                : progress
                  ? `Loading catalog… ${progress.loaded}${progress.total ? ` / ${progress.total}` : ''}`
                  : 'Connecting to nmrXiv…'}
          </Status>
        </div>
      </Header>

      {error ? (
        <Message isError>
          {error} — check your network connection and try again.
        </Message>
      ) : !samples ? (
        <Message>Fetching the nmrXiv sample catalog…</Message>
      ) : filtered.length === 0 ? (
        <Message>No samples match “{query}”.</Message>
      ) : (
        <Grid>
          {filtered.slice(0, visible).map((sample) => (
            <Card key={sample.id}>
              <CardHead>
                {sample.photoUrl && (
                  <Structure src={sample.photoUrl} alt="" loading="lazy" />
                )}
                <div style={{ minWidth: 0 }}>
                  <Name>{sample.name}</Name>
                  <Formula>
                    {sample.formula}
                    {sample.weight ? ` · ${sample.weight} g/mol` : ''}
                    {sample.identifier ? ` · ${sample.identifier}` : ''}
                  </Formula>
                </div>
              </CardHead>
              {sample.experiments.length > 0 && (
                <Chips>
                  {sample.experiments.slice(0, 6).map((experiment) => (
                    <Chip key={experiment}>{experiment}</Chip>
                  ))}
                </Chips>
              )}
              <Actions>
                <OpenButton type="button" onClick={() => openSample(sample)}>
                  <FaPlay size={10} />
                  Open in PsiNMR
                </OpenButton>
                {sample.pageUrl && (
                  <PageLink
                    href={sample.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaExternalLinkAlt size={10} />
                    nmrXiv
                  </PageLink>
                )}
              </Actions>
            </Card>
          ))}
          {filtered.length > visible && (
            <MoreButton
              type="button"
              onClick={() => setVisible(visible + PAGE * 2)}
            >
              Show more ({filtered.length - visible} remaining)
            </MoreButton>
          )}
        </Grid>
      )}
    </Wrapper>
  );
}
