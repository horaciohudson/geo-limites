export const ACTIVE_PROPERTY_CHANGED_EVENT = 'operation-active-property-changed';
export const SELECTED_PROPERTY_STORAGE_KEY = 'selectedPropertyForMemorial';
export const SELECTED_FILES_STORAGE_KEY = 'selectedFiles';
export const SELECTED_FILES_BY_PROPERTY_STORAGE_KEY = 'selectedFilesByProperty';
export const SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY = 'selectedMemorialNormsByProperty';
export const SELECTED_TEMPLATE_BY_PROPERTY_KEY = 'selectedTemplateByProperty';
export const MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY = 'memorialSelectionDraftByProperty';

export interface OperationPropertySelection {
  id?: string;
  propertyId?: string;
  name?: string;
  registrationNumber?: string;
}

export const readJsonStorage = <T,>(storageKey: string): T | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
};

export const writeJsonStorage = <T,>(storageKey: string, value: T) => {
  localStorage.setItem(storageKey, JSON.stringify(value));
};

export const getSelectedOperationProperty = <T extends OperationPropertySelection = OperationPropertySelection>(): T | null =>
  readJsonStorage<T>(SELECTED_PROPERTY_STORAGE_KEY);

export const notifyActivePropertyChanged = () => {
  window.dispatchEvent(new Event(ACTIVE_PROPERTY_CHANGED_EVENT));
};

export const setSelectedOperationProperty = <T extends OperationPropertySelection>(property: T) => {
  writeJsonStorage(SELECTED_PROPERTY_STORAGE_KEY, property);
  notifyActivePropertyChanged();
};

export const clearSelectedOperationProperty = () => {
  localStorage.removeItem(SELECTED_PROPERTY_STORAGE_KEY);
  notifyActivePropertyChanged();
};

export const getActivePropertyId = (): string | null => {
  const property = getSelectedOperationProperty();
  return property?.propertyId || property?.id || null;
};

export const getActivePropertyLabel = (): string => {
  const property = getSelectedOperationProperty();
  return property?.registrationNumber || property?.name || '';
};

export const readScopedStorageMap = <T,>(storageKey: string): Record<string, T> =>
  readJsonStorage<Record<string, T>>(storageKey) || {};

export const writeScopedStorageMap = <T,>(storageKey: string, value: Record<string, T>) => {
  writeJsonStorage(storageKey, value);
};

export const getPropertyScopedValue = <T,>(storageKey: string, propertyId?: string | null): T | null => {
  const effectivePropertyId = propertyId || getActivePropertyId();
  if (!effectivePropertyId) {
    return null;
  }

  const scopedMap = readScopedStorageMap<T>(storageKey);
  return scopedMap[effectivePropertyId] ?? null;
};

export const setPropertyScopedValue = <T,>(storageKey: string, value: T, propertyId?: string | null) => {
  const effectivePropertyId = propertyId || getActivePropertyId();
  if (!effectivePropertyId) {
    return;
  }

  const scopedMap = readScopedStorageMap<T>(storageKey);
  scopedMap[effectivePropertyId] = value;
  writeScopedStorageMap(storageKey, scopedMap);
};

export const removePropertyScopedValue = (storageKey: string, propertyId?: string | null) => {
  const effectivePropertyId = propertyId || getActivePropertyId();
  if (!effectivePropertyId) {
    return;
  }

  const scopedMap = readScopedStorageMap<Record<string, unknown>>(storageKey);
  delete scopedMap[effectivePropertyId];
  writeScopedStorageMap(storageKey, scopedMap);
};
