import type { CoreReadReturn } from '@zakodium/nmrium-core';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import {
  TextWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
} from '@zip.js/zip.js';
import { FileCollection } from 'file-collection';

import { demoCore } from '../utility/core.js';

/**
 * Reads *arrayed* 1D Varian/Agilent data (a single `.fid` holding a series of
 * FIDs, e.g. a CP Hartmann–Hahn or pulse-width array). The stock loader
 * rejects any `.fid` whose header reports more than one block, so PsiNMR
 * splits the arrayed `.fid` into one single-block `.fid` per array element and
 * runs each through the same validated loader — yielding one 1D spectrum per
 * element, labelled by the arrayed parameter's value.
 *
 * Returns null when the zip is not an arrayed Varian dataset (single-block
 * Varian, Bruker, JCAMP, …), so the caller falls back to the normal path.
 * Any parsing error also yields null — arrayed handling never breaks a zip
 * that already loads.
 */

const MAIN_HEADER_BYTES = 32;
const BLOCK_HEADER_BYTES = 28;

interface VarianFidHeader {
  nblocks: number;
  ntraces: number;
  np: number;
  ebytes: number;
  bbytes: number;
  nbheaders: number;
}

// Varian FID main header: all big-endian (see Agilent/Varian data format).
function readFidHeader(buffer: ArrayBuffer): VarianFidHeader {
  const view = new DataView(buffer);
  return {
    nblocks: view.getInt32(0),
    ntraces: view.getInt32(4),
    np: view.getInt32(8),
    ebytes: view.getInt32(12),
    bbytes: view.getInt32(20),
    nbheaders: view.getInt32(28),
  };
}

// Only treat a `.fid` as arrayed Varian when the header is fully
// self-consistent, so a Bruker/other binary is never misread as Varian.
function isArrayedVarianFid(
  header: VarianFidHeader,
  fileSize: number,
): boolean {
  const { nblocks, ntraces, np, ebytes, bbytes, nbheaders } = header;
  const expectedBlockBytes = nbheaders * BLOCK_HEADER_BYTES + np * ebytes;
  return (
    nblocks > 1 &&
    ntraces === 1 &&
    np > 0 &&
    (ebytes === 2 || ebytes === 4) &&
    nbheaders >= 1 &&
    bbytes === expectedBlockBytes &&
    MAIN_HEADER_BYTES + nblocks * bbytes === fileSize
  );
}

// Build a standalone single-block `.fid` (main header with nblocks=1 followed
// by the one requested block) that the stock loader reads as a normal 1D FID.
function extractBlock(
  fid: ArrayBuffer,
  header: VarianFidHeader,
  index: number,
): ArrayBuffer {
  const { bbytes } = header;
  const out = new Uint8Array(MAIN_HEADER_BYTES + bbytes);
  out.set(new Uint8Array(fid, 0, MAIN_HEADER_BYTES), 0);
  out.set(
    new Uint8Array(fid, MAIN_HEADER_BYTES + index * bbytes, bbytes),
    MAIN_HEADER_BYTES,
  );
  new DataView(out.buffer).setInt32(0, 1); // nblocks = 1
  return out.buffer;
}

// Reads a procpar parameter's values. The Varian procpar stores each parameter
// as a definition line (name first) followed by a "count value…" line.
function procparValues(procpar: string, name: string): string[] {
  const match = new RegExp(String.raw`^${name} .*\n(.*)`, 'm').exec(procpar);
  if (!match) return [];
  const line = match[1].trim().replace(/^\d+\s*/, '');
  if (line.includes('"')) {
    return [...line.matchAll(/"(?<value>[^"]*)"/g)].map(
      (m) => m.groups?.value ?? '',
    );
  }
  return line.split(/\s+/).filter(Boolean);
}

function isFileEntry(entry: Entry): entry is FileEntry {
  return 'getData' in entry && typeof entry.getData === 'function';
}

async function readEntries(zipBuffer: ArrayBuffer) {
  const reader = new ZipReader(new Uint8ArrayReader(new Uint8Array(zipBuffer)));
  try {
    const entries = await reader.getEntries();
    const files = entries.filter(isFileEntry);
    const fidEntry = files.find((entry) => /(?:^|\/)fid$/.test(entry.filename));
    const procparEntry = files.find((entry) =>
      /(?:^|\/)procpar$/.test(entry.filename),
    );
    if (!fidEntry || !procparEntry) return null;
    const fidData = await fidEntry.getData(new Uint8ArrayWriter());
    const fid = fidData.buffer;
    const procpar = await procparEntry.getData(new TextWriter());
    return { fid, procpar, fidName: fidEntry.filename };
  } finally {
    await reader.close();
  }
}

export async function readVarianArrayedZip(
  zipBuffer: ArrayBuffer,
): Promise<CoreReadReturn | null> {
  let parsed: Awaited<ReturnType<typeof readEntries>>;
  try {
    parsed = await readEntries(zipBuffer);
  } catch {
    return null;
  }
  if (!parsed) return null;

  const { fid, procpar, fidName } = parsed;
  const header = readFidHeader(fid);
  if (!isArrayedVarianFid(header, fid.byteLength)) return null;

  const arrayName = procparValues(procpar, 'array')[0] ?? '';
  const arrayValues = arrayName ? procparValues(procpar, arrayName) : [];
  const baseName =
    fidName
      .replace(/\/?fid$/, '')
      .split('/')
      .pop() || 'array';

  const collection = new FileCollection();
  // Sequential by design: each append mutates the shared collection, so the
  // calls must not overlap.
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < header.nblocks; i++) {
    const folder = `${baseName}_${String(i + 1).padStart(3, '0')}.fid`;
    await collection.appendArrayBuffer(
      `${folder}/fid`,
      extractBlock(fid, header, i),
    );
    await collection.appendText(`${folder}/procpar`, procpar);
  }
  /* eslint-enable no-await-in-loop */

  const result = await demoCore.read(collection);

  // Rename each spectrum from its folder to "<param>=<value>" using the index
  // encoded in the folder name, so ordering never mislabels an element.
  const spectra = result.state.data?.spectra ?? [];
  for (const spectrum of spectra) {
    const indexMatch = /_(?<index>\d+)\.fid$/.exec(spectrum.info?.name ?? '');
    if (!indexMatch?.groups) continue;
    const value = arrayValues[Number(indexMatch.groups.index) - 1];
    if (arrayName && value !== undefined) {
      spectrum.info.name = `${arrayName}=${value}`;
    }
  }

  return result;
}
