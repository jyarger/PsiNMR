import styled from '@emotion/styled';
import { marked } from 'marked';
import { useMemo } from 'react';
import { NavLink, useParams } from 'react-router-dom';

import analysis from './docs/analysis.md?raw';
import computeEngine from './docs/compute-engine.md?raw';
import faq from './docs/faq.md?raw';
import gettingStarted from './docs/getting-started.md?raw';
import loadingData from './docs/loading-data.md?raw';
import processing1d from './docs/processing-1d.md?raw';
import processing2d from './docs/processing-2d.md?raw';
import structures from './docs/structures.md?raw';
import tools from './docs/tools.md?raw';

interface DocPage {
  slug: string;
  title: string;
  source: string;
}

const PAGES: DocPage[] = [
  { slug: 'getting-started', title: 'Getting started', source: gettingStarted },
  { slug: 'loading-data', title: 'Loading data', source: loadingData },
  { slug: 'processing-1d', title: '1D processing', source: processing1d },
  { slug: 'processing-2d', title: '2D processing', source: processing2d },
  { slug: 'analysis', title: 'Peaks, integrals & ranges', source: analysis },
  { slug: 'structures', title: 'Structures & assignment', source: structures },
  { slug: 'tools', title: 'Predict & Simulate', source: tools },
  {
    slug: 'compute-engine',
    title: 'The Ψ compute engine',
    source: computeEngine,
  },
  { slug: 'faq', title: 'FAQ', source: faq },
];

/**
 * Legacy NMRium documentation slugs (docs.nmrium.org paths used by in-app
 * help links) mapped onto PsiNMR's internal pages.
 */
const LEGACY_SLUGS: Record<string, string> = {
  'zoom-and-scale': 'analysis',
  peaks: 'processing-1d',
  integrations: 'analysis',
  ranges: 'analysis',
  zones: 'processing-2d',
  slicing: 'processing-2d',
  'structure-labelling': 'structures',
  apodization: 'processing-1d',
  'zero-filling': 'processing-1d',
  phase: 'processing-1d',
  baseline: 'processing-1d',
  ft: 'processing-1d',
};

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
`;

const Toc = styled.nav`
  background: var(--psi-chrome);
  border-right: 1px solid var(--psi-chrome-border);
  flex-shrink: 0;
  overflow-y: auto;
  padding: 18px 10px;
  width: 230px;

  a {
    border-radius: 6px;
    color: var(--psi-text-on-chrome-muted);
    display: block;
    font-size: 13.5px;
    padding: 8px 12px;
    text-decoration: none;

    &:hover {
      background: var(--psi-chrome-raised);
      color: var(--psi-text-on-chrome);
    }

    &.active {
      background: var(--psi-accent-soft);
      color: var(--psi-accent-on-chrome);
      font-weight: 600;
    }
  }
`;

const TocTitle = styled.div`
  color: var(--psi-text-on-chrome-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  padding: 0 12px 10px;
  text-transform: uppercase;
`;

const Content = styled.article`
  color: var(--psi-text);
  flex: 1;
  line-height: 1.65;
  max-width: 860px;
  overflow-y: auto;
  padding: 28px 42px 80px;

  h1 {
    font-size: 26px;
    margin: 0 0 16px;
  }

  h2 {
    border-bottom: 1px solid var(--psi-chrome-border);
    font-size: 19px;
    margin: 28px 0 10px;
    padding-bottom: 6px;
  }

  a {
    color: var(--psi-accent);
  }

  ul,
  ol {
    margin: 10px 0;
    padding-left: 26px;
  }

  ul {
    list-style: disc;
  }

  ol {
    list-style: decimal;
  }

  li {
    margin: 4px 0;
  }

  code {
    background: var(--psi-surface);
    border: 1px solid var(--psi-chrome-border);
    border-radius: 4px;
    font-size: 0.9em;
    padding: 1px 5px;
  }

  pre {
    background: var(--psi-chrome);
    border-radius: var(--psi-radius);
    color: var(--psi-text-on-chrome);
    overflow-x: auto;
    padding: 14px;

    code {
      background: transparent;
      border: none;
      padding: 0;
    }
  }

  table {
    border-collapse: collapse;
    margin: 12px 0;
    width: 100%;
  }

  th,
  td {
    border: 1px solid var(--psi-chrome-border);
    padding: 7px 10px;
    text-align: left;
  }

  th {
    background: var(--psi-surface);
  }
`;

export default function DocsView() {
  const params = useParams();
  const splat = params['*'] ?? '';

  const page = useMemo(() => {
    // Normalize: strip legacy docs.nmrium.org prefixes like "help/" or
    // "30_2d-spectra/" and trailing slashes.
    const raw = splat.replaceAll(/^\/+|\/+$/g, '');
    const last = raw.split('/').findLast(Boolean) ?? '';
    const slug = LEGACY_SLUGS[last] ?? last;
    return PAGES.find((candidate) => candidate.slug === slug) ?? PAGES[0];
  }, [splat]);

  const html = useMemo(
    () => marked.parse(page.source, { async: false }),
    [page],
  );

  return (
    <Wrapper>
      <Toc className="psi-chrome">
        <TocTitle>PsiNMR manual</TocTitle>
        {PAGES.map(({ slug, title }) => (
          <NavLink key={slug} to={`/docs/${slug}`} end>
            {title}
          </NavLink>
        ))}
      </Toc>
      {}
      <Content dangerouslySetInnerHTML={{ __html: html }} />
    </Wrapper>
  );
}
