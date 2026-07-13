// ⚠️⚠️⚠️ ATENÇÃO: ESTE ARQUIVO NÃO É USADO PARA GERAÇÃO DE MEMORIAL! ⚠️⚠️⚠️
// 
// 🎯 O fluxo de geração de memorial acontece em: Frontend/src/pages/Viewer.tsx
// 
// ❌ Report.tsx NÃO é usado no fluxo atual de memorial
// ✅ Viewer.tsx é o arquivo CORRETO onde as entidades DXF são mapeadas e enviadas ao backend
// 
// ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️

import React, { useState, useEffect } from 'react';
import type { FileMetadata } from '../types/index';
import type { MemorialStandard } from '@/types/memorial-standard';
import api from '@/services/api';
import Button from '@/components/Button';
import Loading from '@/components/Loading';
import { MemorialNormsSelector } from '@/components/MemorialNormsSelector';
import { TemplateSelector } from '@/components/TemplateSelector';
import { useOperationContext } from '@/contexts/OperationContext';

const loadJsPdf = async () => (await import('jspdf')).default;

interface SelectedTemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea';
}

interface SelectedTemplateData {
  title: string;
  fields: SelectedTemplateField[];
  originalData?: unknown;
}

interface ApiErrorLike {
  message?: string;
  code?: string;
  config?: {
    url?: string;
  };
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

interface StoredPropertySelection {
  id?: string;
  propertyId?: string;
}

const getFallbackPropertyId = (): string | null => {
  try {
    const properties = JSON.parse(localStorage.getItem('properties') || '[]') as StoredPropertySelection[];
    if (properties.length > 0) {
      const lastProperty = properties[properties.length - 1];
      return lastProperty.propertyId || lastProperty.id || null;
    }

    return null;
  } catch (e) {
    console.error('❌ Erro ao ler propriedade do localStorage:', e);
    return null;
  }
};

const Report: React.FC = () => {
  const { selectedProperty, activePropertyId } = useOperationContext();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [memorial, setMemorial] = useState('');
  const [isLoading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [error, setError] = useState('');
  const [, setSelectedNorms] = useState<MemorialStandard[]>([]);
  const [, setSelectedTemplate] = useState<SelectedTemplateData | null>(null);
  const [, setSelectedTemplateId] = useState<string>('');

  const resolvedPropertyId =
    activePropertyId ||
    selectedProperty?.propertyId ||
    selectedProperty?.id ||
    getFallbackPropertyId();

  useEffect(() => {
    loadFiles();
  }, [resolvedPropertyId]);

  const loadFiles = async () => {
    try {
      setIsLoadingFiles(true);
      const response = await api.get<FileMetadata[]>('/dxf/my-files', {
        params: resolvedPropertyId ? { propertyId: resolvedPropertyId } : undefined
      });
      setFiles(response.data);
    } catch (err: unknown) {
      const apiError = err as ApiErrorLike;
      console.error('❌ Erro ao carregar arquivos:', err);

      // Para desenvolvimento, iniciar com lista vazia se backend não disponível
      if (apiError.response?.status === 403 || apiError.response?.status === 404) {
        setFiles([]);
        setError('');
      } else {
        setError('Erro ao carregar lista de arquivos');
      }
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const downloadMemorial = async () => {
    if (!memorial) return;

    const selectedFile = files.find(f => f.id === selectedFileId);
    if (!selectedFile) return;

    const JsPdf = await loadJsPdf();
    const doc = new JsPdf();
    const hasDocumentHeader = /^\s*Memorial Descritivo\b/i.test(memorial);
    let yPosition = 20;

    if (!hasDocumentHeader) {
      doc.setFontSize(16);
      doc.text('Memorial Descritivo', 20, 20);
      doc.setFontSize(12);
      doc.text(
        `Projeto: ${projectName || selectedFile.originalName.replace(/\.[^/.]+$/, '')}`,
        20,
        40
      );
      doc.text(`Arquivo: ${selectedFile.originalName}`, 20, 50);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 60);

      if (projectDescription) {
        doc.text(`Descrição: ${projectDescription}`, 20, 70);
      }

      doc.line(20, 80, 190, 80);
      yPosition = 90;
    }

    doc.setFontSize(10);
    const lines = memorial.split('\n');

    lines.forEach(line => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }

      const splitLines = doc.splitTextToSize(line, 170);
      doc.text(splitLines, 20, yPosition);
      yPosition += splitLines.length * 5;
    });

    doc.save(
      `memorial_${projectName || selectedFile.originalName.replace(/\.[^/.]+$/, '')}.pdf`
    );
  };

  const copyToClipboard = async () => {
    if (!memorial) return;
    try {
      await navigator.clipboard.writeText(memorial);
      alert('Memorial copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar para clipboard:', err);
    }
  };

  const clearForm = () => {
    setSelectedFileId('');
    setProjectName('');
    setProjectDescription('');
    setMemorial('');
    setError('');
    setSelectedNorms([]);
    setSelectedTemplate(null);
    setSelectedTemplateId('');
  };

  if (isLoadingFiles) {
    return (
      <div className="report-page">
        <Loading size="large" text="Carregando arquivos..." />
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="report-header">
        <h1>Gerar Memorial Descritivo</h1>
        <p>
          Selecione um arquivo DXF/DWG e forneça informações do projeto para gerar
          automaticamente um memorial descritivo.
        </p>
      </div>

      <div className="report-form">
        <div className="form-section">
          <h2>Informações do Projeto</h2>

          <div className="form-group">
            <label htmlFor="file-select">Arquivo DXF/DWG:</label>
            <select
              id="file-select"
              value={selectedFileId}
              onChange={e => setSelectedFileId(e.target.value)}
              className="file-select"
              disabled={isLoading}
            >
              <option value="">Selecione um arquivo...</option>
              {files.map(file => (
                <option key={file.id} value={file.id}>
                  {file.originalName} ({file.extension?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="project-name">Nome do Projeto:</label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Nome do projeto"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-description">Descrição do Projeto (opcional):</label>
            <textarea
              id="project-description"
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
              placeholder="Descrição adicional do projeto..."
              className="project-description"
              rows={4}
              disabled={isLoading}
            />
          </div>

          {/* Seção de Normas ABNT */}
          <div className="form-group">
            <h3>📋 Normas ABNT</h3>
            <MemorialNormsSelector
              onSelectedNormsChange={(norms) => {
                setSelectedNorms(norms);
              }}
            />
          </div>

          {/* Seção de Templates */}
          <div className="form-group">
            <h3>📄 Template do Relatório</h3>
            <TemplateSelector
              onTemplateSelect={(templateId, template) => {
                setSelectedTemplateId(templateId);
                setSelectedTemplate(template);
              }}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <Button onClick={clearForm} variant="secondary" disabled={isLoading}>
              Limpar
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="generating-section">
            <Loading size="large" text="Gerando memorial descritivo..." />
            <p>Este processo pode levar alguns minutos...</p>
          </div>
        )}

        {memorial && (
          <div className="memorial-section">
            <div className="memorial-header">
              <h2>Memorial Descritivo Gerado</h2>
              <div className="memorial-actions">
                <Button onClick={copyToClipboard} variant="secondary">
                  Copiar
                </Button>
                <Button onClick={downloadMemorial}>Download</Button>
              </div>
            </div>

            <div className="memorial-content">
              <pre>{memorial}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
