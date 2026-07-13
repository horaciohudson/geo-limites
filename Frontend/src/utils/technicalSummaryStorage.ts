import {
  getPropertyScopedValue,
  removePropertyScopedValue,
  readJsonStorage,
  setPropertyScopedValue,
  writeJsonStorage
} from '@/utils/operationContext';
import type { ProcessingContextStatusDTO } from '@/utils/processingContextStatus';

export interface StoredTechnicalSummaryRecord {
  summaryJson: string;
  documentSummaryJson?: string;
  processingContextStatus?: ProcessingContextStatusDTO;
  summaryText: string;
  analyzedFile: string;
  generatedAt: string;
  source: 'viewer' | 'cad-editor';
  sourceFileId?: string;
}

export const TECHNICAL_SUMMARY_BY_PROPERTY_KEY = 'technicalSummaryByProperty';
export const LATEST_TECHNICAL_SUMMARY_KEY = 'latestTechnicalSummary';
export const SELECTED_TECHNICAL_SUMMARY_BY_PROPERTY_KEY = 'selectedTechnicalSummaryByProperty';
export const SELECTED_TECHNICAL_SUMMARY_KEY = 'selectedTechnicalSummary';
const CURRENT_TECHNICAL_SUMMARY_PREFIX = 'current:';

export interface AppliedTechnicalSummarySelection {
  kind: 'current' | 'example';
  fileId?: string | null;
  exampleId?: string | null;
  rawValue: string;
}

const mergeSummaryRecords = (
  primary: StoredTechnicalSummaryRecord,
  fallback: StoredTechnicalSummaryRecord
): StoredTechnicalSummaryRecord => ({
  source: primary.source,
  generatedAt: primary.generatedAt || fallback.generatedAt,
  analyzedFile: primary.analyzedFile || fallback.analyzedFile,
  sourceFileId: primary.sourceFileId || fallback.sourceFileId,
  summaryText: primary.summaryText.trim() || fallback.summaryText,
  summaryJson: primary.summaryJson.trim() || fallback.summaryJson,
  documentSummaryJson: primary.documentSummaryJson?.trim() || fallback.documentSummaryJson,
  processingContextStatus: primary.processingContextStatus || fallback.processingContextStatus
});

const resolvePreferredSummary = (
  currentValue: StoredTechnicalSummaryRecord | null,
  nextValue: StoredTechnicalSummaryRecord
): StoredTechnicalSummaryRecord => {
  if (!currentValue) {
    return nextValue;
  }

  if (currentValue.source === nextValue.source) {
    return mergeSummaryRecords(nextValue, currentValue);
  }

  if (currentValue.source === 'cad-editor') {
    return mergeSummaryRecords(currentValue, nextValue);
  }

  return mergeSummaryRecords(nextValue, currentValue);
};

export const getStoredTechnicalSummary = (propertyId?: string | null): StoredTechnicalSummaryRecord | null => {
  if (propertyId) {
    return getPropertyScopedValue<StoredTechnicalSummaryRecord>(TECHNICAL_SUMMARY_BY_PROPERTY_KEY, propertyId);
  }

  return readJsonStorage<StoredTechnicalSummaryRecord>(LATEST_TECHNICAL_SUMMARY_KEY);
};

export const setStoredTechnicalSummary = (
  value: StoredTechnicalSummaryRecord,
  propertyId?: string | null
) => {
  const currentValue = getStoredTechnicalSummary(propertyId);
  const nextValue = resolvePreferredSummary(currentValue, value);

  if (propertyId) {
    setPropertyScopedValue(TECHNICAL_SUMMARY_BY_PROPERTY_KEY, nextValue, propertyId);
  }
  writeJsonStorage(LATEST_TECHNICAL_SUMMARY_KEY, nextValue);
};

export const getAppliedTechnicalSummarySelection = (propertyId?: string | null): string | null => {
  if (propertyId) {
    return getPropertyScopedValue<string>(SELECTED_TECHNICAL_SUMMARY_BY_PROPERTY_KEY, propertyId);
  }

  return readJsonStorage<string>(SELECTED_TECHNICAL_SUMMARY_KEY);
};

export const buildCurrentTechnicalSummarySelectionValue = (fileId?: string | null): string => (
  fileId?.trim()
    ? `${CURRENT_TECHNICAL_SUMMARY_PREFIX}${fileId.trim()}`
    : 'current'
);

export const parseAppliedTechnicalSummarySelection = (
  value: string | null | undefined
): AppliedTechnicalSummarySelection | null => {
  if (!value?.trim()) {
    return null;
  }

  if (value === 'current') {
    return {
      kind: 'current',
      fileId: null,
      rawValue: value
    };
  }

  if (value.startsWith(CURRENT_TECHNICAL_SUMMARY_PREFIX)) {
    const fileId = value.slice(CURRENT_TECHNICAL_SUMMARY_PREFIX.length).trim();
    return {
      kind: 'current',
      fileId: fileId || null,
      rawValue: value
    };
  }

  if (value.startsWith('example:')) {
    const exampleId = value.slice('example:'.length).trim();
    return {
      kind: 'example',
      exampleId: exampleId || null,
      rawValue: value
    };
  }

  return null;
};

export const setAppliedTechnicalSummarySelection = (
  value: string | null,
  propertyId?: string | null
) => {
  if (!value) {
    clearAppliedTechnicalSummarySelection(propertyId);
    return;
  }

  if (propertyId) {
    setPropertyScopedValue(SELECTED_TECHNICAL_SUMMARY_BY_PROPERTY_KEY, value, propertyId);
    localStorage.removeItem(SELECTED_TECHNICAL_SUMMARY_KEY);
    return;
  }
  writeJsonStorage(SELECTED_TECHNICAL_SUMMARY_KEY, value);
};

export const clearAppliedTechnicalSummarySelection = (propertyId?: string | null) => {
  if (propertyId) {
    removePropertyScopedValue(SELECTED_TECHNICAL_SUMMARY_BY_PROPERTY_KEY, propertyId);
    return;
  }
  localStorage.removeItem(SELECTED_TECHNICAL_SUMMARY_KEY);
};
