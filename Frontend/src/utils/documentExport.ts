import api from '@/services/api';
import type { FileMetadata } from '@/types';

type GeneratedDocumentKind = 'memorial' | 'resumo-tecnico';

const loadJsPdf = async () => (await import('jspdf')).default;

export const downloadTechnicalFile = async (currentFile: FileMetadata) => {
  const response = await api.get(`/dxf/${currentFile.id}/download`, {
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', currentFile.originalName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportGeneratedDocumentPdf = async (params: {
  content: string;
  currentFile: FileMetadata;
  generatedDocumentKind: GeneratedDocumentKind;
}) => {
  const { content, currentFile, generatedDocumentKind } = params;
  if (!content) {
    return;
  }

  const JsPdf = await loadJsPdf();
  const doc = new JsPdf();
  const documentTitle = generatedDocumentKind === 'resumo-tecnico'
    ? 'Resumo Tecnico do Memorial'
    : 'Memorial Descritivo';
  const hasDocumentHeader = generatedDocumentKind === 'resumo-tecnico'
    ? /^\s*Resumo Tecnico do Memorial\b/i.test(content)
    : /^\s*Memorial Descritivo\b/i.test(content);
  let yPosition = 20;

  if (!hasDocumentHeader) {
    doc.setFontSize(16);
    doc.text(documentTitle, 20, 20);
    doc.setFontSize(12);
    doc.text(`Projeto: ${currentFile.originalName.replace(/\.[^/.]+$/, '')}`, 20, 40);
    doc.text(`Arquivo: ${currentFile.originalName}`, 20, 50);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 60);
    doc.line(20, 70, 190, 70);
    yPosition = 80;
  }

  doc.setFontSize(10);
  const lines = content.split('\n');

  lines.forEach((line) => {
    if (yPosition > 280) {
      doc.addPage();
      yPosition = 20;
    }
    const splitLines = doc.splitTextToSize(line, 170);
    doc.text(splitLines, 20, yPosition);
    yPosition += splitLines.length * 5;
  });

  const filePrefix = generatedDocumentKind === 'resumo-tecnico' ? 'resumo_tecnico_memorial' : 'memorial';
  doc.save(`${filePrefix}_${currentFile.originalName.replace(/\.[^/.]+$/, '')}.pdf`);
};

export const copyGeneratedDocumentText = async (content: string) => {
  if (!content) {
    return;
  }

  await navigator.clipboard.writeText(content);
};
