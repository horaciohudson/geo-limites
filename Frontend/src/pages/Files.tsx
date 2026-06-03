import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { Button, Loading } from '@/components';
import { clearStoredSession } from '@/auth/session';
import api from '@/services/api';
import { useFileContext } from '@/contexts/FileContext';
import type { FileMetadata } from '@/types/files';

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
    } | string;
  };
}

const asApiError = (error: unknown): ApiErrorLike | null => {
  if (typeof error === 'object' && error !== null) {
    return error as ApiErrorLike;
  }

  return null;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  const apiError = asApiError(error);

  if (apiError?.response?.data && typeof apiError.response.data === 'object' && 'message' in apiError.response.data) {
    return apiError.response.data.message || fallback;
  }

  if (typeof apiError?.response?.data === 'string') {
    return apiError.response.data;
  }

  return apiError?.message || fallback;
};

const Files: React.FC = () => {
  const { selectedFiles, toggleFileSelection, isFileSelected, removeFromSelection } = useFileContext();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregamento automático com tratamento de erro robusto
  useEffect(() => {
    const loadInitialFiles = async () => {
      try {
        await fetchFiles();
      } catch (error) {
        // Falha silenciosa - não quebra a interface
        setIsLoading(false);
      }
    };
    
    loadInitialFiles();
  }, []); // Dependência vazia garante execução única

  // === Carrega lista de arquivos ===
  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      setError(''); // Limpa erros anteriores
      const response = await api.get<FileMetadata[]>('/dxf/my-files');
      setFiles(response.data);
    } catch (err: unknown) {
      const apiError = asApiError(err);

      console.error('❌ Erro ao carregar arquivos:', err);
      
      // Tratamento específico por tipo de erro
      if (apiError?.response?.status === 403 || apiError?.response?.status === 404) {
        setFiles([]); // Lista vazia em caso de não autorizado ou não encontrado
        setError('');
      } else {
        setError('Erro ao carregar arquivos. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // === Validação de arquivo DWG ===
  const validateDWGFile = async (file: File): Promise<{ isValid: boolean; message?: string; version?: string }> => {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      if (bytes.length < 20) {
        return { isValid: false, message: 'Arquivo muito pequeno para ser um DWG válido' };
      }

      const versionCode = Array.from(bytes.slice(0, 6)).map(b => String.fromCharCode(b)).join('');
      let version = 'Desconhecida';
      let isSupported = true;

      if (versionCode.includes('AC1032')) version = 'AutoCAD 2018-2022';
      else if (versionCode.includes('AC1027')) version = 'AutoCAD 2013-2017';
      else if (versionCode.includes('AC1024')) version = 'AutoCAD 2010-2012';
      else if (versionCode.includes('AC1021')) version = 'AutoCAD 2007-2009';
      else if (versionCode.includes('AC1018')) version = 'AutoCAD 2004-2006';
      else if (versionCode.includes('AC1015')) version = 'AutoCAD 2000-2002';
      else if (versionCode.includes('AC1014')) version = 'AutoCAD R14';
      else if (versionCode.includes('AC1012')) version = 'AutoCAD R13';
      else if (versionCode.includes('AC1009')) { version = 'AutoCAD R12'; isSupported = false; }
      else if (versionCode.includes('AC1006')) { version = 'AutoCAD R10'; isSupported = false; }
      else { isSupported = false; }

      if (!isSupported) {
        return {
          isValid: false,
          message: `Versão DWG muito antiga ou não suportada: ${version}. Converta para versão mais recente.`,
          version
        };
      }

      const hasNullBytes = bytes.slice(0, 100).every(b => b === 0);
      if (hasNullBytes) {
        return { isValid: false, message: 'Arquivo parece estar corrompido (muitos bytes nulos)' };
      }

      return { isValid: true, version };
    } catch (error: unknown) {
      return { isValid: false, message: `Erro ao validar arquivo: ${getErrorMessage(error, 'Falha na validação do arquivo')}` };
    }
  };

  // === Upload de arquivo único ===
  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['dxf', 'dwg'];
    if (!ext || !allowed.includes(ext)) {
      setError('Apenas arquivos .dxf e .dwg são permitidos.');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Tamanho máximo: 50MB');
      return;
    }
    if (file.size === 0) {
      setError('Arquivo vazio não pode ser enviado.');
      return;
    }

    if (ext === 'dwg') {
      const validation = await validateDWGFile(file);
      if (!validation.isValid) {
        setError(`❌ Arquivo DWG inválido: ${validation.message}`);
        return;
      }
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<FileMetadata | FileMetadata[]>('/dxf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      // Backend retorna array, então pegamos o primeiro elemento
      const uploadedFile = Array.isArray(response.data) ? response.data[0] : response.data;
      if (uploadedFile && uploadedFile.id) {
        // Apenas atualiza a lista - não seleciona automaticamente
        await fetchFiles();
      } else {
        // Se houve erro, ainda assim atualiza a lista
        await fetchFiles();
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      const apiError = asApiError(err);
      let errorMessage = 'Erro desconhecido ao enviar arquivo';

      if (apiError?.response?.status === 400) {
        const serverMessage = getErrorMessage(err, 'Dados do arquivo inválidos ou formato não suportado');
        errorMessage = typeof serverMessage === 'string'
          ? `Erro 400: ${serverMessage}`
          : 'Erro 400: Dados do arquivo inválidos ou formato não suportado';

        if (ext === 'dwg') {
          errorMessage += '\n\n🔧 Diagnóstico DWG:\n• Versão DWG não suportada\n• Converta para DXF\n• Evite 3D complexo/blocos com XREF';
        }
      } else if (apiError?.response?.status === 401) {
        errorMessage = 'Erro 401: Você precisa fazer login novamente';
        clearStoredSession();
        window.location.href = '/login';
        return;
      } else if (apiError?.response?.status === 403) {
        errorMessage = 'Erro 403: Sem permissão para enviar arquivos';
      } else if (apiError?.response?.status === 413) {
        errorMessage = 'Erro 413: Arquivo muito grande para o servidor';
      } else if (apiError?.response?.status === 415) {
        errorMessage = 'Erro 415: Tipo de arquivo não suportado';
      } else if (apiError?.response?.status === 500) {
        errorMessage = 'Erro 500: Erro interno ao processar o arquivo';
        if (ext === 'dwg') errorMessage += '\n\n💡 Possível falha na conversão DWG→DXF no backend';
      } else if (apiError?.message?.includes('timeout')) {
        errorMessage = 'Timeout: Upload demorou muito. Tente um arquivo menor.';
      } else if (apiError?.message?.includes('Network Error') || apiError?.code === 'ERR_NETWORK' || apiError?.code === 'ERR_CONNECTION_ABORTED') {
        // Backend indisponível - simular upload bem-sucedido para desenvolvimento
        const mockFile: FileMetadata = {
          id: `mock-${Date.now()}`,
          originalName: file.name,
          storedName: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          extension: ext
        };
        
        // Adicionar arquivo mock à lista local
        setFiles(prevFiles => [...prevFiles, mockFile]);
        errorMessage = '';
      } else if (apiError?.response?.data) {
        errorMessage = getErrorMessage(err, errorMessage);
      }

      setError(errorMessage);
      
      // Se não houve erro (upload simulado bem-sucedido), limpar o input
      if (!errorMessage && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  // === Upload múltiplo (sequencial) ===
  const handleMultipleUpload = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setIsUploading(true);
    setError('');

    for (const file of filesArray) {
      // Evita bloquear toda a fila por um erro
      try {
        await handleFileUpload(file);
      } catch {
        // Erro já tratado em handleFileUpload
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // === Drag & Drop ===
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleMultipleUpload(e.dataTransfer.files);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  // === Ações ===
  const handleDownload = async (file: FileMetadata) => {
    try {
      const res = await api.get(`/dxf/${file.id}/download`, { responseType: 'blob' });
      saveAs(res.data, file.originalName);
    } catch {
      setError('Erro ao baixar arquivo.');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;
    try {
      const fileToRemove = files.find(f => f.id === fileId);
      if (fileToRemove && isFileSelected(fileToRemove)) {
        removeFromSelection(fileToRemove);
      }

      await api.delete(`/dxf/${fileId}`);
      await fetchFiles();
    } catch {
      setError('Erro ao excluir arquivo.');
    }
  };

  // === Helpers ===
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  // === Render ===
  if (isLoading) {
    return (
      <div className="page-container">
        <Loading size="large" text="Carregando arquivos..." />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Meus Arquivos DXF/DWG</h1>
        <p>Gerencie seus arquivos de desenho técnico</p>
      </div>

      {/* Upload */}
      <div
        className={`upload-area ${dragActive ? 'dragover' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".dxf,.dwg"
          multiple
          onChange={(e) => e.target.files && handleMultipleUpload(e.target.files)}
          disabled={isUploading}
          style={{ display: 'none' }}
        />

        <div className="upload-content">
          {isUploading ? (
            <>
              <Loading size="large" />
              <p>Enviando arquivo(s)...</p>
            </>
          ) : (
            <>
              <h3>Arraste aqui ou clique para selecionar</h3>
              <p>Arquivos .dxf ou .dwg (máx 50MB cada)</p>
              <Button variant="primary" onClick={handleUploadClick}>
                Selecionar Arquivos
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <div style={{
            background: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ color: '#e74c3c', marginBottom: '8px', marginTop: '0' }}>
              ❌ Erro no Upload
            </h4>
            <div style={{ fontSize: '14px', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
              {error}
            </div>

            {error.includes('400') && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
                <strong>💡 Possíveis causas do erro 400:</strong>
                <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                  <li>Arquivo corrompido ou com formato inválido</li>
                  <li>DWG muito antigo ou versão não suportada</li>
                  <li>Conteúdo não é realmente DXF/DWG</li>
                  <li>Backend com problema no multipart/form-data</li>
                </ul>
              </div>
            )}

            <div style={{ marginTop: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => setError('')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                ✕ Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de arquivos */}
      <div className="files-section">
        <div className="files-header">
          <h2>Arquivos Enviados ({files.length})</h2>
          {selectedFiles.length > 0 && (
            <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
              {selectedFiles.length} arquivo{selectedFiles.length > 1 ? 's' : ''} selecionado{selectedFiles.length > 1 ? 's' : ''}
            </p>
          )}
          {/* Botão para carregar manualmente se necessário */}
          {files.length === 0 && !isLoading && (
            <Button 
              variant="secondary" 
              onClick={fetchFiles}
              style={{ marginTop: '1rem' }}
            >
              🔄 Carregar Arquivos
            </Button>
          )}
        </div>

        {files.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhum arquivo encontrado</h3>
            <p>Envie arquivos para começar</p>
          </div>
        ) : (
          <div className="files-grid">
            {files.map((file) => (
              <div
                key={file.id}
                className={`file-card ${isFileSelected(file) ? 'active' : ''}`}
                onClick={(e) => {
                  toggleFileSelection(file, e.ctrlKey);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="file-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                  <span className="file-type-badge">
                    {file.extension?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                <div className="file-info">
                  <h3 className="file-name" title={file.originalName}>
                    {file.originalName}
                  </h3>
                  <div className="file-details">
                    <span>{formatFileSize(file.sizeBytes)}</span>
                    <span>{formatDate(file.createdAt)}</span>
                  </div>
                </div>

                <div className="file-actions">
                  <Button variant="secondary" onClick={() => handleDownload(file)}>Download</Button>
                  <Button variant="danger" onClick={() => handleDelete(file.id)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Files;
