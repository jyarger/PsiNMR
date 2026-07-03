import type { WebEntry } from './userData.js';

/**
 * Client for the nmrXiv FAIR NMR repository (https://nmrxiv.org).
 *
 * The public API is CORS-open, as are the dataset archives on
 * s3.uni-jena.de, so browsing and loading are fully client-side. Samples
 * (studies) are the browsing unit: each has a downloadable zip archive of
 * its spectra that the PsiNMR parsers read directly.
 */

const API = 'https://nmrxiv.org/api/v1';
const PAGE_SIZE = 100;

interface RawMolecule {
  molecular_formula?: string;
  molecular_weight?: number;
}

interface RawSample {
  id: number;
  name: string;
  description?: string;
  identifier?: string;
  public_url?: string;
  doi?: string;
  download_url?: string;
  photo_url?: string;
  study_preview_urls?: string[];
  molecules?: RawMolecule[];
  experiment_types?: unknown;
  is_public?: boolean;
}

export interface NmrXivSample {
  id: number;
  name: string;
  description: string;
  identifier: string;
  pageUrl: string;
  doi: string;
  downloadUrl: string;
  photoUrl: string;
  formula: string;
  weight: number | null;
  experiments: string[];
}

function normalizeExperiments(value: unknown): string[] {
  let items: string[] = [];
  if (Array.isArray(value)) {
    items = value.map(String);
  } else if (typeof value === 'string') {
    items = value.split(/[,;]/);
  }
  return items
    .map((item) => item.trim())
    .filter((item) => item && item !== 'null' && item !== 'undefined');
}

function normalizeSample(raw: RawSample): NmrXivSample | null {
  if (!raw.download_url || raw.is_public === false) return null;
  const molecule = raw.molecules?.[0];
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? '',
    identifier: raw.identifier ?? '',
    pageUrl: raw.public_url ?? '',
    doi: raw.doi ?? '',
    downloadUrl: raw.download_url,
    photoUrl: raw.photo_url || raw.study_preview_urls?.[0] || '',
    formula: molecule?.molecular_formula ?? '',
    weight: molecule?.molecular_weight ?? null,
    experiments: normalizeExperiments(raw.experiment_types),
  };
}

interface ListResponse {
  data: RawSample[];
  meta?: { total?: number; last_page?: number };
}

async function fetchPage(page: number): Promise<ListResponse> {
  const response = await fetch(
    `${API}/list/samples?size=${PAGE_SIZE}&page=${page}`,
    { headers: { accept: 'application/json' } },
  );
  if (!response.ok) {
    throw new Error(`nmrXiv API returned HTTP ${response.status}`);
  }
  return response.json();
}

export interface SamplesProgress {
  loaded: number;
  total: number | null;
  done: boolean;
}

// Module-level cache: the full catalog is fetched once per session and
// then searched locally.
let cache: NmrXivSample[] | null = null;
let inflight: Promise<NmrXivSample[]> | null = null;

export function getNmrXivSamples(
  onProgress?: (progress: SamplesProgress) => void,
): Promise<NmrXivSample[]> {
  if (cache) return Promise.resolve(cache);
  inflight ??= (async () => {
    const samples: NmrXivSample[] = [];
    const first = await fetchPage(1);
    const lastPage = first.meta?.last_page ?? 1;
    const total = first.meta?.total ?? null;

    const collect = (raws: RawSample[]) => {
      for (const raw of raws) {
        const sample = normalizeSample(raw);
        if (sample) samples.push(sample);
      }
      onProgress?.({ loaded: samples.length, total, done: false });
    };

    collect(first.data);
    // Fetch the remaining pages a few at a time: batches run in parallel,
    // but each batch intentionally awaits the previous one to keep at most
    // CONCURRENCY requests in flight against the public API.
    const CONCURRENCY = 4;
    for (let page = 2; page <= lastPage; page += CONCURRENCY) {
      const batch = [];
      for (let p = page; p < page + CONCURRENCY && p <= lastPage; p++) {
        batch.push(fetchPage(p));
      }
      // eslint-disable-next-line no-await-in-loop
      const results = await Promise.all(batch);
      for (const result of results) collect(result.data);
    }

    samples.sort((a, b) => a.name.localeCompare(b.name));
    onProgress?.({ loaded: samples.length, total, done: true });
    cache = samples;
    return samples;
  })().catch((error: unknown) => {
    // Allow a retry on the next call instead of caching the failure.
    inflight = null;
    throw error;
  });
  return inflight;
}

export function searchNmrXivSamples(
  samples: NmrXivSample[],
  query: string,
): NmrXivSample[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return samples;
  return samples.filter((sample) => {
    const haystack =
      `${sample.name} ${sample.description} ${sample.formula} ${sample.experiments.join(' ')} ${sample.identifier}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Web-source entry for the sample's zip archive. */
export function sampleToWebEntry(sample: NmrXivSample): WebEntry {
  const url = new URL(sample.downloadUrl);
  return { relativePath: url.pathname, baseURL: url.origin };
}
