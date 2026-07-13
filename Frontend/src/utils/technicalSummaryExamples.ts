export interface TechnicalSummaryExampleRecord {
  id: string;
  fileName: string;
  createdAt: string;
  mimeType: string;
  size: number;
  summaryJson: string;
  analyzedFile?: string;
  generatedAt?: string;
}

const DATABASE_NAME = 'geo-limites-documents';
const DATABASE_VERSION = 2;
const STORE_NAME = 'technicalSummaryExamples';

const openDatabase = async (): Promise<IDBDatabase> => (
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains(STORE_NAME)) {
        database.deleteObjectStore(STORE_NAME);
      }
      database.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir o banco local de resumos tecnicos.'));
  })
);

const withStore = async <T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
): Promise<T> => {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Falha ao acessar os resumos tecnicos base.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error('Operacao abortada ao acessar os resumos tecnicos base.'));
    };

    executor(store, resolve, reject);
  });
};

export const listTechnicalSummaryExamples = async (): Promise<TechnicalSummaryExampleRecord[]> => {
  const records = await withStore<TechnicalSummaryExampleRecord[]>('readonly', (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as TechnicalSummaryExampleRecord[]) || []);
    request.onerror = () => reject(request.error || new Error('Falha ao listar os resumos tecnicos base.'));
  });

  return records
    .filter((record) => typeof record.summaryJson === 'string' && record.summaryJson.trim().length > 0)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const saveTechnicalSummaryExample = async (file: File): Promise<TechnicalSummaryExampleRecord> => {
  const rawContents = await file.text();
  let normalizedJson = rawContents.trim();
  let analyzedFile: string | undefined;
  let generatedAt: string | undefined;

  try {
    const parsed = JSON.parse(rawContents) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('O JSON do resumo tecnico deve conter um objeto valido.');
    }

    normalizedJson = JSON.stringify(parsed, null, 2);
    analyzedFile = typeof (parsed as { analyzedFile?: unknown }).analyzedFile === 'string'
      ? (parsed as { analyzedFile: string }).analyzedFile
      : undefined;
    generatedAt = typeof (parsed as { generatedAt?: unknown }).generatedAt === 'string'
      ? (parsed as { generatedAt: string }).generatedAt
      : undefined;
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : 'Falha ao interpretar o JSON do resumo tecnico base.'
    );
  }

  const record: TechnicalSummaryExampleRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    fileName: file.name,
    createdAt: new Date().toISOString(),
    mimeType: file.type || 'application/json',
    size: file.size,
    summaryJson: normalizedJson,
    analyzedFile,
    generatedAt
  };

  await withStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Falha ao salvar o JSON do resumo tecnico base.'));
  });

  return record;
};

export const getTechnicalSummaryExampleJson = async (id: string): Promise<string | null> => {
  const record = await withStore<TechnicalSummaryExampleRecord | null>('readonly', (store, resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as TechnicalSummaryExampleRecord | undefined) || null);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir o JSON do resumo tecnico base.'));
  });

  return record?.summaryJson || null;
};

export const deleteTechnicalSummaryExample = async (id: string): Promise<void> => {
  await withStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Falha ao excluir o resumo tecnico base.'));
  });
};
