import type { WebEntry } from './userData.js';

/**
 * Resolves a user-provided URL into a list of NMR datasets.
 *
 * Supported sources:
 * - a direct link to a dataset file (zip, jcamp, jeol, nmrium, ...)
 * - a GitHub repository or folder (scanned through the GitHub API)
 * - any web server directory listing (Apache/nginx autoindex pages)
 */

const NMR_EXTENSIONS = new Set([
  'zip',
  'jdx',
  'dx',
  'jcamp',
  'nmrium',
  'jdf',
  'mnova',
  'fid',
  'json',
]);

export interface RemoteScanResult {
  name: string;
  datasets: Array<{ title: string; entries: WebEntry[] }>;
}

function extensionOf(path: string) {
  const clean = path.split(/[?#]/, 1)[0];
  const index = clean.lastIndexOf('.');
  return index === -1 ? '' : clean.slice(index + 1).toLowerCase();
}

function isNmrFile(path: string) {
  return NMR_EXTENSIONS.has(extensionOf(path));
}

function fileTitle(path: string) {
  const parts = path.split('/').filter(Boolean);
  const file = parts.at(-1) ?? path;
  const parent = parts.at(-2);
  return parent ? `${parent}/${file}` : file;
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.json();
}

interface GithubLocation {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

function parseGithubUrl(url: URL): GithubLocation | null {
  if (url.hostname !== 'github.com') return null;
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;
  const [owner, repo, marker, branch, ...rest] = segments;
  if (marker === 'tree' || marker === 'blob') {
    return { owner, repo, branch, path: rest.join('/') };
  }
  return { owner, repo };
}

async function scanGithub(location: GithubLocation): Promise<RemoteScanResult> {
  const { owner, repo, path = '' } = location;
  let { branch } = location;
  if (!branch) {
    const info = await fetchJson(
      `https://api.github.com/repos/${owner}/${repo}`,
    );
    branch = info.default_branch as string;
  }

  const tree = await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
  );

  const baseURL = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  const datasets: RemoteScanResult['datasets'] = [];
  for (const node of tree.tree ?? []) {
    if (node.type !== 'blob') continue;
    const filePath: string = node.path;
    if (path && !filePath.startsWith(path)) continue;
    if (!isNmrFile(filePath)) continue;
    datasets.push({
      title: fileTitle(filePath),
      entries: [{ relativePath: filePath, baseURL }],
    });
  }

  return {
    name: path ? `${repo}/${path}` : `${owner}/${repo}`,
    datasets,
  };
}

async function scanDirectoryListing(url: URL): Promise<RemoteScanResult> {
  const response = await fetch(url.href);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url.href}`);
  }
  const html = await response.text();
  const document = new DOMParser().parseFromString(html, 'text/html');
  const anchors = [...document.querySelectorAll('a[href]')];

  const datasets: RemoteScanResult['datasets'] = [];
  const seen = new Set<string>();
  for (const anchor of anchors) {
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('?') || href.startsWith('#')) continue;
    const resolved = new URL(href, url.href);
    if (resolved.origin !== url.origin) continue;
    if (!isNmrFile(resolved.pathname)) continue;
    if (seen.has(resolved.href)) continue;
    seen.add(resolved.href);
    datasets.push({
      title: fileTitle(resolved.pathname),
      entries: [{ relativePath: resolved.pathname, baseURL: resolved.origin }],
    });
  }

  return {
    name: url.hostname + url.pathname,
    datasets,
  };
}

export async function resolveRemoteSource(
  input: string,
): Promise<RemoteScanResult> {
  const url = new URL(input.trim());

  const github = parseGithubUrl(url);
  if (github) {
    // A direct link to a file on github.com (blob URL with an NMR extension)
    if (github.path && isNmrFile(github.path)) {
      const baseURL = `https://raw.githubusercontent.com/${github.owner}/${github.repo}/${github.branch}/`;
      return {
        name: fileTitle(github.path),
        datasets: [
          {
            title: fileTitle(github.path),
            entries: [{ relativePath: github.path, baseURL }],
          },
        ],
      };
    }
    return await scanGithub(github);
  }

  if (isNmrFile(url.pathname)) {
    return {
      name: fileTitle(url.pathname),
      datasets: [
        {
          title: fileTitle(url.pathname),
          entries: [{ relativePath: url.pathname, baseURL: url.origin }],
        },
      ],
    };
  }

  return await scanDirectoryListing(url);
}
