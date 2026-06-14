// src/pages/ConfigureTemplates.tsx
import React, { useState, useEffect } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { Input } from '@/components';
import { memorialStandardsService } from '@/services/memorial-standards';
import { templatesService } from '@/services/templates';
import type { MemorialStandard } from '@/types/memorial-standard';
import './ConfigureTemplates.css';


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
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Carregar normas e exemplos disponíveis
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar normas
        setLoadingStandards(true);
        const standards = await memorialStandardsService.getAll();
        setMemorialStandards(standards);
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        setMemorialStandards([]);
      } finally {
        setLoadingStandards(false);
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
          `Exemplo: C:\\Desenvolvimento\\GeoLimites\\Templates`,
          `C:\\Desenvolvimento\\GeoLimites\\${directoryHandle.name}`
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

    if (!selectedFile) {
      alert('Por favor, selecione um arquivo de exemplo PDF.');
      return;
    }

    if (!isTemplatesFolderConfigured) {
      alert('Configure a pasta de templates primeiro.');
      return;
    }

    try {
      setCreatingTemplate(true);

      // Buscar dados da norma selecionada
      const selectedStandard = memorialStandards.find(s => s.id === templateData.memorialStandardId);
      
      if (!selectedStandard) {
        alert('Norma selecionada não encontrada.');
        return;
      }

      // Chama a API real do backend para gerar o template usando IA
      const response = await templatesService.generateTemplate(selectedFile, {
        name: templateData.name,
        description: templateData.description,
        municipality: templateData.municipality,
        memorialStandardId: templateData.memorialStandardId,
        targetFolderPath: templatesFolder || ''
      });

      // O backend retorna o JSON gerado no campo templateContent (agora é content)
      const templateContent = (response as any).content || (response as any).templateContent || '';

      // Criar objeto do template para listagem local
      const newTemplate = {
        id: response.id || Date.now().toString(),
        name: templateData.name,
        description: templateData.description,
        municipality: templateData.municipality,
        memorialStandardId: templateData.memorialStandardId,
        memorialStandardName: selectedStandard.name,
        exampleFileName: selectedFile.name,
        targetFolder: templatesFolder,
        createdAt: new Date().toISOString(),
        content: templateContent
      };

      // Salvar no localStorage para controle interno
      const existingTemplates = JSON.parse(localStorage.getItem('createdTemplates') || '[]');
      existingTemplates.push(newTemplate);
      localStorage.setItem('createdTemplates', JSON.stringify(existingTemplates));

      // Reset form
      setTemplateData({
        name: '',
        municipality: '',
        memorialStandardId: '',
        description: ''
      });
      setSelectedFile(null);
      setShowCreateForm(false);
      
      // Mostrar onde o template foi salvo
      alert(`✅ Template JSON "${templateData.name}" criado com sucesso!\n\n📁 O arquivo foi salvo automaticamente na pasta configurada:\n${templatesFolder}\n\n📄 Template contém:\n• Estrutura completa do memorial\n• Placeholders ({{proprietario}}, {{area_total}}, etc.)\n• Norma ${selectedStandard.name}\n• Observações técnicas\n\n💡 O template já está disponível para uso.`);

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
      description: ''
    });
    setSelectedFile(null);
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
                placeholder="Ex: C:\Desenvolvimento\GeoLimites\Templates"
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
              <p>💡 <strong>Dica:</strong> Digite o caminho completo manualmente</p>
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '0.8rem' }}>
                <strong>Exemplo:</strong> <code>C:\Desenvolvimento\GeoLimites\Templates</code>
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
                  📄 Arquivo de Exemplo (PDF) *
                  <span className="label-hint">
                    (Envie o PDF do memorial que servirá como referência para a IA)
                  </span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  required
                  className="form-input"
                  style={{ padding: '0.5rem', backgroundColor: '#fff' }}
                />
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
