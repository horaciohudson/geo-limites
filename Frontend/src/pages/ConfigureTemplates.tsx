// src/pages/ConfigureTemplates.tsx
import React, { useState, useEffect } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { Input } from '@/components';
import { memorialStandardsService } from '@/services/memorial-standards';
import type { MemorialStandard } from '@/types/memorial-standard';
import './ConfigureTemplates.css';

interface UploadedExample {
  id: string;
  name: string;
  fileName: string;
}

interface DirectoryPickerHandle {
  name: string;
}

interface WritableFileHandle {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

interface SaveFileHandle {
  createWritable: () => Promise<WritableFileHandle>;
}

interface FileSystemAccessWindow extends Window {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite';
    startIn?: string;
  }) => Promise<DirectoryPickerHandle>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    startIn?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
}

interface ErrorLike {
  name?: string;
  message?: string;
  stack?: string;
}

const getErrorName = (error: unknown): string | undefined => {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    return (error as ErrorLike).name;
  }

  return undefined;
};

const ConfigureTemplates: React.FC = () => {

  const { templatesFolder, setTemplatesFolder, isTemplatesFolderConfigured, clearTemplatesFolder } = useConfig();
  
  // Estados para configuração da pasta
  const [folderPath, setFolderPath] = useState(templatesFolder || '');
  const [isEditing, setIsEditing] = useState(!isTemplatesFolderConfigured);
  const [saving, setSaving] = useState(false);
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);

  // Estados para normas
  const [memorialStandards, setMemorialStandards] = useState<MemorialStandard[]>([]);
  const [loadingStandards, setLoadingStandards] = useState(true);

  // Estados para criação de template
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [templateData, setTemplateData] = useState({
    name: '',
    municipality: '',
    memorialStandardId: '',
    exampleId: '',
    description: ''
  });
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Estados para exemplos
  const [availableExamples, setAvailableExamples] = useState<UploadedExample[]>([]);
  const [loadingExamples, setLoadingExamples] = useState(true);

  // Carregar normas e exemplos disponíveis
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar normas
        setLoadingStandards(true);
        const standards = await memorialStandardsService.getAll();
        setMemorialStandards(standards);

        // Carregar exemplos do localStorage (vindos do Upload de Exemplo)
        setLoadingExamples(true);
        const examplesJson = localStorage.getItem('uploadedExamples');

        const examples = JSON.parse(examplesJson || '[]') as UploadedExample[];
        setAvailableExamples(examples);
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        setMemorialStandards([]);
        setAvailableExamples([]);
      } finally {
        setLoadingStandards(false);
        setLoadingExamples(false);
      }
    };

    loadData();
  }, [templatesFolder, isTemplatesFolderConfigured]);

  const handleSave = async () => {
    if (!folderPath.trim()) {
      alert('Por favor, informe o caminho da pasta de templates.');
      return;
    }

    const fullPath = folderPath.trim();

    try {
      setSaving(true);
      setTemplatesFolder(fullPath);
      
      setFolderPath(''); // Limpar o campo após salvar
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      alert('Erro ao salvar configuração. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFolderPath(templatesFolder || '');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFolderPath(templatesFolder || '');
  };

  const handleClear = () => {
    if (confirm('Tem certeza que deseja remover a configuração da pasta de templates?')) {
      clearTemplatesFolder();
      setFolderPath('');
      setIsEditing(true);
    }
  };

  const handleSelectFolder = async () => {
    try {
      setIsSelectingFolder(true);
      
      // Verificar se o navegador suporta a API de seleção de diretório
      const fileSystemWindow = window as FileSystemAccessWindow;

      if (fileSystemWindow.showDirectoryPicker) {
        // API moderna para seleção de diretório
        const directoryHandle = await fileSystemWindow.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'documents'
        });
        
        // A API não fornece o caminho completo, então vamos pedir para o usuário digitar
        const userPath = prompt(
          `📁 Pasta "${directoryHandle.name}" selecionada!\n\n` +
          `Digite o caminho COMPLETO da pasta que você selecionou:\n\n` +
          `Exemplo: C:\\Desenvolvimento\\GeoLimitesMemorial\\templates`,
          `C:\\Desenvolvimento\\GeoLimitesMemorial\\${directoryHandle.name}`
        );
        
        if (userPath && userPath.trim()) {
          setFolderPath(userPath.trim());
        }
        
      }
      
    } catch (error: unknown) {
      if (getErrorName(error) !== 'AbortError') {
        console.error('Erro ao selecionar pasta:', error);
      }
    } finally {
      setIsSelectingFolder(false);
    }
  };

  const handleTemplateInputChange = (field: string, value: string) => {
    setTemplateData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateData.name.trim()) {
      alert('Por favor, informe o nome do template.');
      return;
    }

    if (!templateData.memorialStandardId) {
      alert('Por favor, selecione uma norma.');
      return;
    }

    if (!templateData.exampleId) {
      alert('Por favor, selecione um modelo exemplo.');
      return;
    }

    if (!isTemplatesFolderConfigured) {
      alert('Configure a pasta de templates primeiro.');
      return;
    }

    try {
      setCreatingTemplate(true);

      // Buscar dados do exemplo selecionado
      const selectedExample = availableExamples.find((example) => example.id === templateData.exampleId);
      
      if (!selectedExample) {
        alert('Exemplo selecionado não encontrado.');
        return;
      }

      // Buscar dados da norma selecionada
      const selectedStandard = memorialStandards.find(s => s.id === templateData.memorialStandardId);
      
      if (!selectedStandard) {
        alert('Norma selecionada não encontrada.');
        return;
      }

      // Gerar conteúdo do template baseado na norma e exemplo
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Criar ID único para o template
      const templateId = `${templateData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${selectedStandard.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v1`;

      // Criar conteúdo do template no formato JSON correto
      const templateJson = {
        "template_id": templateId,
        "descricao": `Template ${templateData.name} baseado na norma ${selectedStandard.name} para elaboracao de memoriais descritivos${templateData.municipality ? ` - ${templateData.municipality}` : ''}`,
        "versao": "1.0",
        "norma_referencia": selectedStandard.name,
        "modo_texto": "texto corrido cartorial",
        "municipio_especifico": templateData.municipality || null,
        "exemplo_base": {
          "nome": selectedExample.name,
          "arquivo": selectedExample.fileName
        },
        "estrutura": {
          "cabecalho": "MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA\\n\\nTerreno: Urbano | Proprietário: {{proprietario}} | Localização: {{logradouro}} – Bairro: {{bairro}} | Município/UF: {{municipio}}/{{uf}}\\nObjetivo: Levantamento Topográfico Planimétrico de imóvel urbano georreferenciado no Datum SIRGAS 2000 para fins de Desmembramento de Área.",
          
          "situacao_antes": "SITUAÇÃO ANTES DESTE DESMEMBRAMENTO DE ÁREA\\n\\nTERRENO {{id_terreno}}\\nUm imóvel urbano localizado na {{logradouro}}, bairro {{bairro}}, município de {{municipio}}/{{uf}}, possuindo formato poligonal e irregular, conforme seus pontos {{vertices_lista}}, perfazendo um perímetro de {{perimetro_total}} m ({{perimetro_total_extenso}}) e uma área total de {{area_total}} m² ({{area_total_extenso}}), apresentando as seguintes medidas e confrontações:\\n\\nAO NORTE (fundos): {{norte_detalhes}}\\nAO SUL (frente): {{sul_detalhes}}\\nAO LESTE (lateral esquerda): {{leste_detalhes}}\\nAO OESTE (lateral direita): {{oeste_detalhes}}.",
          
          "situacao_depois": "SITUAÇÃO DEPOIS DESTE DESMEMBRAMENTO DE ÁREA\\n\\nLOTE {{numero_lote}}\\nUm imóvel urbano localizado na {{logradouro}}, bairro {{bairro}}, município de {{municipio}}/{{uf}}, possuindo formato poligonal conforme seus pontos {{vertices_lista}}, perfazendo um perímetro de {{perimetro_total}} m ({{perimetro_total_extenso}}) e uma área territorial de {{area_total}} m² ({{area_total_extenso}}), apresentando as seguintes medidas e confrontações:\\n\\nAO NORTE (fundos): {{norte_detalhes}}\\nAO SUL (frente): {{sul_detalhes}}\\nAO LESTE (lateral esquerda): {{leste_detalhes}}\\nAO OESTE (lateral direita): {{oeste_detalhes}}.",
          
          "declaracao_final": `E por ser verdade, firmamos o presente memorial descritivo, elaborado conforme a ${selectedStandard.name} e em total conformidade com as exigências cartoriais vigentes, apto para instrução de averbação e registro.`
        },
        "placeholders": {
          "proprietario": "Nome completo ou razão social do proprietário do imóvel",
          "logradouro": "Nome oficial da rua, avenida ou via pública de acesso ao imóvel",
          "bairro": "Nome do bairro onde o imóvel está situado",
          "municipio": "Nome do município onde o imóvel está situado",
          "uf": "Sigla da unidade federativa (ex: CE, SP, MG)",
          "id_terreno": "Identificação do terreno original antes do desmembramento (ex: 1)",
          "numero_lote": "Número do lote gerado após o desmembramento",
          "vertices_lista": "Lista ordenada dos vértices com coordenadas (E/N) no sistema SIRGAS 2000 – Fuso 24M",
          "area_total": "Área numérica do terreno em metros quadrados (ex: 130.00)",
          "area_total_extenso": "Área por extenso (ex: cento e trinta metros quadrados)",
          "perimetro_total": "Perímetro numérico do polígono em metros (ex: 60.40)",
          "perimetro_total_extenso": "Perímetro por extenso (ex: sessenta metros e quarenta centímetros)",
          "norte_detalhes": "Descrição detalhada dos segmentos do lado norte, com direção, pontos e confrontantes",
          "sul_detalhes": "Descrição detalhada dos segmentos do lado sul, com direção, pontos e confrontantes",
          "leste_detalhes": "Descrição detalhada dos segmentos do lado leste, com direção, pontos e confrontantes",
          "oeste_detalhes": "Descrição detalhada dos segmentos do lado oeste, com direção, pontos e confrontantes"
        },
        "observacoes": [
          "O texto deve ser gerado em formato contínuo, sem marcadores, listas ou quebras de seção.",
          "Todas as medidas devem ser apresentadas em números arábicos e também por extenso.",
          "Quando houver mais de um segmento em um lado, utilizar a expressão 'DIVIDIDO EM DOIS SEGMENTOS: o primeiro segmento...' conforme norma " + selectedStandard.name + ".",
          "Os vértices devem ser listados em sequência de fechamento (P01 → P02 → ... → P01).",
          "As direções e confrontantes devem respeitar o sentido geográfico (Norte, Sul, Leste, Oeste) obtido do arquivo PR-02."
        ],
        "norma_completa": selectedStandard.standardText || "Texto da norma não disponível",
        "prompt_ia": selectedStandard.promptTemplate || "Template operacional nao disponivel",
        "metadados": {
          "criado_em": new Date().toISOString(),
          "criado_por": "GeoLimites Memorial",
          "exemplo_utilizado": selectedExample.name,
          "arquivo_exemplo": selectedExample.fileName,
          "descricao_personalizada": templateData.description || null
        }
      };

      // Converter para JSON formatado
      const templateContent = JSON.stringify(templateJson, null, 2);

      // Criar objeto do template
      const newTemplate = {
        id: Date.now().toString(),
        name: templateData.name,
        description: templateData.description,
        municipality: templateData.municipality,
        memorialStandardId: templateData.memorialStandardId,
        memorialStandardName: selectedStandard.name,
        exampleId: templateData.exampleId,
        exampleName: selectedExample.name,
        exampleFileName: selectedExample.fileName,
        targetFolder: templatesFolder,
        createdAt: new Date().toISOString(),
        content: templateContent
      };

      // Salvar arquivo físico do template
      try {
        // Criar nome do arquivo
        const fileName = `${templateData.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;

        // Usar File System Access API com sugestão da pasta configurada
        const fileSystemWindow = window as FileSystemAccessWindow;

        if (fileSystemWindow.showSaveFilePicker) {
          try {
            const fileHandle = await fileSystemWindow.showSaveFilePicker({
              suggestedName: fileName,
              startIn: 'documents',
              types: [{
                description: 'Template de Memorial JSON',
                accept: { 'application/json': ['.json'] }
              }]
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(templateContent);
            await writable.close();
          } catch (saveError: unknown) {
            if (getErrorName(saveError) !== 'AbortError') {
              console.error('❌ Erro ao salvar:', saveError);
            }
            
            // Fallback: download automático
            const blob = new Blob([templateContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        } else {
          // Fallback para navegadores sem suporte
          const blob = new Blob([templateContent], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        
      } catch (fileError) {
        console.error('❌ Erro geral ao salvar arquivo:', fileError);
      }

      // Salvar no localStorage para controle interno
      const existingTemplates = JSON.parse(localStorage.getItem('createdTemplates') || '[]');
      existingTemplates.push(newTemplate);
      localStorage.setItem('createdTemplates', JSON.stringify(existingTemplates));

      // Reset form
      setTemplateData({
        name: '',
        municipality: '',
        memorialStandardId: '',
        exampleId: '',
        description: ''
      });
      setShowCreateForm(false);
      
      // Mostrar onde o template foi salvo
      alert(`✅ Template JSON "${templateData.name}" criado com sucesso!\n\n📁 Salve o arquivo em: ${templatesFolder}\n\n📄 Template contém:\n• Estrutura completa do memorial\n• Placeholders ({{proprietario}}, {{area_total}}, etc.)\n• Norma ${selectedStandard.name}\n• Observações técnicas\n\n💡 Após salvar na pasta correta, o template estará disponível para gerar memoriais.`);

    } catch (error: unknown) {
      console.error('❌ Erro detalhado ao criar template:', error);
      if (typeof error === 'object' && error !== null && 'stack' in error) {
        console.error('Stack trace:', (error as ErrorLike).stack);
      }
      alert('Erro ao criar template. Tente novamente.');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setTemplateData({
      name: '',
      municipality: '',
      memorialStandardId: '',
      exampleId: '',
      description: ''
    });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#2c3e50', fontSize: '2rem', fontWeight: 'bold' }}>
          🎨 Configurar Templates
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isTemplatesFolderConfigured && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{ 
                backgroundColor: showCreateForm ? '#e74c3c' : '#3498db',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              {showCreateForm ? 'Cancelar' : '📝 Novo Template'}
            </button>
          )}
        </div>
      </div>

      {/* Configuração da Pasta */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        border: '1px solid #e9ecef'
      }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          📁 Configuração da Pasta Local de Templates
        </h2>
        
        <div style={{ 
          backgroundColor: isTemplatesFolderConfigured ? '#d4edda' : '#fff3cd', 
          border: `1px solid ${isTemplatesFolderConfigured ? '#c3e6cb' : '#ffeaa7'}`, 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '1.5rem',
          color: isTemplatesFolderConfigured ? '#155724' : '#856404'
        }}>
          <strong>Status:</strong> {isTemplatesFolderConfigured ? (
            <>✅ Pasta configurada: <code style={{ backgroundColor: '#c3e6cb', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{templatesFolder}</code></>
          ) : (
            '⚠️ Pasta não configurada'
          )}
        </div>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
              📂 Caminho Completo da Pasta Local de Templates
            </label>
            {/* Campo de edição - largura total */}
            <div style={{ marginBottom: '1rem' }}>
              <Input
                type="text"
                value={folderPath}
                onChange={(value) => setFolderPath(value)}
                placeholder="Ex: C:\Desenvolvimento\GeoLimitesMemorial\templates"
                disabled={!isEditing}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            
            {/* Botões quando editando */}
            {isEditing && (
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <button
                  onClick={handleSelectFolder}
                  disabled={isSelectingFolder}
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    cursor: isSelectingFolder ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isSelectingFolder ? '⏳ Selecionando...' : '📁 Selecionar'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {saving ? 'Salvando...' : '💾 Salvar'}
                </button>
              </div>
            )}
            <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6c757d' }}>
              <p>💡 <strong>Dica:</strong> Use "📁 Selecionar" para escolher a pasta ou digite o caminho completo manualmente</p>
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '0.8rem' }}>
                <strong>Exemplo:</strong> <code>C:\Desenvolvimento\GeoLimitesMemorial\templates</code>
              </div>
            </div>
            
            {/* Campo para mostrar o endereço salvo - abaixo da dica */}
            {isTemplatesFolderConfigured && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                backgroundColor: '#e8f5e8', 
                border: '1px solid #c3e6cb', 
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: '#155724', fontWeight: '500', marginBottom: '0.5rem' }}>
                  📂 Pasta configurada:
                </div>
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.9rem', 
                  color: '#2c3e50',
                  wordBreak: 'break-all',
                  backgroundColor: 'white',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #c3e6cb'
                }}>
                  {templatesFolder}
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                onClick={handleEdit}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ✏️ Editar
              </button>
              <button
                onClick={handleClear}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                🗑️ Remover
              </button>
            </div>
          )}
          
          {isEditing && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              {isTemplatesFolderConfigured && (
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Formulário de Criação de Template */}
      {showCreateForm && isTemplatesFolderConfigured && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '1px solid #e9ecef'
        }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
            📝 Criar Novo Template
          </h2>
          
          <div style={{ 
            backgroundColor: '#e8f4fd', 
            border: '1px solid #bee5eb', 
            borderRadius: '8px', 
            padding: '1rem', 
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            <strong>💡 Dica:</strong> Preencha os dados do template que sera gerado pela plataforma com base na norma selecionada e no modelo exemplo escolhido.
          </div>
          
          <form onSubmit={handleCreateTemplate}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  📋 Nome do Template *
                  <span className="label-hint">
                    (Ex: Memorial Padrão Fortaleza, Template Desmembramento SP)
                  </span>
                </label>
                <Input
                  type="text"
                  value={templateData.name}
                  onChange={(value) => handleTemplateInputChange('name', value)}
                  placeholder="Digite o nome do template"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    🏛️ Município
                    <span className="label-hint">
                      (Opcional - para templates específicos)
                    </span>
                  </label>
                  <Input
                    type="text"
                    value={templateData.municipality}
                    onChange={(value) => handleTemplateInputChange('municipality', value)}
                    placeholder="Ex: Fortaleza, São Paulo"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    ⚙️ Norma Base *
                    <span className="label-hint">
                      (Norma que será seguida pelo template)
                    </span>
                  </label>
                  {loadingStandards ? (
                    <div className="loading-text">
                      ⏳ Carregando normas...
                    </div>
                  ) : (
                    <select
                      value={templateData.memorialStandardId}
                      onChange={(e) => handleTemplateInputChange('memorialStandardId', e.target.value)}
                      required
                      className="form-select"
                    >
                      <option value="">Selecione uma norma...</option>
                      {memorialStandards.map((standard) => (
                        <option key={standard.id} value={standard.id}>
                          {standard.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  📄 Modelo Exemplo *
                  <span className="label-hint">
                    (Arquivo de exemplo que servira como referencia operacional)
                  </span>
                </label>
                {loadingExamples ? (
                  <div className="loading-text">
                    ⏳ Carregando exemplos...
                  </div>
                ) : availableExamples.length === 0 ? (
                  <div style={{ 
                    padding: '0.75rem', 
                    color: '#dc3545', 
                    border: '1px solid #f5c6cb', 
                    borderRadius: '8px',
                    backgroundColor: '#f8d7da'
                  }}>
                    ⚠️ Nenhum exemplo disponível. <br/>
                    <small>Vá para "📤 Upload de Exemplo" para enviar arquivos de referência primeiro.</small>
                  </div>
                ) : (
                  <select
                    value={templateData.exampleId}
                    onChange={(e) => handleTemplateInputChange('exampleId', e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">Selecione um exemplo...</option>
                    {availableExamples.map((example) => (
                      <option key={example.id} value={example.id}>
                        📄 {example.name} ({example.fileName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  📝 Descrição
                  <span className="label-hint">
                    (Opcional - descreva o propósito do template)
                  </span>
                </label>
                <textarea
                  value={templateData.description}
                  onChange={(e) => handleTemplateInputChange('description', e.target.value)}
                  placeholder="Ex: Template para memoriais de loteamento seguindo norma municipal de Fortaleza"
                  rows={3}
                  className="form-textarea"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="action-btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingTemplate}
                  className="action-btn btn-success"
                >
                  {creatingTemplate ? 'Gerando template...' : 'Criar Template'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}


    </div>
  );
};

export default ConfigureTemplates;
