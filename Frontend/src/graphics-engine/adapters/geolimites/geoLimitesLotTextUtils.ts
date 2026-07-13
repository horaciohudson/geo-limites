import { extractTextPosition, isTextLikeEntity } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import type { DXFData } from '@/graphics-engine/shared/dxf';
import { calculateDistance, type Point2D } from '@/graphics-engine/shared/geometry';

const LOT_NUMBER_PATTERN = /\blote\s*(?:n[.oº]*\s*)?0*(\d+)\b/i;
const LOT_WORD_PATTERN = /\blote\b/i;
const STANDALONE_NUMBER_PATTERN = /^0*(\d+)\s*$/;
const LOT_PAIR_MAX_DISTANCE = 24;

export interface GeoLimitesLotTextAnchor {
  lotNumber: number;
  position: Point2D;
  sourceText: string;
}

interface TextEntry {
  text: string;
  normalizedText: string;
  position: Point2D;
}

const normalizeText = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const parseLotNumber = (value: string): number | null => {
  const match = value.match(LOT_NUMBER_PATTERN);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseStandaloneNumber = (value: string): number | null => {
  const match = value.match(STANDALONE_NUMBER_PATTERN);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const extractGeoLimitesLotNumberFromText = (value: string): number | null => parseLotNumber(normalizeText(value));

export const extractGeoLimitesLotNumberFromTexts = (texts: string[]): number | null => {
  for (const text of texts) {
    const parsed = extractGeoLimitesLotNumberFromText(text);
    if (parsed !== null) {
      return parsed;
    }
  }

  const normalizedTexts = texts
    .map(normalizeText)
    .filter(Boolean);

  for (const normalizedText of normalizedTexts) {
    if (!LOT_WORD_PATTERN.test(normalizedText)) {
      continue;
    }

    for (const candidateText of normalizedTexts) {
      const candidateNumber = parseStandaloneNumber(candidateText);
      if (candidateNumber !== null) {
        return candidateNumber;
      }
    }
  }

  return null;
};

export const collectGeoLimitesLotTextAnchors = (dxfData: DXFData): GeoLimitesLotTextAnchor[] => {
  const textEntries: TextEntry[] = dxfData.entities
    .filter((entity) => isTextLikeEntity(entity))
    .map((entity) => {
      const position = extractTextPosition(entity);
      const text = String(entity.properties.text || '').trim();
      if (!position || !text) {
        return null;
      }

      return {
        text,
        normalizedText: normalizeText(text),
        position
      };
    })
    .filter((entry): entry is TextEntry => entry !== null);

  const anchorByLotNumber = new Map<number, GeoLimitesLotTextAnchor>();
  const registerAnchor = (anchor: GeoLimitesLotTextAnchor) => {
    if (!anchorByLotNumber.has(anchor.lotNumber)) {
      anchorByLotNumber.set(anchor.lotNumber, anchor);
    }
  };

  textEntries.forEach((entry) => {
    const lotNumber = parseLotNumber(entry.normalizedText);
    if (lotNumber === null) {
      return;
    }

    registerAnchor({
      lotNumber,
      position: entry.position,
      sourceText: entry.text
    });
  });

  const numericEntries = textEntries
    .map((entry) => ({
      entry,
      lotNumber: parseStandaloneNumber(entry.normalizedText)
    }))
    .filter((candidate): candidate is { entry: TextEntry; lotNumber: number } => candidate.lotNumber !== null);

  textEntries.forEach((entry) => {
    if (!LOT_WORD_PATTERN.test(entry.normalizedText)) {
      return;
    }

    const nearestNumeric = numericEntries
      .map((candidate) => ({
        ...candidate,
        distance: calculateDistance(entry.position, candidate.entry.position)
      }))
      .filter((candidate) => candidate.distance <= LOT_PAIR_MAX_DISTANCE)
      .sort((left, right) => left.distance - right.distance)[0];

    if (!nearestNumeric) {
      return;
    }

    registerAnchor({
      lotNumber: nearestNumeric.lotNumber,
      position: {
        x: (entry.position.x + nearestNumeric.entry.position.x) / 2,
        y: (entry.position.y + nearestNumeric.entry.position.y) / 2
      },
      sourceText: `${entry.text} ${nearestNumeric.entry.text}`.trim()
    });
  });

  return Array.from(anchorByLotNumber.values()).sort((left, right) => left.lotNumber - right.lotNumber);
};

export const selectPrimaryGeoLimitesLotTextAnchors = (
  anchors: GeoLimitesLotTextAnchor[]
): GeoLimitesLotTextAnchor[] => {
  if (anchors.length <= 1) {
    return anchors;
  }

  const sortedAnchors = [...anchors].sort((left, right) => left.lotNumber - right.lotNumber);
  const runs: GeoLimitesLotTextAnchor[][] = [];
  let currentRun: GeoLimitesLotTextAnchor[] = [];

  sortedAnchors.forEach((anchor) => {
    const lastAnchor = currentRun[currentRun.length - 1];
    if (!lastAnchor || anchor.lotNumber === lastAnchor.lotNumber + 1) {
      currentRun.push(anchor);
      return;
    }

    runs.push(currentRun);
    currentRun = [anchor];
  });

  if (currentRun.length > 0) {
    runs.push(currentRun);
  }

  return runs.sort((left, right) => {
    if (right.length !== left.length) {
      return right.length - left.length;
    }
    return left[0].lotNumber - right[0].lotNumber;
  })[0] ?? [];
};

export const collectPrimaryGeoLimitesLotTextAnchors = (dxfData: DXFData): GeoLimitesLotTextAnchor[] => (
  selectPrimaryGeoLimitesLotTextAnchors(collectGeoLimitesLotTextAnchors(dxfData))
);

export const inferPrimaryGeoLimitesLotCount = (dxfData: DXFData): number | null => {
  const primaryAnchors = collectPrimaryGeoLimitesLotTextAnchors(dxfData);
  return primaryAnchors.length > 0 ? primaryAnchors.length : null;
};
