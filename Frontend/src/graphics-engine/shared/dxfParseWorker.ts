import { parseDXF, type DXFData } from '@/utils/dxfParser';

type DxfParseWorkerRequest = {
  content: string;
};

type DxfParseWorkerResponse =
  | { ok: true; data: DXFData }
  | { ok: false; error: string };

self.onmessage = (event: MessageEvent<DxfParseWorkerRequest>) => {
  try {
    const data = parseDXF(event.data.content);
    const response: DxfParseWorkerResponse = { ok: true, data };
    self.postMessage(response);
  } catch (error) {
    const response: DxfParseWorkerResponse = {
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao processar o arquivo DXF no worker.'
    };
    self.postMessage(response);
  }
};
