import React, { useRef } from 'react';
import type { PropertyFormFile } from '@/types/property';

interface PropertyFilesProps {
  files: PropertyFormFile[];
  validation: Record<string, string>;
  onChange: (files: PropertyFormFile[]) => void;
  importStatusText?: string;
}

const PropertyFiles: React.FC<PropertyFilesProps> = ({ files, validation: _validation, onChange, importStatusText }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTechnicalFile = (fileName: string): boolean => {
    const normalized = fileName.toLowerCase();
    return normalized.endsWith('.dxf') || normalized.endsWith('.dwg');
  };

  const normalizePrimaryTechnicalSelection = (nextFiles: PropertyFormFile[]): PropertyFormFile[] => {
    const technicalIndexes = nextFiles.reduce<number[]>((indexes, file, index) => {
      if (isTechnicalFile(file.name)) {
        indexes.push(index);
      }
      return indexes;
    }, []);

    if (technicalIndexes.length === 0) {
      return nextFiles.map((file) => ({
        ...file,
        primaryTechnical: false
      }));
    }

    const explicitPrimaryIndex = technicalIndexes.find((index) => nextFiles[index].primaryTechnical);
    const primaryIndex = explicitPrimaryIndex ?? technicalIndexes[0];

    return nextFiles.map((file, index) => ({
      ...file,
      primaryTechnical: isTechnicalFile(file.name) ? index === primaryIndex : false
    }));
  };
  
  // Verificar se files é um array válido e filtrar objetos File corrompidos
  const safeFiles = React.useMemo(() => {
    try {
      if (!Array.isArray(files)) return [];
      
      return files.filter(file => {
        // Verificar se é um objeto File válido
        return file && 
               typeof file === 'object' && 
               typeof file.name === 'string' && 
               typeof file.size === 'number';
      });
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      return [];
    }
  }, [files]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Filtrar apenas arquivos permitidos
    const allowedTypes = [
      'application/dxf',
      'application/dwg', 
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const validFiles = selectedFiles.filter(file => {
      const isValidType = allowedTypes.includes(file.type) || 
                         file.name.toLowerCase().endsWith('.dxf') ||
                         file.name.toLowerCase().endsWith('.dwg');
      
      if (!isValidType) {
        alert(`Arquivo ${file.name} não é um tipo permitido.`);
        return false;
      }
      
      // Limite de 50MB por arquivo
      if (file.size > 50 * 1024 * 1024) {
        alert(`Arquivo ${file.name} é muito grande (máximo 50MB).`);
        return false;
      }
      
      return true;
    });
    
    const preparedFiles: PropertyFormFile[] = validFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      rawFile: file
    }));

    onChange(normalizePrimaryTechnicalSelection([...safeFiles, ...preparedFiles]));
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = safeFiles.filter((_, i) => i !== index);
    onChange(normalizePrimaryTechnicalSelection(updatedFiles));
  };

  const setPrimaryTechnicalFile = (index: number) => {
    const updatedFiles = normalizePrimaryTechnicalSelection(
      safeFiles.map((file, currentIndex) => ({
        ...file,
        primaryTechnical: currentIndex === index
      }))
    );
    onChange(updatedFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'dxf':
      case 'dwg':
        return '📐';
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      default:
        return '📁';
    }
  };

  const getFileTypeLabel = (fileName: string): string => {
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'dxf':
        return 'Arquivo DXF';
      case 'dwg':
        return 'Arquivo DWG';
      case 'pdf':
        return 'Documento PDF';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'Imagem';
      case 'doc':
      case 'docx':
        return 'Documento Word';
      default:
        return 'Arquivo';
    }
  };

  // Wrapper de erro para evitar página branca
  try {
    return (
      <div className="property-files">
      <div className="files-section-header">
        <h2>🗂️ Arquivos Tecnicos do Imovel</h2>
        <p className="section-description">
          Adicione aqui o DXF principal e os demais arquivos vinculados ao cadastro.
        </p>
        {importStatusText && (
          <p className="file-import-status">
            {importStatusText}
          </p>
        )}
      </div>

      {/* Área de Upload */}
      <div className="upload-area">
        <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <h3>Adicionar arquivos tecnicos</h3>
            <p>Clique ou arraste aqui</p>
            <div className="file-types">
              <div className="type-tags">
                <span className="type-tag">📐 DXF/DWG</span>
                <span className="type-tag">📄 PDF</span>
                <span className="type-tag">🖼️ Imagem</span>
                <span className="type-tag">📝 Documento</span>
              </div>
            </div>
            <p className="size-limit">Maximo 50MB por arquivo</p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".dxf,.dwg,.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Lista de Arquivos */}
      {safeFiles.length > 0 && (
        <div className="files-list">
          <h3>📋 Arquivos Vinculados ({safeFiles.length})</h3>
          
          <div className="files-grid">
            {safeFiles.map((file, index) => (
              <div key={index} className="file-card">
                <div className="file-info">
                  <div className="file-header">
                    <span className="file-icon">{getFileIcon(file.name)}</span>
                    <div className="file-details">
                      <h4 className="file-name" title={file.name}>
                        {file.name.length > 30 
                          ? `${file.name.substring(0, 30)}...` 
                          : file.name
                        }
                      </h4>
                      <p className="file-type">{getFileTypeLabel(file.name)}</p>
                      {isTechnicalFile(file.name) && file.primaryTechnical && (
                        <p
                          className="file-type"
                          style={{ color: '#2563eb', fontWeight: 700 }}
                        >
                          DXF principal
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="file-meta">
                    <span className="file-size">{formatFileSize(file.size || 0)}</span>
                    <span className="file-date">
                      {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'Data não disponível'}
                    </span>
                  </div>
                </div>
                
                <div className="file-actions">
                  {isTechnicalFile(file.name) && !file.primaryTechnical && (
                    <button
                      onClick={() => setPrimaryTechnicalFile(index)}
                      className="btn-secondary"
                      type="button"
                      title="Definir como DXF principal"
                      style={{ marginRight: '0.5rem' }}
                    >
                      Principal
                    </button>
                  )}
                  <button 
                    onClick={() => removeFile(index)}
                    className="btn-remove"
                    title="Remover arquivo"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo dos Arquivos */}
      {safeFiles.length > 0 && (
        <div className="files-summary">
          <h4>📊 Resumo dos Arquivos</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Total</span>
              <span className="value">{safeFiles.length}</span>
            </div>
            <div className="summary-item">
              <span className="label">Tamanho</span>
              <span className="value">
                {formatFileSize(safeFiles.reduce((total, file) => total + (file.size || 0), 0))}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">DXF/DWG</span>
              <span className="value">
                {safeFiles.filter(f => 
                  f.name && isTechnicalFile(f.name)
                ).length}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Principal</span>
              <span className="value value-text" title={safeFiles.find((file) => isTechnicalFile(file.name) && file.primaryTechnical)?.name || 'Nao definido'}>
                {safeFiles.find((file) => isTechnicalFile(file.name) && file.primaryTechnical)?.name || 'Nao definido'}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Outros</span>
              <span className="value">
                {safeFiles.filter(f => 
                  f.name && !isTechnicalFile(f.name)
                ).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {safeFiles.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>Nenhum arquivo tecnico adicionado</h3>
          <p>Envie o DXF principal e os arquivos de apoio do cadastro.</p>
        </div>
      )}
      </div>
    );
  } catch (error) {
    console.error('Erro no componente PropertyFiles:', error);
    return (
      <div className="property-files">
        <div className="error-state">
          <h2>⚠️ Erro ao carregar arquivos</h2>
          <p>Ocorreu um erro ao carregar os arquivos salvos.</p>
          <button 
            onClick={() => onChange([])}
            className="btn-reset"
          >
            🔄 Limpar arquivos e tentar novamente
          </button>
        </div>
      </div>
    );
  }
};

export default PropertyFiles;
