import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ViewerDXF, Loading, ErrorBoundary } from '@/components';
import { useSidebarActions } from '@/App';
import { useFileContext } from '@/contexts/FileContext';
import api from '@/services/api';
import aiService from '@/services/aiService';
import type { AsyncPropertyData } from '@/services/polling-memorial';
import type { FileMetadata } from '@/types';
import type { DXFData } from '@/utils/dxfParser';
import jsPDF from 'jspdf';

interface StoredPropertySelection extends AsyncPropertyData {
  id?: string;
  propertyId?: string;
}

interface ErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const errorLike = error as ErrorLike;
    return errorLike.response?.data?.message || errorLike.message || fallback;
  }

  return fallback;
};

// Função para obter propertyId selecionado do localStorage
function getSelectedPropertyId(): string | null {
  try {
    // Tenta buscar propriedade selecionada no localStorage
    const selectedProperty = JSON.parse(localStorage.getItem('selectedPropertyForMemorial') || 'null') as StoredPropertySelection | null;

    if (selectedProperty) {
      // Tentar diferentes campos para o ID
      const propertyId = selectedProperty.propertyId || selectedProperty.id;
      if (propertyId) {
                        return propertyId;
      }
    }

    // Fallback: tentar buscar da última propriedade criada
    const properties = JSON.parse(localStorage.getItem('properties') || '[]') as StoredPropertySelection[];
    if (properties.length > 0) {
      const lastProperty = properties[properties.length - 1];
      const fallbackId = lastProperty.propertyId || lastProperty.id;
      if (fallbackId) {
                return fallbackId;
      }
    }

    return null;
  } catch (e) {
    console.error('❌ Erro ao ler propriedade do localStorage:', e);
    return null;
  }
}

const Viewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId');
  const fileIds = searchParams.get('fileIds');
  const shouldGenerateMemorial = searchParams.get('generateMemorial') === 'true';

  const { setViewerActions } = useSidebarActions();
  const { selectedFiles } = useFileContext();

  const [file, setFile] = useState<FileMetadata | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dxfData, setDxfData] = useState<DXFData | null>(null);
  const [memorial, setMemorial] = useState('');
  const [isGeneratingMemorial, setIsGeneratingMemorial] = useState(false);
  const [memorialError, setMemorialError] = useState('');

  // Timer para geração do memorial
  const [memorialStartTime, setMemorialStartTime] = useState<number | null>(null);
  const [memorialTimeElapsed, setMemorialTimeElapsed] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [memorialCurrentStep, setMemorialCurrentStep] = useState('');
  const [timerInterval, setTimerInterval] = useState<number | null>(null);

  // Carregar metadados do arquivo ou arquivos com tratamento robusto
  useEffect(() => {
    const loadFiles = async () => {
      if (!fileId && !fileIds) {
        setError('Nenhum arquivo especificado');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        // Verificar se há IDs duplicados no FileContext
        // Verificar localStorage também
        const localStorageFiles = localStorage.getItem('selectedFiles');
        if (localStorageFiles) {
          try {
            const parsedLocalFiles = JSON.parse(localStorageFiles) as FileMetadata[];

            // Verificar se há IDs duplicados no localStorage
            const allIds = parsedLocalFiles.map((f) => f.id);
            const uniqueIds = [...new Set(allIds)];
            if (allIds.length !== uniqueIds.length) {
              const uniqueFiles = parsedLocalFiles.filter((file, index: number, self) =>
                index === self.findIndex(f => f.id === file.id)
              );

              localStorage.setItem('selectedFiles', JSON.stringify(uniqueFiles));
            }
          } catch (e) {
            console.error('❌ Erro ao parsear localStorage:', e);
          }
        }

        if (fileIds) {
          // Múltiplos arquivos
          const ids = fileIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
          const uniqueUrlIds = [...new Set(ids)];

          const finalIds = uniqueUrlIds;

          const contextFiles = selectedFiles.filter(f => finalIds.includes(f.id));
          const uniqueContextFiles = contextFiles.filter((file, index, self) =>
            index === self.findIndex(f => f.id === file.id)
          );

          if (uniqueContextFiles.length > 0) {
            setFiles(uniqueContextFiles);
            setFile(uniqueContextFiles[0]);
            setCurrentFileIndex(0);
            setIsLoading(false);
            return;
          }

          const filePromises = finalIds.map(id => api.get(`/dxf/${id}`));
          const responses = await Promise.all(filePromises);
          const loadedFiles = responses.map(response => response.data);
          setFiles(loadedFiles);
          setFile(loadedFiles[0]);
          setCurrentFileIndex(0);
        } else if (fileId) {
          // Arquivo único
          const contextFile = selectedFiles.find(f => f.id === fileId);
          if (contextFile) {
            setFile(contextFile);
            setFiles([contextFile]);
            setIsLoading(false);
            return;
          }

          const response = await api.get(`/dxf/${fileId}`);
          setFile(response.data);
          setFiles([response.data]);
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar arquivo:', err);
        setError(getErrorMessage(err, 'Erro ao carregar arquivo'));
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [fileId, fileIds, selectedFiles]); // Adicionado selectedFiles como dependência

  // Verificar se deve gerar memorial automaticamente
  useEffect(() => {
    if (shouldGenerateMemorial && file && dxfData && !isGeneratingMemorial) {
      generateMemorial();
    }
  }, [shouldGenerateMemorial, file, dxfData]); // Removida dependência isGeneratingMemorial para evitar loop

  // Configurar ações do sidebar
  useEffect(() => {
    if (file) {
      setViewerActions({
        onDownload: downloadFile,
        onGenerateMemorial: generateMemorial,
        onDownloadMemorial: downloadMemorial,
        onBack: () => window.history.back(),
        isGeneratingMemorial,
        hasMemorial: !!memorial,
        hasDxfData: !!dxfData,
        currentFileId: file.id
      });
    }

    return () => {
      setViewerActions(null);
    };
  }, [file, isGeneratingMemorial, memorial, dxfData]); // Dependências específicas

  // Timer para geração do memorial com suporte a particionamento
  useEffect(() => {
    if (isGeneratingMemorial && memorialStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - memorialStartTime) / 1000);
        setMemorialTimeElapsed(elapsed);

        // PROGRESSO INTELIGENTE baseado no particionamento real do backend
        let progress = 0;
        let currentStep = '';

        if (elapsed < 5) {
          // Fase inicial: Processamento DXF
          progress = Math.min(10, elapsed * 2);
          currentStep = 'Processando dados DXF...';
        } else if (elapsed < 15) {
          // Chunk 1/3: Lotes 1-10 (9 segundos esperados)
          const chunkProgress = Math.min(30, ((elapsed - 5) / 10) * 30);
          progress = 10 + chunkProgress;
          currentStep = 'Consolidando etapa 1/3: lotes 1-10...';
        } else if (elapsed < 27) {
          // Chunk 2/3: Lotes 11-20 (10 segundos esperados)
          const chunkProgress = Math.min(30, ((elapsed - 15) / 12) * 30);
          progress = 40 + chunkProgress;
          currentStep = 'Consolidando etapa 2/3: lotes 11-20...';
        } else if (elapsed < 35) {
          // Chunk 3/3: Lotes 21-25 (5 segundos esperados)
          const chunkProgress = Math.min(25, ((elapsed - 27) / 8) * 25);
          progress = 70 + chunkProgress;
          currentStep = 'Consolidando etapa 3/3: lotes 21-25...';
        } else {
          // Finalização
          progress = Math.min(98, 95 + ((elapsed - 35) / 5) * 3);
          currentStep = 'Finalizando memorial...';
        }

        setGenerationProgress(Math.round(progress));
        setMemorialCurrentStep(currentStep);

      }, 1000);

      setTimerInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [isGeneratingMemorial, memorialStartTime]);

  const downloadFile = async () => {
    const currentFile = files[currentFileIndex] || file;
    const currentFileId = currentFile?.id;

    if (!currentFileId || !currentFile) return;
    try {
      const response = await api.get(`/dxf/${currentFileId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', currentFile.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err);
    }
  };

  const handleDXFDataLoaded = (data: DXFData) => {
    setDxfData(data);
  };

  const generateMemorial = async () => {
    const currentFile = files[currentFileIndex] || file;
    const currentFileId = currentFile?.id;

    if (!currentFileId || !currentFile || !dxfData) {
      setMemorialError('Dados do arquivo não disponíveis');
      return;
    }

    try {
      setIsGeneratingMemorial(true);
      setMemorialError('');
      setMemorial('');

      // Iniciar timer
      const startTime = Date.now();
      setMemorialStartTime(startTime);
      setMemorialTimeElapsed(0);
      setGenerationProgress(0);
      setMemorialCurrentStep('Iniciando geração...');

      // Carregar norma do localStorage
      let standardId = null;
      const savedNorms = localStorage.getItem('selectedMemorialNorms');
      if (savedNorms) {
        try {
          const parsedNorms = JSON.parse(savedNorms);
          if (parsedNorms && parsedNorms.length > 0) {
            standardId = parsedNorms[0].id;
          }
        } catch (error) {
          console.error('❌ Erro ao parsear normas do localStorage no Viewer:', error);
        }
      }

      if (!standardId) {
        setMemorialError('❌ ERRO: Nenhuma norma selecionada! Vá em "Gerenciar Normas" e selecione uma norma antes de gerar o memorial.');
        return;
      }

      // Carregar dados da propriedade do localStorage
      let propertyData: StoredPropertySelection | null = null;
      const savedProperty = localStorage.getItem('selectedPropertyForMemorial');
      if (savedProperty) {
        try {
          propertyData = JSON.parse(savedProperty) as StoredPropertySelection;
        } catch (error) {
          console.error('❌ Erro ao parsear propriedade do localStorage no Viewer:', error);
        }
      }

      const memorialRequest = {
        entities: (dxfData.entities || []).map(entity => {
          return {
            type: entity.type,
            layer: entity.layer,
            // Extrair coordenadas de properties para campos diretos
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
            // ⚡ CRÍTICO: Extrair vertices para campo direto (requerido pelo backend DTO)
            vertices: entity.properties?.vertices,
            // Manter properties para compatibilidade
            properties: entity.properties
          };
        }),
        fileName: currentFile.originalName,
        projectName: propertyData?.name || currentFile.originalName.replace(/\.[^/.]+$/, ''),
        projectDescription: propertyData ?
          `Memorial descritivo da propriedade ${propertyData.registrationNumber}` :
          `Análise técnica do arquivo ${currentFile.originalName}`,
        standardId,
        propertyId: getSelectedPropertyId(),
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

      if (!memorialRequest.propertyId) {
        console.error('❌ CRÍTICO: PropertyId está null/undefined no momento do envio!');
        const fallbackPropertyId = getSelectedPropertyId();
        if (fallbackPropertyId) {
          memorialRequest.propertyId = fallbackPropertyId;
        } else {
          console.error('❌ Não foi possível obter propertyId válido');
        }
      }

      // Usar aiService para obter endpoint correto
      const aiConfig = aiService.getAIConfig();
      const endpoint = aiConfig.endpoint;

      const memorialRequestWithAI = {
        ...memorialRequest,
        ...aiService.getAIParameters()
      };

      const response = await api.post(endpoint, memorialRequestWithAI);
      setMemorial(response.data.memorialText || 'Memorial gerado com sucesso, mas sem detalhes técnicos.');

      // Finalizar timer
      setGenerationProgress(100);
      setMemorialCurrentStep('Memorial gerado com sucesso!');

      } catch (err: unknown) {
      console.error('Erro ao gerar memorial:', err);
      setMemorialError(getErrorMessage(err, 'Erro ao gerar memorial descritivo'));

      // Parar timer em caso de erro
      setMemorialCurrentStep('Erro na geração');
    } finally {
      setIsGeneratingMemorial(false);

      // Limpar timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      setMemorialStartTime(null);
    }
  };

  const downloadMemorial = () => {
    const currentFile = files[currentFileIndex] || file;
    if (!memorial || !currentFile) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Memorial Descritivo', 20, 20);
    doc.setFontSize(12);
    doc.text(`Projeto: ${currentFile.originalName.replace(/\.[^/.]+$/, '')}`, 20, 40);
    doc.text(`Arquivo: ${currentFile.originalName}`, 20, 50);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 60);
    doc.line(20, 70, 190, 70);

    doc.setFontSize(10);
    const lines = memorial.split('\n');
    let yPosition = 80;

    lines.forEach((line) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      const splitLines = doc.splitTextToSize(line, 170);
      doc.text(splitLines, 20, yPosition);
      yPosition += splitLines.length * 5;
    });

    doc.save(`memorial_${currentFile.originalName.replace(/\.[^/.]+$/, '')}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="viewer-page">
        <Loading size="large" text="Carregando arquivo..." />
      </div>
    );
  }

  if (error || (!fileId && !fileIds)) {
    return (
      <div className="viewer-page">
        <div className="viewer-error">
          <h2>Erro</h2>
          <p>{error || 'Arquivo não encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="viewer-page">
        <div className="viewer-error">
          <h2>🚨 Erro no Visualizador</h2>
          <p>Ocorreu um erro ao carregar o visualizador de arquivos.</p>
          <button onClick={() => window.location.reload()}>🔄 Recarregar</button>
        </div>
      </div>
    }>
      <div className="viewer-page">


        {/* Timer Visual do Memorial - MODAL EM TELA CHEIA */}
        {isGeneratingMemorial && (
          <div className="memorial-timer-overlay" style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(5px)'
          }}>
            <div className="memorial-timer-modal" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '40px',
              borderRadius: '20px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxWidth: '500px',
              width: '90%',
              animation: 'modalSlideIn 0.3s ease-out'
            }}>
              <div style={{ fontSize: '1.6rem', marginBottom: '20px', fontWeight: '700', letterSpacing: '0.12em' }}>GEO</div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '10px', fontWeight: '700' }}>
                Gerando Memorial Descritivo
              </h2>
              <p style={{ fontSize: '1.1rem', opacity: '0.9', marginBottom: '30px' }}>
                Processando arquivo DXF e organizando dados tecnicos...
              </p>

              {/* Timer Grande e Visível */}
              <div className="timer-display-large" style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '20px',
                borderRadius: '15px',
                marginBottom: '25px',
                border: '2px solid rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: '0.8', marginBottom: '10px' }}>
                  ⏱️ TEMPO DECORRIDO
                </div>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  color: '#FFD700',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  {Math.floor(memorialTimeElapsed / 60)}:{(memorialTimeElapsed % 60).toString().padStart(2, '0')}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: '0.7' }}>
                  minutos:segundos
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="progress-container" style={{ marginBottom: '25px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <span style={{ fontSize: '1rem', fontWeight: '600' }}>Progresso</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{generationProgress}%</span>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  height: '12px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                    height: '100%',
                    width: `${generationProgress}%`,
                    borderRadius: '6px',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
              </div>

              {/* Status Atual */}
              <div className="status-display" style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '25px'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: '0.8', marginBottom: '5px' }}>
                  🔄 STATUS ATUAL
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '10px' }}>
                  {memorialCurrentStep || 'Processando...'}
                </div>
                
                {/* Indicador Visual de Chunks */}
                {memorialCurrentStep.includes('etapa') && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                    <div style={{
                      width: '30px',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: memorialCurrentStep.includes('1/3') ? '#FFD700' : 
                                     generationProgress > 40 ? '#4CAF50' : 'rgba(255,255,255,0.3)'
                    }}></div>
                    <div style={{
                      width: '30px',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: memorialCurrentStep.includes('2/3') ? '#FFD700' : 
                                     generationProgress > 70 ? '#4CAF50' : 'rgba(255,255,255,0.3)'
                    }}></div>
                    <div style={{
                      width: '30px',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: memorialCurrentStep.includes('3/3') ? '#FFD700' : 
                                     generationProgress > 95 ? '#4CAF50' : 'rgba(255,255,255,0.3)'
                    }}></div>
                  </div>
                )}
              </div>

              {/* Informações do Processo */}
              <div className="process-info" style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '15px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                textAlign: 'left'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>Etapas do processamento:</div>
                <div style={{ opacity: '0.9', lineHeight: '1.4' }}>
                  • <strong>Processamento em etapas:</strong> 25 lotes distribuidos em 3 fases<br />
                  • <strong>Etapa 1:</strong> lotes 1-10 (~9 segundos)<br />
                  • <strong>Etapa 2:</strong> lotes 11-20 (~10 segundos)<br />
                  • <strong>Etapa 3:</strong> lotes 21-25 (~5 segundos)<br />
                  • <strong>Analise documental:</strong> fluxo otimizado para consolidacao do memorial
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="viewer-header">
          <div className="file-info">
            <h1 className="file-name">{file?.originalName}</h1>
            {files.length > 1 && (
              <div className="file-navigation">
                <span>Visualizando {files.length} arquivos</span>
              </div>
            )}
          </div>
        </div>

        {/* Layout para múltiplos arquivos - exibir todos os arquivos selecionados */}
        {files.length > 1 ? (
          <div className="multiple-drawings-layout">

            {files.map((fileItem, index) => (
              <div key={fileItem.id} className="drawing-container">
                <div className="drawing-header">
                  Arquivo {index + 1}: {fileItem.originalName} (ID: {fileItem.id.substring(0, 8)}...)
                </div>
                <div className="drawing-content">
                  <ViewerDXF
                    key={fileItem.id}
                    fileId={fileItem.id}
                    className="drawing-viewer"
                    onDXFDataLoaded={index === currentFileIndex ? handleDXFDataLoaded : undefined}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Layout para arquivo único */
          <div className="viewer-content">
            <ViewerDXF
              key={files[currentFileIndex]?.id || fileId || 'no-file'} // Force re-render when fileId changes
              fileId={files[currentFileIndex]?.id || fileId || undefined}
              className="main-viewer"
              onDXFDataLoaded={handleDXFDataLoaded}
            />
          </div>
        )}

        {memorialError && (
          <div className="memorial-error">
            <p>Erro: {memorialError}</p>
          </div>
        )}

        {memorial && (
          <div className="memorial-section">
            <div className="memorial-header">
              <h2>Memorial Descritivo Gerado</h2>
              <div className="memorial-actions">
                <button
                  onClick={downloadMemorial}
                  className="btn-download-memorial"
                  title="Exportar memorial como PDF"
                >
                  📄 Exportar PDF
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(memorial)}
                  className="btn-copy-memorial"
                  title="Copiar memorial para área de transferência"
                >
                  📋 Copiar Texto
                </button>
              </div>
            </div>
            <div className="memorial-content">
              <pre>{memorial}</pre>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Viewer
