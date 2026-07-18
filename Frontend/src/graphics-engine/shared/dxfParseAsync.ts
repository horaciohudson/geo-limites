import { parseDXF, type DXFData } from '@/graphics-engine/shared/dxf';

type DxfParseWorkerResponse =
  | { ok: true; data: DXFData }
  | { ok: false; error: string };

const DXF_PARSE_WORKER_TIMEOUT_MS = 120000;

export const parseDxfAsync = async (content: string): Promise<DXFData> => {
  if (typeof Worker === 'undefined' || typeof window === 'undefined') {
    return parseDXF(content);
  }

  let worker: Worker;

  try {
    worker = new Worker(
      new URL('./dxfParseWorker.ts', import.meta.url),
      { type: 'module' }
    );
  } catch (error) {
    console.warn('Falha ao inicializar o worker de parse DXF. Recuando para parse local.', error);
    return parseDXF(content);
  }

  return new Promise<DXFData>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      worker.terminate();
      reject(new Error('Timeout ao processar o arquivo DXF.'));
    }, DXF_PARSE_WORKER_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<DxfParseWorkerResponse>) => {
      cleanup();
      if (event.data.ok) {
        resolve(event.data.data);
        return;
      }

      reject(new Error(event.data.error));
    };

    worker.onerror = (event) => {
      cleanup();
      reject(event.error instanceof Error ? event.error : new Error('Falha no worker de parse DXF.'));
    };

    worker.postMessage({ content });
  }).catch((error) => {
    console.warn('Falha ao processar DXF em worker. Recuando para parse local.', error);
    return parseDXF(content);
  });
};
