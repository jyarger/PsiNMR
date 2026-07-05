import type { NMRiumState } from '../../component/main/index.js';

/**
 * postMessage bridge for embedding PsiNMR in an external app's iframe.
 *
 * Wire-compatible with the NMRium react wrapper
 * (github.com/NFDI4Chem/nmrium-react-wrapper): the same `nmr-wrapper:*`
 * namespace, event names and payload shapes, so a host that already embeds
 * NMRium can point its iframe at PsiNMR's `#/embed` route unchanged.
 *
 * Messages travel as `{ type: 'nmr-wrapper:<event>', data }`:
 *   parent → iframe : `load`, `action-request`
 *   iframe → parent : `data-change`, `action-response`, `error`
 */

const NAMESPACE = 'nmr-wrapper';

interface EmbedBlobObject {
  blob: Blob;
  width: number;
  height: number;
}

export type LoadData =
  | { type: 'url'; data: string[]; activeTab?: string }
  | { type: 'file'; data: File[]; activeTab?: string }
  | { type: 'nmrium'; data: object; activeTab?: string };

export type ActionRequest =
  | { type: 'exportSpectraViewerAsBlob' }
  | { type: 'selectTab'; params: { tab: string } };

interface ActionResponse {
  type: 'exportSpectraViewerAsBlob';
  data: EmbedBlobObject;
}

interface DataChange {
  state: NMRiumState;
  source: 'data' | 'view' | 'settings';
}

interface EventPayloads {
  load: LoadData;
  'data-change': DataChange;
  error: { message: string };
  'action-request': ActionRequest;
  'action-response': ActionResponse;
}
type EventType = keyof EventPayloads;

// Post an event up to the embedding host.
export function triggerEmbedEvent<T extends EventType>(
  type: T,
  data: EventPayloads[T],
): void {
  if (window.parent === window.self) return; // not embedded
  window.parent.postMessage({ type: `${NAMESPACE}:${type}`, data }, '*');
}

// Listen for an event coming from the embedding host. Returns an unsubscribe.
export function onEmbedEvent<T extends EventType>(
  type: T,
  listener: (data: EventPayloads[T]) => void,
): () => void {
  function handle(event: MessageEvent) {
    const message = event.data as
      { type?: string; data?: EventPayloads[T] } | undefined;
    if (message?.type === `${NAMESPACE}:${type}` && message.data) {
      listener(message.data);
    }
  }
  window.addEventListener('message', handle);
  return () => window.removeEventListener('message', handle);
}
