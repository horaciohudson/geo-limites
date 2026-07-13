import api from '@/services/api';
import type { DxfTextLoader } from '@/graphics-engine/shared/contracts';
import { decodeDxfTextBuffer } from '@/graphics-engine/shared/dxfTextCodec';

export const loadGeoLimitesDxfText: DxfTextLoader = async (fileId) => {
  const response = await api.get(`/dxf/${fileId}/download`, {
    responseType: 'arraybuffer'
  });

  return decodeDxfTextBuffer(response.data as ArrayBuffer);
};
