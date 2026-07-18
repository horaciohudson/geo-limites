const countEntityOccurrences = (content: string, entityType: string): number => {
  const pattern = new RegExp(`^\\s*${entityType}\\s*$`, 'gm');
  return Array.from(content.matchAll(pattern)).length;
};

export type DxfImportDiagnostics = {
  fileSizeBytes: number;
  insertCount: number;
  dimensionCount: number;
  hatchCount: number;
  unsupportedComplexEntityCount: number;
  isLargeFile: boolean;
  hasHeavyEntityLoad: boolean;
};

export const analyzeDxfImportComplexity = (content: string, fileSizeBytes: number): DxfImportDiagnostics => {
  const insertCount = countEntityOccurrences(content, 'INSERT');
  const dimensionCount = countEntityOccurrences(content, 'DIMENSION');
  const hatchCount = countEntityOccurrences(content, 'HATCH');
  const unsupportedComplexEntityCount = (
    countEntityOccurrences(content, 'SPLINE')
    + countEntityOccurrences(content, 'ELLIPSE')
    + countEntityOccurrences(content, 'LEADER')
    + countEntityOccurrences(content, 'MLINE')
  );

  return {
    fileSizeBytes,
    insertCount,
    dimensionCount,
    hatchCount,
    unsupportedComplexEntityCount,
    isLargeFile: fileSizeBytes >= 4 * 1024 * 1024,
    hasHeavyEntityLoad: insertCount >= 1000 || dimensionCount >= 100 || hatchCount >= 25
  };
};

export const buildDxfImportNotice = (
  fileName: string,
  diagnostics: DxfImportDiagnostics
): string => {
  const issues: string[] = [];

  if (diagnostics.isLargeFile) {
    issues.push(`DXF grande (${(diagnostics.fileSizeBytes / 1024 / 1024).toFixed(1)} MB)`);
  }
  if (diagnostics.insertCount > 0) {
    issues.push(`${diagnostics.insertCount} INSERT`);
  }
  if (diagnostics.dimensionCount > 0) {
    issues.push(`${diagnostics.dimensionCount} DIMENSION`);
  }
  if (diagnostics.hatchCount > 0) {
    issues.push(`${diagnostics.hatchCount} HATCH`);
  }
  if (diagnostics.unsupportedComplexEntityCount > 0) {
    issues.push(`${diagnostics.unsupportedComplexEntityCount} entidades complexas fora do suporte principal`);
  }

  if (issues.length === 0) {
    return `Arquivo aberto no editor: ${fileName}.`;
  }

  return `Arquivo aberto no editor: ${fileName}. Diagnostico de importacao: ${issues.join(' | ')}.`;
};
