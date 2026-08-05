import type { FileMetadata } from '@/types';

export interface MemorialPropertyDataLike {
  id?: string;
  propertyId?: string;
  registrationNumber?: string;
  name?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  ownerName?: string;
  ownerDocument?: string;
  propertyType?: string;
}

export interface InteractiveLotMemorial {
  lotNumber: number;
  content: string;
}

export interface LotMemorialParts {
  header: string;
  body: string;
  conclusion: string;
}

const LEADING_MEMORIAL_HEADER_PATTERN =
  /^\s*(Memorial Descritivo\s*\n(?:Projeto:.*\n)?(?:Arquivo:.*\n)?(?:Data:.*\n)?(?:Metodo:.*\n?)?)/i;

const DEBUG_SELECTION_URL = 'http://127.0.0.1:7777/event';
const DEBUG_SELECTION_SESSION = 'cad-editor';
const DEBUG_SELECTION_ENABLED = false;

export const normalizeMemorialText = (content: string): string =>
  content
    .replace(/“|”/g, '')
    .replace(/"/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const extractLeadingMemorialHeader = (content: string): string => {
  const normalized = normalizeMemorialText(content);
  const match = normalized.match(LEADING_MEMORIAL_HEADER_PATTERN);
  return match?.[1]?.trim() || '';
};

const stripLeadingMemorialHeader = (content: string): string =>
  normalizeMemorialText(content)
    .replace(LEADING_MEMORIAL_HEADER_PATTERN, '')
    .trim();

export const resolveMemorialProjectName = (
  currentFile: FileMetadata,
  propertyData: MemorialPropertyDataLike | null
): string =>
  propertyData?.registrationNumber ||
  propertyData?.name ||
  currentFile.originalName.replace(/\.[^/.]+$/, '');

const buildFallbackMemorialHeader = (
  currentFile: FileMetadata,
  propertyData: MemorialPropertyDataLike | null
): string => {
  const projectName = resolveMemorialProjectName(currentFile, propertyData);
  return [
    'Memorial Descritivo',
    `Projeto: ${projectName}`,
    `Arquivo: ${currentFile.originalName}`,
    `Data: ${new Date().toLocaleDateString('pt-BR')}`
  ].join('\n');
};

const deduplicateFinalMemorialHeader = (content: string): string => {
  const normalized = normalizeMemorialText(content);
  const headerPattern =
    /(^|\n)(Memorial Descritivo\s*\n(?:Projeto:.*\n)?(?:Arquivo:.*\n)?(?:Data:.*\n)?(?:Metodo:.*(?:\n|$))?)/gi;
  const headers = Array.from(normalized.matchAll(headerPattern), (match) => match[2]?.trim()).filter(Boolean);

  if (headers.length <= 1) {
    return normalized
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const preferredHeader = headers[headers.length - 1];
  const contentWithoutHeaders = normalized
    .replace(headerPattern, (_, prefix) => prefix || '')
    .replace(/^\s+/, '');

  return [preferredHeader, contentWithoutHeaders]
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const splitLotMemorialParts = (content: string): LotMemorialParts => {
  const normalized = normalizeMemorialText(content);
  const header = extractLeadingMemorialHeader(normalized);
  const contentWithoutHeader = stripLeadingMemorialHeader(normalized);
  if (!contentWithoutHeader) {
    return { header, body: '', conclusion: '' };
  }

  const declarationMatch = contentWithoutHeader.match(
    /(?:\n_{5,}\n)?\s*DECLARAÇÃO(?: FINAL)?[\s\S]*$/i
  );

  if (!declarationMatch) {
    return { header, body: contentWithoutHeader, conclusion: '' };
  }

  const body = contentWithoutHeader.slice(0, declarationMatch.index).trim();
  const conclusion = declarationMatch[0]
    .replace(/^\n+/, '')
    .trim();

  return { header, body, conclusion };
};

export const extractMemorialTextFromResponse = (responseData: unknown): string => {
  if (typeof responseData === 'string') {
    return responseData;
  }

  if (typeof responseData !== 'object' || responseData === null) {
    return '';
  }

  const candidate = responseData as {
    memorialText?: unknown;
    memorial?: unknown;
    content?: unknown;
    text?: unknown;
  };

  for (const value of [candidate.memorialText, candidate.memorial, candidate.content, candidate.text]) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return '';
};

export const sanitizeLotBody = (content: string, lotNumber: number): string => {
  const normalized = normalizeMemorialText(content);
  if (!normalized) {
    return '';
  }

  const sameHeaderPattern = new RegExp(`(?:^|\\n)LOTE\\s+${lotNumber}(?:\\s*:|\\s*\\[[^\\]]+\\])`, 'gi');
  const matches = Array.from(normalized.matchAll(sameHeaderPattern));
  if (matches.length > 1) {
    const duplicateStart = matches[1].index ?? -1;
    if (duplicateStart > 0) {
      return normalized.slice(0, duplicateStart).trim();
    }
  }

  return normalized;
};

export const buildInteractiveMemorial = (
  lotMemorials: InteractiveLotMemorial[],
  currentFile: FileMetadata,
  propertyData: MemorialPropertyDataLike | null,
  conclusion: string,
  backendHeader: string
): string => {
  const uniqueMemorials = new Map<number, InteractiveLotMemorial>();
  for (const lot of lotMemorials) {
    uniqueMemorials.set(lot.lotNumber, lot);
  }

  const sortedMemorials = [...uniqueMemorials.values()].sort((left, right) => left.lotNumber - right.lotNumber);
  const memorialHeader = backendHeader || buildFallbackMemorialHeader(currentFile, propertyData);

  const sections: string[] = [memorialHeader];

  for (const lot of sortedMemorials) {
    sections.push(`================ LOTE ${lot.lotNumber} ================`);
    sections.push(lot.content);
  }

  if (conclusion) {
    sections.push(conclusion);
  }

  return deduplicateFinalMemorialHeader(sections.join('\n\n'));
};

export const isValidLotMemorial = (content: string, lotNumber: number): boolean => {
  const normalized = normalizeMemorialText(content);
  if (!normalized) {
    return false;
  }

  const lotHeader = new RegExp(`^LOTE\\s+${lotNumber}(?:\\s*:|\\s*\\[[^\\]]+\\])`, 'i');
  if (!lotHeader.test(normalized)) {
    return false;
  }

  if (normalized.length < 120) {
    return false;
  }

  return normalized.includes('AO NORTE:') || normalized.includes('AO SUL:');
};

export const ensureLotMemorialHeader = (content: string, lotNumber: number): string => {
  const normalized = normalizeMemorialText(content);
  if (!normalized) {
    return '';
  }

  const expectedHeader = `LOTE ${lotNumber}:`;
  const lotHeader = /^LOTE\s+\d+(?:\s*:|\s*\[[^\]]+\])/i;
  if (lotHeader.test(normalized)) {
    return normalized.replace(lotHeader, expectedHeader);
  }

  return `${expectedHeader}\n${normalized}`;
};

export const sendSelectionDebug = (
  hypothesisId: string,
  location: string,
  msg: string,
  data: Record<string, unknown>
) => {
  if (!DEBUG_SELECTION_ENABLED) {
    return;
  }
  fetch(DEBUG_SELECTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: DEBUG_SELECTION_SESSION,
      runId: 'pre-fix',
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now()
    })
  }).catch(() => {});
};

export const getFallbackPropertyId = (): string | null => {
  try {
    const properties = JSON.parse(localStorage.getItem('properties') || '[]') as MemorialPropertyDataLike[];
    if (properties.length > 0) {
      const lastProperty = properties[properties.length - 1];
      return lastProperty.propertyId || lastProperty.id || null;
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao ler fallback de propriedades do localStorage:', error);
    return null;
  }
};
