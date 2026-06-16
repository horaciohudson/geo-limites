import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Folder, Eye, Loader } from 'lucide-react';
import { Button, Input } from '../components';

import './UploadExample.css';

interface UploadedExample {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  memorialStandardId: string;
  memorialStandardName: string;
  municipality?: string;
  uploadDate: string;
  fileSize: number;
}

interface ErrorLike {
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

const UploadExample: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  
  // Estados para upload
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para exemplos existentes
  const [uploadedExamples, setUploadedExamples] = useState<UploadedExample[]>([]);
  const [loadingExamples, setLoadingExamples] = useState(true);



  // Carregar exemplos já enviados
  useEffect(() => {
    const loadUploadedExamples = async () => {
      try {
        setLoadingExamples(true);
        // Simular dados de exemplos (substituir por API real)
        const examples: UploadedExample[] = JSON.parse(
          localStorage.getItem('uploadedExamples') || '[]'
        );
        setUploadedExamples(examples);
      } catch (error) {
        console.error('Erro ao carregar exemplos:', error);
      } finally {
        setLoadingExamples(false);
      }
    };

    loadUploadedExamples();
  }, []);

  const handleFileNameChange = (value: string) => {
    setFileName(value);
  };

  const processSelectedFile = (file?: File) => {
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Apenas arquivos PDF, DOC e DOCX são permitidos');
        return;
      }

      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Arquivo muito grande. Máximo 10MB');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    processSelectedFile(event.dataTransfer.files[0]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('Selecione um arquivo de exemplo');
      return;
    }

    const displayName = fileName.trim() || selectedFile.name;

    setUploading(true);
    setError(null);

    try {
      // Simular upload (substituir por API real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newExample: UploadedExample = {
        id: Date.now().toString(),
        name: displayName,
        fileName: selectedFile.name,
        filePath: `/uploads/examples/${selectedFile.name}`,
        memorialStandardId: 'general',
        memorialStandardName: 'Exemplo Geral',
        uploadDate: new Date().toISOString(),
        fileSize: selectedFile.size
      };

      // Salvar no localStorage (substituir por API real)
      const currentExamples = JSON.parse(localStorage.getItem('uploadedExamples') || '[]');
      const updatedExamples = [...currentExamples, newExample];
      localStorage.setItem('uploadedExamples', JSON.stringify(updatedExamples));
      
      setUploadedExamples(updatedExamples);
      setUploadSuccess(true);
      
      // Reset form
      setFileName('');
      setSelectedFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err: unknown) {
      console.error('Erro ao enviar exemplo:', err);
      setError(getErrorMessage(err, 'Erro ao enviar arquivo de exemplo'));
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFile = (filePath: string) => {
    // Simular abertura de arquivo
    alert(`Abrindo arquivo: ${filePath}\\n\\nEm um sistema real, isso abriria o arquivo no visualizador padrão.`);
  };

  const deleteExample = (exampleId: string) => {
    if (!confirm('Tem certeza que deseja deletar este exemplo?')) return;

    const updatedExamples = uploadedExamples.filter(ex => ex.id !== exampleId);
    setUploadedExamples(updatedExamples);
    localStorage.setItem('uploadedExamples', JSON.stringify(updatedExamples));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="upload-example-container">
      <div className="upload-example-wrapper">
        <div className="upload-example-card">
          {/* Header */}
          <div className="upload-example-header">
            <div className="upload-example-header-content">
              <div className="upload-example-icon-wrapper">
                <Upload className="upload-example-icon" />
              </div>
              <div>
                <h1 className="upload-example-title">
                  📤 Upload de Exemplo
                </h1>
                <p className="upload-example-subtitle">
                  Envie arquivos de exemplo (memoriais, documentos) para referência futura
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {uploadSuccess && (
            <div className="success-message">
              <div className="success-message-content">
                <CheckCircle className="success-icon" />
                <span className="success-title">
                  Exemplo enviado com sucesso!
                </span>
              </div>
              <p className="success-text">
                O arquivo foi salvo e está disponível para criar templates.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <div className="error-message-content">
                <AlertCircle className="error-icon" />
                <span className="error-title">Erro</span>
              </div>
              <p className="error-text">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="upload-example-form">
            {/* File Upload Area */}
            <div 
              className="file-upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="file-upload-content">
                {selectedFile ? (
                  <div className="file-selected">
                    <FileText className="file-icon" />
                    <div className="file-info">
                      <p className="file-name">{selectedFile.name}</p>
                      <p className="file-size">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="remove-file-btn"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="file-upload-prompt">
                    <Upload className="upload-icon" />
                    <p className="upload-text">
                      Arraste um arquivo aqui ou clique para selecionar
                    </p>
                    <p className="upload-hint">
                      Formatos aceitos: PDF, DOC, DOCX (máx. 10MB)
                    </p>
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="file-input"
              />
            </div>

            {/* Form Fields */}
            <div className="form-fields">
              <div className="form-group">
                <label htmlFor="fileName" className="form-label">
                  Nome do Arquivo (Opcional)
                </label>
                <Input
                  id="fileName"
                  type="text"
                  value={fileName}
                  onChange={handleFileNameChange}
                  placeholder="Deixe vazio para usar o nome original do arquivo"
                  className="form-input"
                />
                <p className="form-help-text">
                  💡 Se não informar, será usado o nome original do arquivo
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <Button
                type="submit"
                disabled={uploading || !selectedFile}
                className="submit-button"
              >
                {uploading ? (
                  <>
                    <Loader className="button-icon spinning" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="button-icon" />
                    Enviar Exemplo
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Exemplos Enviados */}
          <div className="uploaded-examples-section">
            <h2 className="section-title">
              📁 Exemplos Enviados ({uploadedExamples.length})
            </h2>
            
            {loadingExamples ? (
              <div className="loading-examples">
                <Loader className="loading-icon" />
                <span>Carregando exemplos...</span>
              </div>
            ) : uploadedExamples.length === 0 ? (
              <div className="no-examples">
                <Folder className="no-examples-icon" />
                <p className="no-examples-text">
                  Nenhum exemplo enviado ainda
                </p>
                <p className="no-examples-hint">
                  Envie seu primeiro exemplo usando o formulário acima
                </p>
              </div>
            ) : (
              <div className="examples-list">
                {uploadedExamples.map((example) => (
                  <div key={example.id} className="example-item">
                    <div className="example-info">
                      <div className="example-header">
                        <h3 className="example-name">{example.name}</h3>
                        <span className="example-date">
                          {formatDate(example.uploadDate)}
                        </span>
                      </div>
                      <div className="example-details">
                        <p className="example-file">
                          📄 {example.fileName} ({formatFileSize(example.fileSize)})
                        </p>
                        <p className="example-standard">
                          ⚙️ {example.memorialStandardName}
                        </p>
                        {example.municipality && (
                          <p className="example-municipality">
                            🏛️ {example.municipality}
                          </p>
                        )}
                        <p className="example-path">
                          📂 {example.filePath}
                        </p>
                      </div>
                    </div>
                    <div className="example-actions">
                      <Button
                        onClick={() => openFile(example.filePath)}
                        className="action-button view-button"
                        title="Abrir arquivo"
                      >
                        <Eye className="action-icon" />
                        Abrir
                      </Button>
                      <Button
                        onClick={() => deleteExample(example.id)}
                        className="action-button delete-button"
                        title="Deletar exemplo"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadExample;
