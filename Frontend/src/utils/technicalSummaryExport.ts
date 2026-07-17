import { saveBlobWithPicker, saveTextWithPicker } from '@/utils/fileSave';

const loadJsPdf = async () => (await import('jspdf')).default;

const normalizeBaseName = (analyzedFile?: string) => (
  (analyzedFile || 'resumo_tecnico')
    .replace(/\.[^/.]+$/, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'resumo_tecnico'
);

const resolveTechnicalSummaryExportContent = (params: {
  summaryJson?: string;
  summaryText?: string;
}) => {
  // Se existir o texto legível humano, usa ele (preferência para o operador comum)
  if (typeof params.summaryText === 'string' && params.summaryText.trim() !== '') {
    return params.summaryText;
  }

  // Fallback para o JSON (apenas se não houver texto humano)
  const normalizedJson = typeof params.summaryJson === 'string' ? params.summaryJson.trim() : '';
  if (normalizedJson) {
    try {
      return JSON.stringify(JSON.parse(normalizedJson), null, 2);
    } catch {
      return normalizedJson;
    }
  }

  return '';
};

const buildTechnicalSummaryPdfBlob = async (summaryContent: string) => {
  const JsPdf = await loadJsPdf();
  const doc = new JsPdf();
  doc.setFontSize(14);
  doc.text('Resumo Técnico do Memorial', 20, 20);
  doc.setFontSize(10);
  let y = 35;
  for (const line of summaryContent.split('\n')) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    const wrapped = doc.splitTextToSize(line, 170);
    doc.text(wrapped, 20, y);
    y += wrapped.length * 5;
  }
  return doc.output('blob');
};

export const saveTechnicalSummaryPdf = async (params: {
  summaryJson?: string;
  summaryText?: string;
  analyzedFile?: string;
}) => {
  const summaryContent = resolveTechnicalSummaryExportContent(params);
  if (!summaryContent) {
    return false;
  }

  const baseName = normalizeBaseName(params.analyzedFile);
  const pdfBlob = await buildTechnicalSummaryPdfBlob(summaryContent);
  return saveBlobWithPicker({
    suggestedName: `resumo_tecnico_pdf_${baseName}.pdf`,
    blob: pdfBlob,
    pickerTypeDescription: 'Arquivo PDF',
    accept: {
      'application/pdf': ['.pdf']
    }
  });
};

export const saveTechnicalSummaryText = async (params: {
  summaryJson?: string;
  summaryText?: string;
  analyzedFile?: string;
}) => {
  const summaryContent = resolveTechnicalSummaryExportContent(params);
  if (!summaryContent) {
    return false;
  }

  const baseName = normalizeBaseName(params.analyzedFile);
  return saveTextWithPicker({
    suggestedName: `resumo_tecnico_texto_${baseName}.md`,
    contents: summaryContent.replace(/\r?\n/g, '\r\n'),
    contentType: 'text/markdown;charset=utf-8',
    pickerTypeDescription: 'Arquivo Markdown',
    accept: {
      'text/markdown': ['.md'],
      'text/plain': ['.txt']
    }
  });
};

export const saveTechnicalSummaryJson = async (params: {
  summaryJson: string;
  analyzedFile?: string;
}) => {
  if (!params.summaryJson) {
    return false;
  }

  const baseName = normalizeBaseName(params.analyzedFile);
  return saveTextWithPicker({
    suggestedName: `resumo_tecnico_dados_${baseName}.json`,
    contents: params.summaryJson,
    contentType: 'application/json;charset=utf-8',
    pickerTypeDescription: 'Arquivo JSON',
    accept: {
      'application/json': ['.json']
    }
  });
};
