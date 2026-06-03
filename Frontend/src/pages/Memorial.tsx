import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loading } from '@/components';
import GenerationProgress from '@/components/GenerationProgress';
import { useAsyncMemorial } from '@/hooks/useAsyncMemorial';
import api from '@/services/api';
import { parseDXF } from '@/utils/dxfParser';
import type { DXFData } from '@/utils/dxfParser';
import type { MemorialStandard } from '@/types/memorial-standard';
import type { AsyncCompareResult, AsyncPropertyData } from '@/services/polling-memorial';
import type { FileMetadata, TemplateOption } from '@/types';
import { useFileContext } from '@/contexts/FileContext';
import jsPDF from 'jspdf';

interface PropertyLinkedFile {
  fileName: string;
  fileType: string;
}

interface PropertySelection extends AsyncPropertyData {
  id: string;
  dxfFiles?: PropertyLinkedFile[];
}

interface PropertySummaryResponse {
  id?: string;
  property_id?: string;
  registration_number?: string;
  name?: string;
  full_address?: string;
  owner_name?: string;
  owner_document?: string;
  property_type?: string;
  dxf_files_list?: string;
  dxfFiles?: PropertyLinkedFile[];
}

interface ErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const normalizePropertySummary = (summary: PropertySummaryResponse): PropertySelection => {
  const [streetPart = '', neighborhoodPart = '', cityStatePart = ''] = (summary.full_address || '').split(' - ');
  const [cityPart = '', statePart = ''] = cityStatePart.split(', ');

  return {
    id: summary.id || summary.property_id || '',
    registrationNumber: summary.registration_number || '',
    name: summary.name || '',
    street: streetPart,
    neighborhood: neighborhoodPart.split(',')[0]?.trim() || '',
    city: cityPart.trim(),
    state: statePart.split(' -')[0]?.trim() || '',
    ownerName: summary.owner_name || '',
    ownerDocument: summary.owner_document || '',
    propertyType: summary.property_type || '',
    dxfFiles: summary.dxfFiles || [],
  };
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const errorLike = error as ErrorLike;
    return errorLike.response?.data?.message || errorLike.message || fallback;
  }

  return fallback;
};

const Memorial: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getDXFData, selectedFiles, clearDXFData, clearAllSelections } = useFileContext();
  
  const fileId = searchParams.get('fileId');
  const fileIds = searchParams.get('fileIds');
  const projectName = searchParams.get('projectName') || '';
  const projectDescription = searchParams.get('projectDescription') || '';

  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [dxfDataList, setDxfDataList] = useState<DXFData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [memorial, setMemorial] = useState('');
  const [memorialError, setMemorialError] = useState('');
  
  // Estados para normas e templates
  const [selectedNorms, setSelectedNorms] = useState<MemorialStandard[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [propertyData, setPropertyData] = useState<PropertySelection | null>(null);
  const [availableProperties, setAvailableProperties] = useState<PropertySelection[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  // Hook para geração assíncrona de memorial
  const [asyncState, asyncActions] = useAsyncMemorial();

  // Carregar propriedades disponíveis e dados do localStorage
  useEffect(() => {
    const loadProperties = async () => {
      try {
        // Primeiro, verificar se há propriedade selecionada no localStorage
        const savedProperty = localStorage.getItem('selectedPropertyForMemorial');
        if (savedProperty) {
          try {
            const parsedProperty = JSON.parse(savedProperty);
            setPropertyData(parsedProperty);
            setSelectedPropertyId(parsedProperty.id);
                      } catch (error) {
            console.error('❌ Erro ao parsear propriedade do localStorage:', error);
          }
        }
        
        // Carregar lista de propriedades disponíveis
        const response = await api.get('/properties/summary');
        const properties = (response.data as PropertySummaryResponse[]).map(normalizePropertySummary);
        
        if (properties && properties.length > 0) {
          setAvailableProperties(properties);
          
          // Se não há propriedade do localStorage, tentar encontrar correspondência por arquivos
          if (!savedProperty) {
            const currentFileNames = files.map(f => f.originalName.toLowerCase());
            const matchingProperty = properties.find((prop) => {
              const rawSummary = response.data.find((item: PropertySummaryResponse) =>
                (item.id || item.property_id || '') === prop.id
              );

              if (rawSummary?.dxf_files_list) {
                const propFiles = rawSummary.dxf_files_list.toLowerCase().split(', ');
                return propFiles.some((propFile: string) => 
                  currentFileNames.includes(propFile)
                );
              }
              return false;
            });
            
            if (matchingProperty) {
              setPropertyData(matchingProperty);
              setSelectedPropertyId(matchingProperty.id);
                          }
          }
          
                  }
      } catch (error: unknown) {
        console.error('Erro ao carregar propriedades:', error);
              }
    };

    loadProperties();
  }, [files]);

  // Atualizar memorial quando a geração assíncrona completar
  useEffect(() => {
    if (asyncState.memorial) {
      setMemorial(asyncState.memorial);
      setMemorialError('');
    } else if (asyncState.error) {
      setMemorialError(asyncState.error);
      setMemorial('');
    }
  }, [asyncState.memorial, asyncState.error]);

  // Função para fechar memorial e limpar dados
  const closeMemorial = () => {
        clearDXFData(); // Limpa todos os dados DXF da memória
    clearAllSelections(); // Limpa seleções de arquivos
    setMemorial('');
    setMemorialError('');
    asyncActions.clearState(); // Limpar estado assíncrono
    navigate('/files'); // Volta para a página de arquivos
  };

  // Removido carregamento automático da norma padrão para evitar erros quando backend não disponível
  // useEffect(() => {
  //   const loadDefaultStandard = async () => {
  //     try {
  //       const defaultNorm = await memorialStandardsService.getDefault();
  //       if (defaultNorm) {
  //         setDefaultStandard(defaultNorm);
  //           //       } else {
  //       }
  //     } catch (error) {
  //       console.error('❌ Erro ao carregar norma padrão:', error);
  //     }
  //   };

  //   loadDefaultStandard();
  // }, []);

  // Carregar normas e templates do localStorage
  useEffect(() => {
        try {
      // Carregar normas selecionadas
      const savedNorms = localStorage.getItem('selectedMemorialNorms');
            
      if (savedNorms) {
        const parsedNorms = JSON.parse(savedNorms);
                        setSelectedNorms(parsedNorms);
              } else {
              }

      // Carregar template selecionado
      const savedTemplateId = localStorage.getItem('selectedTemplate');
      if (savedTemplateId) {
                
        // Buscar o template completo pelo ID
        const templateIndex = [
          {
            id: "memorial_descritivo",
            name: "Memorial Descritivo (UI)",
            file: "memorial_descritivo.json"
          },
          {
            id: "relatorio_geometrico", 
            name: "Relatório Geométrico (UI)",
            file: "relatorio_geometrico.json"
          },
          {
            id: "cadastro_terreno",
            name: "Cadastro de Terreno (UI)", 
            file: "cadastro_terreno.json"
          },
          {
            id: "desmembramento_terreno",
            name: "Desmembramento de Terreno", 
            file: "memorial_desmembramento.json"
          },
          {
            id: "memorial_descritivo_normativo",
            name: "Memorial Descritivo (Normativo ABNT)",
            file: "memorial_descritivo_normativo.json"
          },
          {
            id: "relatorio_geometrico_normativo", 
            name: "Relatório Geométrico (Normativo ABNT)",
            file: "relatorio_geometrico_normativo.json"
          },
          {
            id: "cadastro_terreno_normativo",
            name: "Cadastro de Terreno (Normativo ABNT)", 
            file: "cadastro_terreno_normativo.json"
          }
        ];
        
        const foundTemplate = templateIndex.find(t => t.id === savedTemplateId);
        if (foundTemplate) {
          setSelectedTemplate(foundTemplate);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados do localStorage:', error);
    }
  }, []);

  useEffect(() => {
    const loadFilesAndDXF = async () => {
      if (!fileId && !fileIds && selectedFiles.length === 0) {
        setFiles([]);
        setDxfDataList([]);
        setError('Nenhum arquivo especificado');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        let loadedFiles: FileMetadata[] = [];
        let loadedDxfData: DXFData[] = [];

        if (selectedFiles.length > 0) {
          loadedFiles = selectedFiles;

          for (const selectedFile of selectedFiles) {
            const contextData = getDXFData(selectedFile.id);
            if (contextData?.dxfData) {
              loadedDxfData.push(contextData.dxfData);
              continue;
            }

            try {
              const response = await api.get(`/dxf/${selectedFile.id}/download`, {
                responseType: 'text',
              });
              loadedDxfData.push(parseDXF(response.data as string));
            } catch (fileError: unknown) {
              console.error(`Erro ao carregar DXF do arquivo ${selectedFile.originalName}:`, fileError);
            }
          }
        } else {
          if (fileIds) {
            const ids = fileIds.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
            const fileResponses = await Promise.all(ids.map((id) => api.get(`/dxf/${id}`)));
            loadedFiles = fileResponses.map((response) => response.data as FileMetadata);
          } else if (fileId) {
            const response = await api.get(`/dxf/${fileId}`);
            loadedFiles = [response.data as FileMetadata];
          }

          const dxfResults = await Promise.all(
            loadedFiles.map(async (loadedFile) => {
              try {
                const response = await api.get(`/dxf/${loadedFile.id}/download`, {
                  responseType: 'text',
                });
                return parseDXF(response.data as string);
              } catch (fileError: unknown) {
                console.error(`Erro ao carregar DXF do arquivo ${loadedFile.originalName}:`, fileError);
                return null;
              }
            })
          );

          loadedDxfData = dxfResults.filter((data): data is DXFData => data !== null);
        }

        setFiles(loadedFiles);
        setDxfDataList(loadedDxfData);

        if (loadedFiles.length === 0) {
          setError('Nenhum arquivo especificado');
        } else if (loadedDxfData.length === 0) {
          setError('Nenhum dado DXF válido encontrado nos arquivos selecionados');
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar arquivos:', err);
        setFiles([]);
        setDxfDataList([]);
        setError(getErrorMessage(err, 'Erro ao carregar arquivos'));
      } finally {
        setIsLoading(false);
      }
    };

    loadFilesAndDXF();
  }, [fileId, fileIds, selectedFiles]);

  // Gerar memorial automaticamente quando os dados estiverem prontos - COMENTADO PARA EVITAR LOOP
  // useEffect(() => {
  //   if (files.length > 0 && dxfDataList.length > 0 && !isGenerating && !memorial) {
  //     generateMemorial();
  //   }
  // }, [files, dxfDataList]);

  const generateMemorial = async () => {
        if (files.length === 0 || dxfDataList.length === 0) {
      setMemorialError('Dados dos arquivos não disponíveis');
      return;
    }

    try {
      // Limpar estados anteriores
      setMemorialError('');
      setMemorial('');
      asyncActions.clearState();

      // Verificar se os dados DXF já estão processados e otimizados
      const allEntities = dxfDataList.flatMap(dxfData => dxfData.entities || []);
      
            if (allEntities.length === 0) {
        setMemorialError('Nenhuma entidade DXF encontrada nos arquivos selecionados');
        return;
      }

      // Verificar qualidade dos dados (se têm coordenadas válidas)
      const entitiesWithCoords = allEntities.filter(entity => {
        const props = entity.properties;
        return props.x !== undefined || props.y !== undefined || 
               props.x1 !== undefined || props.y1 !== undefined ||
               props.centerX !== undefined || props.centerY !== undefined ||
               (props.vertices && props.vertices.length > 0);
      });

      if (entitiesWithCoords.length === 0) {
        setMemorialError('Os dados DXF não contêm coordenadas válidas para gerar o memorial');
        return;
      }
      
      const fileNames = files.map(file => file.originalName).join(', ');

      // Verificar se há norma selecionada
                  
      let normsToUse = selectedNorms;
      
      // Se o estado selectedNorms está vazio, tentar carregar diretamente do localStorage
      if (!normsToUse || normsToUse.length === 0) {
        const savedNorms = localStorage.getItem('selectedMemorialNorms');
        if (savedNorms) {
          try {
            normsToUse = JSON.parse(savedNorms);
                        setSelectedNorms(normsToUse); // Atualizar o estado também
          } catch (error) {
            console.error('❌ Erro ao parsear normas do localStorage:', error);
          }
        }
      }
      
      if (!normsToUse || normsToUse.length === 0) {
        setMemorialError('❌ ERRO: Nenhuma norma selecionada! Vá em "Gerenciar Normas" e selecione uma norma antes de gerar o memorial.');
        return;
      }

      const standardIdToUse = normsToUse[0].id;
            
      // Validar se é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(standardIdToUse)) {
        console.error('❌ ERRO: standardId não é um UUID válido:', standardIdToUse);
        setMemorialError('❌ ERRO: ID da norma inválido. A norma selecionada tem um formato inválido. Selecione uma norma válida em "Gerenciar Normas".');
        return;
      }

      const requestData = {
        entities: allEntities,
        fileName: files.map(f => f.originalName).join(', '),
        projectName: projectName || propertyData?.name || 'Memorial Descritivo',
        projectDescription: projectDescription || `Memorial descritivo da propriedade ${propertyData?.registrationNumber || 'não identificada'}`,
        standardId: standardIdToUse,
        // Dados da propriedade para preenchimento automático
        propertyData: propertyData ? {
          registrationNumber: propertyData.registrationNumber,
          name: propertyData.name,
          street: propertyData.street,
          number: propertyData.number,
          neighborhood: propertyData.neighborhood,
          city: propertyData.city,
          state: propertyData.state,
          zipCode: propertyData.zipCode,
          ownerName: propertyData.ownerName,
          ownerDocument: propertyData.ownerDocument,
          propertyType: propertyData.propertyType
        } : null
      };

      // Usar geração assíncrona
      const asyncRequest = {
        compareResult: requestData as AsyncCompareResult,
        standardId: standardIdToUse,
        fileName: fileNames
      };

            // Iniciar geração assíncrona
      await asyncActions.generateMemorial(asyncRequest);

    } catch (err: unknown) {
      console.error('❌ Erro ao iniciar geração assíncrona:', err);
      setMemorialError(getErrorMessage(err, 'Erro ao iniciar geração do memorial'));
    }
  };

  const downloadPDF = () => {
    if (!memorial) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    // Cabeçalho
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MEMORIAL DESCRITIVO', pageWidth / 2, 30, { align: 'center' });

    // Informações do projeto
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    let yPosition = 50;

    if (projectName) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Projeto:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(projectName, margin + 25, yPosition);
      yPosition += 10;
    }

    if (files.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Arquivos:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      const fileNames = files.map(f => f.originalName).join(', ');
      const fileLines = pdf.splitTextToSize(fileNames, maxWidth - 25);
      pdf.text(fileLines, margin + 25, yPosition);
      yPosition += fileLines.length * 5 + 5;
    }

    yPosition += 10;

    // Conteúdo do memorial
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(memorial, maxWidth);
    
    for (let i = 0; i < lines.length; i++) {
      if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(lines[i], margin, yPosition);
      yPosition += 5;
    }

    // Nome do arquivo
    const fileName = `Memorial_Descritivo_${projectName || 'Projeto'}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  const copyToClipboard = async () => {
    if (!memorial) return;
    
    try {
      await navigator.clipboard.writeText(memorial);
      // Aqui você pode adicionar uma notificação de sucesso
          } catch (err) {
      console.error('Erro ao copiar para área de transferência:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="memorial-page">
        <div className="memorial-loading">
          <Loading />
          <p>Carregando arquivos e processando dados DXF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="memorial-page">
        <div className="memorial-error">
          <h2>Erro</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn-back">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="memorial-page" style={{ height: '100vh', overflow: 'auto' }}>
      <div className="memorial-header">
        <h1>Memorial Descritivo</h1>
        <p>Relatório técnico baseado em arquivos DXF/DWG</p>
        <button 
          onClick={closeMemorial}
          className="btn-close-memorial"
          title="Fechar memorial e limpar dados da memória"
        >
          ✕ Fechar Memorial
        </button>
      </div>

      <div className="memorial-info">
        <div className="project-info">
          <h3>Informações do Projeto</h3>
          <p><strong>Projeto:</strong> {projectName || propertyData?.name || 'Não especificado'}</p>
          <p><strong>Arquivos:</strong> {files.map(f => f.originalName).join(', ')}</p>
          <p><strong>Total de entidades:</strong> {dxfDataList.reduce((total, dxf) => total + (dxf.entities?.length || 0), 0)}</p>
          
          {availableProperties.length > 0 && (
            <div className="property-selector">
              <h4>🏠 Selecionar Propriedade</h4>
              <select 
                value={selectedPropertyId} 
                onChange={(e) => {
                  const propId = e.target.value;
                  setSelectedPropertyId(propId);
                  const selectedProp = availableProperties.find(p => p.id === propId);
                  setPropertyData(selectedProp || null);
                }}
                style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
              >
                <option value="">Selecione uma propriedade...</option>
                {availableProperties.map(prop => (
                  <option key={prop.id} value={prop.id}>
                    {prop.registrationNumber} - {prop.name} ({prop.city})
                    {(prop.dxfFiles?.length ?? 0) > 0 && ` - ${(prop.dxfFiles?.length ?? 0)} arquivo(s) DXF`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {propertyData && (
            <div className="property-info">
              <h4>📋 Propriedade Selecionada</h4>
              <p><strong>Registro:</strong> {propertyData.registrationNumber}</p>
              <p><strong>Nome:</strong> {propertyData.name}</p>
              <p><strong>Endereço:</strong> {propertyData.street}, {propertyData.number} - {propertyData.neighborhood}</p>
              <p><strong>Cidade:</strong> {propertyData.city} - {propertyData.state}</p>
              <p><strong>Proprietário:</strong> {propertyData.ownerName}</p>
              <p><strong>Documento:</strong> {propertyData.ownerDocument}</p>
              
              {propertyData.dxfFiles && propertyData.dxfFiles.length > 0 && (
                <div className="dxf-files-info">
                  <p><strong>Arquivos DXF/DWG associados:</strong></p>
                  <ul>
                    {propertyData.dxfFiles.map((dxfFile, index: number) => (
                      <li key={index}>
                        📐 {dxfFile.fileName} ({dxfFile.fileType})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {!propertyData && (
            <div className="no-property-warning">
              <p>⚠️ <strong>Nenhuma propriedade cadastrada encontrada.</strong></p>
              <p>Para um memorial mais completo, cadastre a propriedade primeiro.</p>
              <button 
                onClick={() => navigate('/property-register')}
                className="btn-register-property"
              >
                📝 Cadastrar Propriedade
              </button>
            </div>
          )}
        </div>

        <div className="norms-templates">
          <div className="form-group">
            <h3>📋 Normas Base para o Memorial ({selectedNorms.length})</h3>
            {selectedNorms.length > 0 ? (
              <ul className="selected-norms-list">
                {selectedNorms.map((norm, index) => (
                  <li key={index} className="norm-item">
                    <strong>{norm.id}</strong> - {norm.name}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-selection error-message">
                <p>❌ Nenhuma norma selecionada</p>
                <p style={{ fontSize: '0.9em', color: '#666' }}>
                  Vá em "Gerenciar Normas" para selecionar uma norma antes de gerar o memorial.
                </p>
              </div>
            )}
          </div>

          <div className="form-group">
            <h3>📄 Selecionar Template</h3>
            {selectedTemplate ? (
              <div className="selected-template">
                <p className="template-name">
                  <strong>{selectedTemplate.name}</strong>
                </p>
                <p className="template-description">{selectedTemplate.description}</p>
              </div>
            ) : (
              <p className="no-selection">Nenhum template selecionado</p>
            )}
          </div>

          <button 
            onClick={generateMemorial} 
            disabled={asyncState.isGenerating}
            className="btn-regenerate"
          >
            {asyncState.isGenerating ? 'Gerando...' : 'Regenerar Memorial'}
          </button>
          
          <button 
            onClick={() => {
                            
              // Simular dados de teste
              const testRequest = {
                compareResult: {
                  entities: [
                    { type: 'LINE', layer: 'test', properties: { x1: 0, y1: 0, x2: 100, y2: 100 } }
                  ],
                  propertyData: null
                },
                standardId: '12fb339a-89ce-457c-8292-b0109de2a1f1',
                fileName: 'teste.dxf'
              };
              
                            asyncActions.generateMemorial(testRequest);
            }}
            disabled={asyncState.isGenerating}
            className="btn-regenerate"
            style={{ marginLeft: '10px', backgroundColor: '#ff9800' }}
          >
            🧪 Teste Timer
          </button>
          
          <button 
            onClick={() => {
                            
              // Simular apenas o timer sem backend
              let elapsed = 0;
              
              const interval = setInterval(() => {
                elapsed++;
                                
                // Parar após 10 segundos
                if (elapsed >= 10) {
                  clearInterval(interval);
                                  }
              }, 1000);
              
                          }}
            className="btn-regenerate"
            style={{ marginLeft: '10px', backgroundColor: '#2196f3' }}
          >
            ⏰ Teste Timer Simples
          </button>
          
          <button 
            onClick={() => {
                            
              // Simular estado de geração para testar o timer visual
              asyncActions.clearState();
              
              // Forçar estado de geração
              setTimeout(() => {
                // Simular início da geração
                const testRequest = {
                  compareResult: {
                    entities: [{ type: 'TEST', layer: 'test', properties: {} }],
                    propertyData: null
                  },
                  standardId: '12fb339a-89ce-457c-8292-b0109de2a1f1',
                  fileName: 'teste-visual.dxf'
                };
                
                                asyncActions.generateMemorial(testRequest);
              }, 100);
            }}
            disabled={asyncState.isGenerating}
            className="btn-regenerate"
            style={{ marginLeft: '10px', backgroundColor: '#9c27b0' }}
          >
            🎬 Teste Timer Visual
          </button>
          
        </div>
      </div>

      <GenerationProgress
        isGenerating={asyncState.isGenerating}
        progress={asyncState.progress}
        currentStep={asyncState.currentStep}
        timeElapsed={asyncState.timeElapsed}
        sessionId={asyncState.sessionId || undefined}
        onCancel={asyncActions.cancelGeneration}
      />

      {memorialError && (
        <div className="memorial-error">
          <p>Erro: {memorialError}</p>
        </div>
      )}

      {memorial && (
        <div className="memorial-content">
          <div className="memorial-actions">
            <button onClick={downloadPDF} className="btn-download">
              💾 Salvar Arquivo PDF
            </button>
            <button onClick={copyToClipboard} className="btn-copy">
              📋 Copiar Texto
            </button>
          </div>

          <div className="memorial-text" style={{ maxHeight: '60vh', overflow: 'auto', border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
            <h3>Memorial Descritivo Gerado</h3>
            <div className="memorial-body">
              {memorial.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="memorial-footer">
        <button onClick={() => navigate(-1)} className="btn-back">
          ← Voltar
        </button>
      </div>
    </div>
  );
};

export default Memorial;
