import styled from '@emotion/styled';
import { useState } from 'react';
import { FaExternalLinkAlt, FaPlay } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

import { PsiMark } from './PsiLogo.js';
import { BmrbIcon } from './SourceIcons.js';
import type { BmrbEntry } from './bmrb.js';
import { bmrbEntryToWebEntries, searchBmrb } from './bmrb.js';
import { useUserData } from './userData.js';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const PageHeader = styled.div`
  border-bottom: 1px solid var(--psi-chrome-border);
  padding: 18px 26px 14px;
`;

const Title = styled.h1`
  align-items: center;
  color: var(--psi-text);
  display: flex;
  font-size: 20px;
  font-weight: 700;
  gap: 10px;
  margin: 0 0 4px;

  span {
    color: #4caf50;
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

const SearchForm = styled.form`
  display: flex;
  gap: 8px;
  max-width: 520px;
`;

const SearchInput = styled.input`
  background: var(--psi-surface);
  border: 1px solid var(--psi-chrome-border);
  border-radius: var(--psi-radius);
  color: var(--psi-text);
  flex: 1;
  font-family: var(--psi-font);
  font-size: 14px;
  padding: 9px 13px;

  &::placeholder {
    color: var(--psi-text-muted);
  }

  &:focus {
    border-color: var(--psi-accent);
    outline: none;
  }
`;

const SearchButton = styled.button`
  background: var(--psi-accent);
  border: none;
  border-radius: var(--psi-radius);
  color: #fff;
  cursor: pointer;
  font-family: var(--psi-font);
  font-size: 13px;
  font-weight: 600;
  padding: 9px 18px;

  &:hover {
    background: var(--psi-accent-strong);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
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
  gap: 10px;
  padding: 14px;
`;

const Name = styled.div`
  color: var(--psi-text);
  font-size: 14px;
  font-weight: 650;
  overflow-wrap: anywhere;
`;

const EntryId = styled.div`
  color: var(--psi-text-muted);
  font-size: 12px;
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

  &:disabled {
    cursor: wait;
    opacity: 0.6;
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

const Message = styled.div<{ isError?: boolean }>`
  color: ${({ isError }) =>
    isError ? 'var(--psi-danger)' : 'var(--psi-text-muted)'};
  font-size: 14px;
  padding: 40px;
  text-align: center;
`;

export default function BmrbView() {
  const navigate = useNavigate();
  const { addSource } = useUserData();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BmrbEntry[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [openingId, setOpeningId] = useState<string>();
  const [error, setError] = useState<string>();

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setError(undefined);
    try {
      setResults(await searchBmrb(query));
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'BMRB search failed.',
      );
    } finally {
      setSearching(false);
    }
  }

  async function openEntry(entry: BmrbEntry) {
    setOpeningId(entry.id);
    setError(undefined);
    try {
      const { title, entries } = await bmrbEntryToWebEntries(entry);
      const source = addSource(`BMRB ${entry.id}`, [
        { title, kind: 'web', entries },
      ]);
      void navigate(`/nmr/user/${source.datasets[0].id}`);
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'Could not open this entry.',
      );
      setOpeningId(undefined);
    }
  }

  return (
    <Wrapper>
      <PageHeader>
        <Title>
          <BmrbIcon size={22} />
          Browse <span>BMRB</span>
        </Title>
        <Sub>
          Metabolomics NMR spectra from the{' '}
          <a href="https://bmrb.io" target="_blank" rel="noreferrer">
            Biological Magnetic Resonance Data Bank
          </a>
          . Search for a compound, then open its Bruker spectrum directly in
          PsiNMR.
        </Sub>
        <SearchForm onSubmit={runSearch}>
          <SearchInput
            value={query}
            placeholder="Search BMRB metabolomics (e.g. glucose, citrate, ATP)…"
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
          />
          <SearchButton type="submit" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </SearchButton>
        </SearchForm>
      </PageHeader>

      {error && <Message isError>{error}</Message>}

      {!error && results === null ? (
        <Message>Search the BMRB metabolomics collection to begin.</Message>
      ) : !error && results?.length === 0 ? (
        <Message>No metabolomics entries match “{query}”.</Message>
      ) : results ? (
        <Grid>
          {results.map((entry) => (
            <Card key={entry.id}>
              <div>
                <Name>{entry.label}</Name>
                <EntryId>{entry.id}</EntryId>
              </div>
              <Actions>
                <OpenButton
                  type="button"
                  disabled={openingId === entry.id}
                  onClick={() => openEntry(entry)}
                >
                  {openingId === entry.id ? (
                    <>
                      <PsiMark size={12} spin="loading" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <FaPlay size={10} />
                      Open in PsiNMR
                    </>
                  )}
                </OpenButton>
                <PageLink href={entry.pageUrl} target="_blank" rel="noreferrer">
                  <FaExternalLinkAlt size={10} />
                  BMRB
                </PageLink>
              </Actions>
            </Card>
          ))}
        </Grid>
      ) : null}
    </Wrapper>
  );
}
