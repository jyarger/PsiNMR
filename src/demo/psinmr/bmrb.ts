import type { WebEntry } from './userData.js';

/**
 * Client for the Biological Magnetic Resonance Data Bank (BMRB,
 * https://bmrb.io). The public REST API and the HTTP-FTP data server are
 * both CORS-open, so browsing and loading are fully client-side.
 *
 * PsiNMR targets the BMRB **metabolomics** collection, whose entries store
 * real 1D/2D NMR spectra as Bruker acquisition folders (fid, acqus,
 * pdata/...). Macromolecule entries mostly hold assigned chemical-shift
 * tables, which are not plottable spectra, so they are out of scope here.
 */

const API = 'https://api.bmrb.io/v2';
// BMRB asks API clients to identify themselves via an Application header.
const HEADERS = { Application: 'PsiNMR', accept: 'application/json' };

// The BMRB data server (bmrb.io/ftp) sends no CORS headers, so its files
// cannot be fetched directly from the browser. They are reached through a
// same-origin reverse proxy (nginx in the container, Vite in dev; see
// docker/nginx.conf and vite.config.ts). The search API above is
// CORS-open and stays direct.
const DATA_PREFIX =
  'https://bmrb.io/ftp/pub/bmrb/metabolomics/entry_directories/';
const DATA_PROXY = '/bmrb-data/';

function toProxyUrl(absoluteUrl: string): string {
  if (absoluteUrl.startsWith(DATA_PREFIX)) {
    // Same-origin absolute URL so relative hrefs in directory listings
    // resolve correctly.
    return (
      globalThis.location.origin +
      DATA_PROXY +
      absoluteUrl.slice(DATA_PREFIX.length)
    );
  }
  return absoluteUrl;
}

export interface BmrbEntry {
  id: string;
  label: string;
  pageUrl: string;
}

interface RawInstantResult {
  value: string;
  label?: string;
}

/** Live search of the metabolomics database by compound name / keyword. */
export async function searchBmrb(term: string): Promise<BmrbEntry[]> {
  const query = term.trim();
  if (!query) return [];
  const response = await fetch(
    `${API}/instant?term=${encodeURIComponent(query)}&database=metabolomics`,
    { headers: HEADERS },
  );
  if (!response.ok) {
    throw new Error(`BMRB search returned HTTP ${response.status}`);
  }
  const data: RawInstantResult[] = await response.json();
  return data
    .filter((item) => item.value?.startsWith('bmse'))
    .map((item) => ({
      id: item.value,
      label: item.label ?? item.value,
      pageUrl: `https://bmrb.io/data_library/summary/index.php?bmrbId=${item.value}`,
    }));
}

interface RawExperiment {
  Name?: string;
  Experiment_file?: Array<{ type?: string; url?: string }>;
}

function normalizeDirUrl(url: string): string {
  // Route through the same-origin proxy, collapse accidental double
  // slashes (BMRB emits some), and ensure a trailing slash.
  let cleaned = toProxyUrl(url).replaceAll(/(?<!:)\/{2,}/g, '/');
  if (!cleaned.endsWith('/')) cleaned += '/';
  return cleaned;
}

async function enumerateDir(url: string, depth = 0): Promise<string[]> {
  if (depth > 5) return [];
  const response = await fetch(url);
  if (!response.ok) return [];
  const html = await response.text();
  const document_ = new DOMParser().parseFromString(html, 'text/html');
  const files: string[] = [];
  const subdirs: string[] = [];
  for (const anchor of document_.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href');
    if (
      !href ||
      href.startsWith('..') ||
      href.startsWith('/') ||
      href.startsWith('?') ||
      href.startsWith('#')
    ) {
      continue;
    }
    const child = new URL(href, url).href;
    if (href.endsWith('/')) {
      subdirs.push(child);
    } else {
      files.push(child);
    }
  }
  const nested = await Promise.all(
    subdirs.map((dir) => enumerateDir(dir, depth + 1)),
  );
  return [...files, ...nested.flat()];
}

/**
 * Resolves a BMRB metabolomics entry into web-source entries for its first
 * spectrum's Bruker folder (fid + acqus + pdata/...), ready for
 * `core.readFromWebSource`.
 */
export async function bmrbEntryToWebEntries(
  entry: BmrbEntry,
): Promise<{ title: string; entries: WebEntry[] }> {
  const response = await fetch(`${API}/entry/${entry.id}/experiments`, {
    headers: HEADERS,
  });
  if (!response.ok) {
    throw new Error(`BMRB entry ${entry.id} returned HTTP ${response.status}`);
  }
  const experiments: RawExperiment[] = await response.json();

  let directoryUrl: string | undefined;
  for (const experiment of experiments) {
    const directoryFile = experiment.Experiment_file?.find(
      (file) => file.type === 'text/directory' && file.url,
    );
    if (directoryFile?.url) {
      directoryUrl = normalizeDirUrl(directoryFile.url);
      break;
    }
  }
  if (!directoryUrl) {
    throw new Error('This BMRB entry has no downloadable spectrum folder.');
  }

  const fileUrls = await enumerateDir(directoryUrl);
  if (fileUrls.length === 0) {
    throw new Error('Could not read the BMRB spectrum folder.');
  }
  const origin = new URL(directoryUrl).origin;
  const entries: WebEntry[] = fileUrls.map((url) => ({
    relativePath: new URL(url).pathname,
    baseURL: origin,
  }));

  return { title: `${entry.id} — ${entry.label}`, entries };
}
