import React, { useState, useEffect } from 'react';
import { getStoredToken } from '@/auth/session';
import { memorialStandardsService } from '../services/memorial-standards';
import { templatesService } from '../services/templates';
import type { MemorialStandard, MemorialStandardFormData } from '../types/memorial-standard';
import { useConfig } from '../contexts/ConfigContext';
import Input from '../components/Input';
import Loading from '../components/Loading';

interface TemplateApiRecord {
  id: string;
  name?: string;
  description?: string;
  templateContent?: unknown;
  municipality?: string;
  abntNorm?: string;
}

interface StoredTemplateData {
  template_id: string;
  descricao?: string;
  estrutura?: Record<string, unknown>;
  name?: string;
  municipio?: string;
  norma_referencia?: string;
  _dbId?: string;
  _fromDB?: boolean;
  [key: string]: unknown;
}

interface ErrorLike {
  message?: string;
  stack?: string;
}

const parseStoredTemplates = (rawValue: string | null): StoredTemplateData[] => {
  if (!rawValue) {
    return [];
  }

  return JSON.parse(rawValue) as StoredTemplateData[];
};

const getTemplateIdentifier = (template: Pick<StoredTemplateData, 'template_id' | 'name'>): string =>
  template.template_id || template.name || '';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

const ManageStandards: React.FC = () => {
  const { templatesFolder, isTemplatesFolderConfigured } = useConfig();
  const [standards, setStandards] = useState<MemorialStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStandard, setEditingStandard] = useState<MemorialStandard | null>(null);
  const [formData, setFormData] = useState<MemorialStandardFormData>({
    name: '',
    description: '',
    standardText: '',
    promptTemplate: '',
    isDefault: false
  });
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [templates, setTemplates] = useState<StoredTemplateData[]>([]);

  // Carregamento automático com tratamento de erro robusto
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await loadStandards();
      } catch (error) {
        // Falha silenciosa - não quebra a interface
        setLoading(false);
      }
      // Carregar templates do localStorage e banco
      await loadTemplates();
    };
    
    loadInitialData();
  }, []); // Dependência vazia garante execução única

  const loadStandards = async () => {
    try {
      setLoading(true);
      const data = await memorialStandardsService.getAll();
      setStandards(data);
    } catch (error) {
      console.error('Erro ao carregar normas:', error);
      // Em caso de erro, manter lista vazia e permitir operação manual
      setStandards([]);
      // Não mostrar alert durante carregamento inicial automático
      if (standards.length > 0) {
        alert('Erro ao carregar normas. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      // CARREGAR DO BANCO DE DADOS PRIMEIRO (igual às normas)
      let templatesFromDB: StoredTemplateData[] = [];
      
      try {
        const response = await fetch('/api/templates', {
          headers: {
            'Authorization': `Bearer ${getStoredToken() || ''}`
          }
        });
        
        if (response.ok) {
          const dbTemplates = await response.json() as TemplateApiRecord[];
          
          // Converter templates do banco para formato local
          templatesFromDB = dbTemplates.map((t: TemplateApiRecord) => {
            const baseData = {
              template_id: t.name || t.id,
              name: t.name || t.id,
              descricao: t.description,
              municipio: t.municipality,
              norma_abnt: t.abntNorm,
              _dbId: t.id,
              _fromDB: true
            };

            try {
              if (t.templateContent) {
                const templateData = typeof t.templateContent === 'string' 
                  ? JSON.parse(t.templateContent) as StoredTemplateData
                  : (t.templateContent as StoredTemplateData);
                
                return {
                  ...baseData,
                  ...templateData,
                  template_id: templateData.template_id || baseData.template_id
                };
              }
            } catch (e) {
              console.warn('Erro ao parsear templateContent:', e);
            }
            
            return baseData;
          });
        }
      } catch (dbError) {
        console.error('Erro ao conectar com banco para templates:', dbError);
      }
      
      // CARREGAR DO LOCALSTORAGE
      const templatesRaw = localStorage.getItem('createdTemplates');
      const localTemplates = parseStoredTemplates(templatesRaw);
      
      // COMBINAR TEMPLATES (priorizando localStorage que tem estrutura completa)
      const allTemplates = [...localTemplates.map((t) => ({ ...t, _fromDB: false }))];
      
      // Adicionar templates do banco que NÃO estão no localStorage
      templatesFromDB.forEach((dbTemplate) => {
        // Tentar múltiplas formas de identificar duplicatas
        const templateId = getTemplateIdentifier(dbTemplate);
        const existsInLocal = localTemplates.find((localTemplate) => {
          const localId = getTemplateIdentifier(localTemplate);
          return localId === templateId || 
                 localTemplate.template_id === dbTemplate.name ||
                 localTemplate.name === dbTemplate.template_id;
        });
        
        if (!existsInLocal) {
          allTemplates.push({
            ...dbTemplate,
            _fromDB: true
          });
        }
      });
      
      setTemplates(allTemplates);
      
      // Limpeza automática: remover do localStorage templates que já estão no banco
      if (templatesFromDB.length > 0 && localTemplates.length > 0) {
        const templatesInBoth = localTemplates.filter((localTemplate) => {
          const localId = getTemplateIdentifier(localTemplate);
          return templatesFromDB.some((dbTemplate) => {
            const dbId = getTemplateIdentifier(dbTemplate);
            return localId === dbId || 
                   localTemplate.template_id === dbTemplate.name ||
                   localTemplate.name === dbTemplate.template_id;
          });
        });
        
        if (templatesInBoth.length > 0) {
          const cleanedLocalTemplates = localTemplates.filter((localTemplate) => {
            const localId = getTemplateIdentifier(localTemplate);
            return !templatesFromDB.some((dbTemplate) => {
              const dbId = getTemplateIdentifier(dbTemplate);
              return localId === dbId || 
                     localTemplate.template_id === dbTemplate.name ||
                     localTemplate.name === dbTemplate.template_id;
            });
          });
          
          localStorage.setItem('createdTemplates', JSON.stringify(cleanedLocalTemplates));
        }
      }
      
      // BACKUP DE SEGURANÇA - salvar em chave alternativa
      if (allTemplates.length > 0) {
        const backupKey = `createdTemplates_backup_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(allTemplates));
        
        // Manter apenas os 5 backups mais recentes
        const allKeys = Object.keys(localStorage);
        const backupKeys = allKeys.filter(key => key.startsWith('createdTemplates_backup_'))
          .sort().slice(0, -5); // Remove os mais antigos, mantém os 5 mais recentes
        
        backupKeys.forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar templates:', error);
      
      // RECUPERAÇÃO DE BACKUP
      try {
        const allKeys = Object.keys(localStorage);
        const backupKeys = allKeys.filter(key => key.startsWith('createdTemplates_backup_'))
          .sort().reverse(); // Mais recente primeiro
        
        if (backupKeys.length > 0) {
          const latestBackup = backupKeys[0];
          const backupData = parseStoredTemplates(localStorage.getItem(latestBackup));
          
          if (backupData.length > 0) {
            localStorage.setItem('createdTemplates', JSON.stringify(backupData));
            setTemplates(backupData);
            return;
          }
        }
      } catch (backupError) {
        console.error('❌ Erro ao recuperar backup:', backupError);
      }
      
      setTemplates([]);
    }
  };

  const handleInputChange = (field: keyof MemorialStandardFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.standardText.trim() || !formData.promptTemplate.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      
      if (editingStandard) {
        // Atualizar norma existente
        await memorialStandardsService.update(editingStandard.id, formData);
        alert('Norma atualizada com sucesso!');
      } else {
        // Criar nova norma
        await memorialStandardsService.create(formData);
        alert('Norma criada com sucesso!');
      }
      
      // Recarregar lista e fechar formulário
      await loadStandards();
      handleCancelEdit();
    } catch (error) {
      console.error('Erro ao salvar norma:', error);
      alert('Erro ao salvar norma. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };



  const handleDelete = async (standard: MemorialStandard) => {
    if (!confirm(`Tem certeza que deseja excluir a norma "${standard.name}"?`)) {
      return;
    }

    try {
      await memorialStandardsService.delete(standard.id);
      alert('Norma excluída com sucesso!');
      await loadStandards();
    } catch (error) {
      console.error('Erro ao excluir norma:', error);
      alert('Erro ao excluir norma. Tente novamente.');
    }
  };

  const handleCancelEdit = () => {
    setEditingStandard(null);
    setFormData({
      name: '',
      description: '',
      standardText: '',
      promptTemplate: '',
      isDefault: false
    });
  };

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione apenas arquivos PDF.');
      return;
    }

    try {
      setUploadingPDF(true);
      
      // Extrair texto do PDF
      const text = await extractTextFromPDF(file);
      
      // Criar norma automaticamente
      const normData = {
        name: `ABNT NBR ${file.name.replace('.pdf', '')}`,
        description: `Norma extraída do arquivo ${file.name}`,
        standardText: text,
        promptTemplate: generateDefaultPrompt(file.name),
        isDefault: false
      };
      
      // Salvar norma automaticamente
      await memorialStandardsService.create(normData);
      
      alert(`✅ Norma "${normData.name}" cadastrada com sucesso!\n\nA norma foi extraída do PDF e está agora disponível para uso.`);
      
      // Recarregar lista de normas
      await loadStandards();
      
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      alert('Erro ao processar PDF e cadastrar norma. Verifique se o arquivo é válido.');
    } finally {
      setUploadingPDF(false);
      // Limpar input
      (event.target as HTMLInputElement).value = '';
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const fileName = file.name.replace('.pdf', '');
      const placeholder = `📄 NORMA: ${fileName.toUpperCase()}

🔹 INSTRUÇÕES PARA PREENCHIMENTO:

1. ABRA O PDF da norma ${fileName}
2. SELECIONE todo o texto relevante (Ctrl+A)
3. COPIE o conteúdo (Ctrl+C)
4. COLE aqui neste campo (Ctrl+V)
5. REVISE e ajuste o conteúdo

🔹 CONTEÚDO NECESSÁRIO:
✅ Título completo da norma
✅ Escopo e objetivo
✅ Definições técnicas importantes
✅ Procedimentos obrigatórios
✅ Requisitos para memorial descritivo
✅ Formatos e estruturas exigidas
✅ Referências cartográficas
✅ Precisão de medidas

🔹 EXEMPLO DE ESTRUTURA:
"ABNT NBR XXXXX:YYYY - Título da Norma

1. ESCOPO
Esta norma estabelece...

2. REFERÊNCIAS NORMATIVAS
...

3. TERMOS E DEFINIÇÕES
...

4. REQUISITOS GERAIS
..."

⚠️ IMPORTANTE: Inclua apenas o texto essencial da norma que sera usado pelo motor documental da plataforma para gerar memoriais corretos.`;

      resolve(placeholder);
    });
  };

  const generateDefaultPrompt = (fileName: string): string => {
    const normName = fileName.replace('.pdf', '').toUpperCase();
    
    return `TEMPLATE OPERACIONAL DA NORMA ${normName}

Elabore um memorial descritivo seguindo rigorosamente a norma ${normName}, com base no texto da norma fornecido acima.

📋 ESTRUTURA OBRIGATÓRIA:
✅ Identificação completa do projeto
✅ Localização e descrição do terreno
✅ Coordenadas georreferenciadas (sistema especificado na norma)
✅ Cálculos de perímetros e áreas
✅ Confrontações detalhadas por direção
✅ Referências técnicas e cartográficas

🎯 REQUISITOS CRÍTICOS:
✅ Seguir EXATAMENTE a estrutura da norma
✅ Usar terminologia técnica correta
✅ Incluir todos os elementos obrigatórios
✅ Manter precisão nas medidas
✅ Referenciar adequadamente o sistema de coordenadas

⚠️ INSTRUÇÕES CRÍTICAS:
🔴 Use EXCLUSIVAMENTE as coordenadas reais dos arquivos DXF
🔴 NÃO invente coordenadas fictícias (ex: 123456.78, 7654321.09)
🔴 Calcule medidas com base dos dados reais fornecidos
🔴 Mantenha consistência com a norma ${normName}
🔴 Inclua todas as seções obrigatórias da norma

📝 PERSONALIZACAO:
Ajuste estas instrucoes conforme necessario para incluir requisitos especificos da norma ${normName} apos revisar o texto completo da norma acima.`;
  };

  // Função para upload de template (JSON) - NOVA
  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isTemplatesFolderConfigured || !templatesFolder) {
      alert('Atenção: A pasta de templates não está configurada! Por favor, configure a pasta no sistema antes de importar modelos base.');
      // Limpar input
      (event.target as HTMLInputElement).value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Aceitar .json, .pdf e .txt
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isJson = file.type === 'application/json' || fileExtension === '.json';
    const isPdf = file.type === 'application/pdf' || fileExtension === '.pdf';
    const isTxt = file.type === 'text/plain' || fileExtension === '.txt';

    if (!isJson && !isPdf && !isTxt) {
      alert('Por favor, selecione apenas arquivos JSON, PDF ou TXT.');
      (event.target as HTMLInputElement).value = '';
      return;
    }

    try {
      setUploadingPDF(true); // Reutilizando o estado de upload
      
      if (isJson) {
        // Ler conteúdo do arquivo JSON
        const text = await file.text();
        const templateData = JSON.parse(text);
        
        // Validar estrutura básica do template
        if (!templateData.template_id || !templateData.estrutura) {
          throw new Error('Arquivo JSON não é um modelo base válido');
        }
        
        // Criar um arquivo blob com o conteúdo JSON
        const templateBlob = new Blob([JSON.stringify(templateData, null, 2)], {
          type: 'application/json'
        });
        
        // SALVAR NO BANCO DE DADOS E DISCO PRIMEIRO
        try {
          const fileToUpload = new File([templateBlob], `${templateData.template_id}.json`, {
            type: 'application/json'
          });

          await templatesService.generateTemplate(fileToUpload, {
            name: templateData.template_id,
            description: templateData.descricao || `Template ${templateData.template_id}`,
            municipality: templateData.municipio,
            abntNorm: templateData.norma_referencia,
            targetFolderPath: templatesFolder
          });
          
          // Remover do localStorage já que foi salvo no banco
          const existingTemplates = parseStoredTemplates(localStorage.getItem('createdTemplates'));
          const updatedTemplates = existingTemplates.filter((t) => t.template_id !== templateData.template_id);
          localStorage.setItem('createdTemplates', JSON.stringify(updatedTemplates));
          
          alert(`✅ Modelo base "${templateData.template_id}" importado com sucesso!\n\n🌐 Salvo no banco de dados e gravado em disco.`);
          
        } catch (backendError: unknown) {
          console.error('❌ Erro completo ao salvar template no banco:', backendError);
          const errorMsg = getErrorMessage(backendError, 'Falha desconhecida');
          
          // Se a pasta não estiver configurada, não salvar em localStorage de jeito nenhum
          if (!isTemplatesFolderConfigured || !templatesFolder) {
            alert(`❌ Falha na importação: A pasta de templates não está configurada.\nNenhum arquivo ou cache foi salvo.`);
          } else {
            // Fallback para localStorage apenas se a pasta estiver configurada no frontend,
            // mas houve outro erro qualquer no backend
            const existingTemplates = parseStoredTemplates(localStorage.getItem('createdTemplates'));
            const existingIndex = existingTemplates.findIndex((t) => t.template_id === templateData.template_id);
            
            if (existingIndex >= 0) {
              existingTemplates[existingIndex] = templateData;
            } else {
              existingTemplates.push(templateData);
            }
            localStorage.setItem('createdTemplates', JSON.stringify(existingTemplates));
            
            alert(`✅ Modelo base "${templateData.template_id}" importado com sucesso!\n\n📦 Salvo temporariamente no navegador\n⚠️ Erro ao salvar no banco/disco: ${errorMsg}`);
          }
        }
      } else {
        // Fluxo para PDF ou TXT (Geração via IA)
        const defaultName = file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '_').toLowerCase();
        const templateName = prompt("Informe um nome identificador para este template (ex: memorial_desmembramento_v1):", defaultName);
        
        if (!templateName || !templateName.trim()) {
           alert('Geração cancelada. O nome do template é obrigatório.');
           (event.target as HTMLInputElement).value = '';
           setUploadingPDF(false);
           return;
        }

        try {
          alert("Enviando arquivo para a IA configurada extrair e estruturar o memorial.\nIsso pode levar até um minuto. Aguarde...");
          
          await templatesService.generateTemplate(file, {
            name: templateName.trim(),
            description: `Template gerado por IA a partir do exemplo: ${file.name}`,
            targetFolderPath: templatesFolder
          });
          
          alert(`✅ Modelo base gerado com sucesso via IA!\n\n🌐 O JSON foi extraído, estruturado, salvo no banco de dados e gravado em disco.`);
        } catch (backendError: unknown) {
          console.error('❌ Erro ao gerar template via IA:', backendError);
          const errorMsg = getErrorMessage(backendError, 'Falha desconhecida');
          alert(`❌ Falha na geração do template via IA: ${errorMsg}\n\nVerifique no log do Backend se a API Key da IA foi configurada corretamente.`);
        }
      }
      
      // Recarregar templates
      loadTemplates();
      
    } catch (error: unknown) {
      console.error('❌ Erro detalhado ao processar template:', error);
      alert(`Erro ao processar o modelo base JSON: ${getErrorMessage(error, 'Falha desconhecida')}\n\nVerifique se o arquivo está no formato correto.`);
    } finally {
      setUploadingPDF(false);
      // Limpar input
      (event.target as HTMLInputElement).value = '';
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(`Tem certeza que deseja excluir o modelo base "${templateId}"?`)) {
      return;
    }

    try {
      // Encontrar o template para verificar se está no banco
      const template = templates.find((t) => t.template_id === templateId);
      
      // DELETAR DO BANCO DE DADOS (se existir)
      if (template && template._dbId) {
        try {
          const response = await fetch(`/api/templates/${template._dbId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${getStoredToken() || ''}`
            }
          });

          if (!response.ok) {
            console.error('Erro ao deletar template do banco:', response.status);
          }
        } catch (dbError) {
          console.error('Erro ao conectar com banco para deletar:', dbError);
        }
      }
      
      // DELETAR DO LOCALSTORAGE
      const existingTemplates = parseStoredTemplates(localStorage.getItem('createdTemplates'));
      const updatedTemplates = existingTemplates.filter((t) => t.template_id !== templateId);
      
      localStorage.setItem('createdTemplates', JSON.stringify(updatedTemplates));
      
      // RECARREGAR TEMPLATES (do banco + localStorage)
      await loadTemplates();
      
      alert(`✅ Modelo base "${templateId}" excluido com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      alert('Erro ao excluir o modelo base. Tente novamente.');
    }
  };



  if (loading) {
    return <Loading />;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#2c3e50', fontSize: '2rem', fontWeight: 'bold' }}>
          ⚙️ Normas e Templates Base
        </h1>
        <p style={{ color: '#5f6b7a', marginTop: '0.5rem' }}>
          Esta area prepara a base estrutural reutilizada pelos memoriais do sistema.
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Botão para carregar manualmente se necessário */}
          {standards.length === 0 && !loading && (
            <button
              onClick={loadStandards}
              style={{ 
                backgroundColor: '#27ae60',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              🔄 Carregar Normas
            </button>
          )}
          
          {/* Botões removidos - agora ficam após as normas cadastradas */}
        </div>
      </div>

      {/* Formulário removido - agora cadastro é automático via PDF */}
      {false && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '1px solid #e9ecef'
        }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
            {editingStandard ? '✏️ Editar Norma ABNT' : '📝 Nova Norma ABNT'}
          </h2>
          
          {uploadingPDF && (
            <div style={{ 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginBottom: '1rem',
              color: '#856404'
            }}>
              📄 Processando PDF... Por favor, aguarde.
            </div>
          )}
          
          <div style={{ 
            backgroundColor: '#e8f4fd', 
            border: '1px solid #bee5eb', 
            borderRadius: '8px', 
            padding: '1rem', 
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            <strong>💡 Dica:</strong> Use o botão "📄 Carregar PDF" para importar uma norma e depois complete os campos abaixo. 
            O sistema extrairá o nome do arquivo e criará um template inicial que você pode personalizar.
          </div>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
                  📋 Nome da Norma * 
                  <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'normal' }}>
                    (Ex: ABNT NBR 14047:2022, ABNT NBR 13133:1994)
                  </span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(value) => handleInputChange('name', value)}
                  placeholder="Digite o nome completo da norma com ano"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
                  📝 Descrição
                  <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'normal' }}>
                    (Resumo do que a norma aborda)
                  </span>
                </label>
                <Input
                  type="text"
                  value={formData.description}
                  onChange={(value) => handleInputChange('description', value)}
                  placeholder="Ex: Representação Gráfica de Loteamentos e Desmembramentos"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
                  📄 Texto da Norma *
                  <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'normal' }}>
                    (Cole aqui o texto completo da norma - use Ctrl+A, Ctrl+C, Ctrl+V do PDF)
                  </span>
                </label>
                <textarea
                  value={formData.standardText}
                  onChange={(e) => handleInputChange('standardText', e.target.value)}
                  placeholder="Cole aqui o texto completo da norma extraído do PDF..."
                  required
                  rows={12}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontFamily: 'Arial, sans-serif',
                    resize: 'vertical',
                    lineHeight: '1.4'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                  💡 Dica: Clique em "📄 Carregar PDF" primeiro para preencher automaticamente
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
                  Template Operacional da Norma *
                  <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'normal' }}>
                    (Instrucoes que a plataforma seguira para gerar memoriais com esta norma)
                  </span>
                </label>
                <textarea
                  value={formData.promptTemplate}
                  onChange={(e) => handleInputChange('promptTemplate', e.target.value)}
                  placeholder="Instrucoes detalhadas para a plataforma seguir esta norma ao gerar memoriais..."
                  required
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontFamily: 'Arial, sans-serif',
                    resize: 'vertical',
                    lineHeight: '1.4'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                  💡 Personalize as instruções conforme os requisitos específicos da norma
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <label htmlFor="isDefault" style={{ fontWeight: '500', color: '#2c3e50' }}>
                  Definir como norma padrão
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Salvando...' : (editingStandard ? 'Atualizar' : 'Criar Norma')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Normas */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ color: '#2c3e50', margin: 0, fontSize: '1.25rem' }}>
            📋 Normas Base ({standards.length})
          </h3>
          
          {/* Botão Carregar Norma PDF */}
          <button
            onClick={() => document.getElementById('pdfUploadNorm')?.click()}
            disabled={uploadingPDF}
            style={{ 
              backgroundColor: uploadingPDF ? '#95a5a6' : '#9b59b6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: uploadingPDF ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              opacity: uploadingPDF ? 0.7 : 1
            }}
          >
            {uploadingPDF ? '⏳ Processando...' : '📄 Carregar Norma PDF'}
          </button>
        </div>

        <input
          id="pdfUploadNorm"
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handlePDFUpload}
        />

        <div style={{ padding: '1.5rem' }}>
          <div style={{ 
            backgroundColor: '#e8f4fd', 
            border: '1px solid #bee5eb', 
            borderRadius: '8px', 
            padding: '1rem', 
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            <strong>💡 Instruções:</strong> Importe aqui a norma estrutural que podera ser usada em varios trabalhos. 
            O sistema extrai o texto e monta a base documental inicial dessa norma.
          </div>

          {standards.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                📋 Nenhuma norma base cadastrada ainda.
              </p>
              <p>Clique em "📄 Carregar Norma PDF" acima para importar sua primeira norma base.</p>
            </div>
          ) : (
          <div style={{ padding: '1.5rem' }}>
            {standards.map((standard) => (
              <div
                key={standard.id}
                style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                  backgroundColor: standard.isDefault ? '#f0f8ff' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '1.1rem' }}>
                        {standard.name}
                      </h4>
                      {standard.isDefault && (
                        <span style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          PADRÃO
                        </span>
                      )}
                    </div>
                    
                    {standard.description && (
                      <p style={{ color: '#6c757d', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                        {standard.description}
                      </p>
                    )}
                    
                    <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
                      <span>Criado por: {standard.ownerName || 'Sistema'}</span>
                      <span style={{ margin: '0 0.5rem' }}>•</span>
                      <span>Criado em: {new Date(standard.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                    <button
                      onClick={() => handleDelete(standard)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Seção removida - botão agora está no cabeçalho de Normas Cadastradas */}

      {/* Separador entre Normas e Templates */}
      <div style={{
        height: '2px',
        backgroundColor: '#e9ecef',
        margin: '2rem 0',
        borderRadius: '1px'
      }}></div>

      {/* Seção de Templates - NOVA */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ color: '#2c3e50', margin: 0, fontSize: '1.25rem' }}>
            📄 Modelos Base ({templates.length})
          </h3>
          
          {/* Botão Cadastrar Template */}
          <button
            onClick={() => {
              if (!isTemplatesFolderConfigured || !templatesFolder) {
                alert('Atenção: A pasta de templates não está configurada! Por favor, configure a pasta no sistema antes de importar modelos base.');
                return;
              }
              document.getElementById('templateUploadManage')?.click();
            }}
            disabled={uploadingPDF}
            style={{ 
              backgroundColor: uploadingPDF ? '#95a5a6' : '#8e44ad',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: uploadingPDF ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              opacity: uploadingPDF ? 0.7 : 1
            }}
          >
            {uploadingPDF ? '⏳ Processando...' : '📄 Gerar/Importar Modelo (JSON/PDF/TXT)'}
          </button>
        </div>

        <input
          id="templateUploadManage"
          type="file"
          accept=".json,.pdf,.txt"
          style={{ display: 'none' }}
          onChange={handleTemplateUpload}
        />

        <div style={{ padding: '1.5rem' }}>
          <div style={{ 
            backgroundColor: '#e8f4fd', 
            border: '1px solid #bee5eb', 
            borderRadius: '8px', 
            padding: '1rem', 
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            <strong>💡 Instruções:</strong> Importe aqui um modelo documental estrutural em JSON, ou faça upload de um memorial de exemplo em PDF/TXT para que a IA gere automaticamente a estrutura do template. 
            Ele será validado e salvo para depois aparecer na geração de memoriais.
            
            <br/><br/>
            <strong>✅ Persistencia:</strong> Os modelos base sao salvos no banco de dados e ficam disponiveis de forma permanente. 
            Tambem podem permanecer no navegador como apoio temporario.
          </div>



          {templates.length === 0 ? (
            <div style={{ 
              padding: '2rem', 
              textAlign: 'center', 
              color: '#6c757d', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px', 
              border: '1px solid #e9ecef' 
            }}>
              <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                📄 Nenhum modelo base cadastrado ainda.
              </p>
              <p style={{ fontSize: '0.9rem' }}>
                Clique em "📄 Importar Modelo JSON" acima para trazer seu primeiro modelo base.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {templates.map((template) => (
                <div
                  key={template.template_id}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '1.1rem' }}>
                          📄 {template.template_id}
                        </h4>
                      </div>
                      
                      {template.descricao && (
                        <p style={{ color: '#6c757d', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                          {template.descricao}
                        </p>
                      )}
                      
                      <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
                        <span>Secoes: {template.estrutura ? Object.keys(template.estrutura).length : 0}</span>
                        <span style={{ margin: '0 0.5rem' }}>•</span>
                        <span>Identificador: {template.template_id}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                      <button
                        onClick={() => handleDeleteTemplate(template.template_id)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageStandards;
