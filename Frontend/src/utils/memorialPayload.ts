import type { FileMetadata } from '@/types';
import type { DXFData } from '@/utils/dxfParser';
import {
  getFallbackPropertyId,
  resolveMemorialProjectName,
  type MemorialPropertyDataLike
} from '@/utils/memorialDocument';

export interface BaseMemorialRequest {
  propertyId?: string | null;
  [key: string]: unknown;
}

interface MemorialRequestBaseParams {
  currentFile: FileMetadata;
  propertyData: MemorialPropertyDataLike | null;
  activePropertyId?: string | null;
}

interface TechnicalSummaryRequestBaseParams extends MemorialRequestBaseParams {
  sourceDxfData?: DXFData | null;
}

export const serializeMemorialEntities = (sourceDxfData?: DXFData | null) =>
  (sourceDxfData?.entities || []).map((entity) => ({
    type: entity.type,
    layer: entity.layer,
    x: entity.properties?.x || entity.properties?.x1 || entity.properties?.centerX,
    y: entity.properties?.y || entity.properties?.y1 || entity.properties?.centerY,
    z: entity.properties?.z || entity.properties?.z1,
    x2: entity.properties?.x2,
    y2: entity.properties?.y2,
    z2: entity.properties?.z2,
    radius: entity.properties?.radius,
    startAngle: entity.properties?.startAngle,
    endAngle: entity.properties?.endAngle,
    text: entity.properties?.text,
    textStyle: entity.properties?.textStyle,
    textHeight: entity.properties?.textHeight,
    textRotation: entity.properties?.rotation,
    vertices: entity.properties?.vertices,
    properties: entity.properties
  }));

export const buildBaseMemorialRequest = (params: MemorialRequestBaseParams): BaseMemorialRequest => {
  const { currentFile, propertyData, activePropertyId } = params;
  const propertyId = activePropertyId || propertyData?.propertyId || propertyData?.id || getFallbackPropertyId();

  return {
    fileName: currentFile.originalName,
    projectName: resolveMemorialProjectName(currentFile, propertyData),
    projectDescription: propertyData
      ? `Memorial descritivo da propriedade ${propertyData.registrationNumber}`
      : `Analise tecnica do arquivo ${currentFile.originalName}`,
    propertyId,
    propertyData: propertyData ? {
      registrationNumber: propertyData.registrationNumber,
      name: propertyData.name,
      street: propertyData.street,
      number: propertyData.number || undefined,
      neighborhood: propertyData.neighborhood,
      city: propertyData.city,
      state: propertyData.state,
      ownerName: propertyData.ownerName,
      ownerDocument: propertyData.ownerDocument,
      propertyType: propertyData.propertyType
    } : null
  };
};

export const buildTechnicalSummaryRequest = (params: TechnicalSummaryRequestBaseParams): BaseMemorialRequest => {
  const { sourceDxfData, ...baseParams } = params;

  return {
    ...buildBaseMemorialRequest(baseParams),
    entities: serializeMemorialEntities(sourceDxfData)
  };
};
