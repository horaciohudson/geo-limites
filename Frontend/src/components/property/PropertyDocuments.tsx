import React, { useState } from 'react';
import type { PropertyDocument } from '@/types/property';

type PropertyDocumentDraft = Omit<PropertyDocument, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>;

interface PropertyDocumentsProps {
  documents: PropertyDocumentDraft[];
  validation: Record<string, string>;
  onChange: (documents: PropertyDocumentDraft[]) => void;
}

const PropertyDocuments: React.FC<PropertyDocumentsProps> = ({ documents, onChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newDocument, setNewDocument] = useState<PropertyDocumentDraft>({
    documentType: 'DEED',
    documentNumber: '',
    issueDate: '',
    issuer: '',
    active: true
  });

  const addDocument = () => {
    if (newDocument.documentNumber && newDocument.issueDate && newDocument.issuer) {
      onChange([...documents, newDocument]);
      setNewDocument({
        documentType: 'DEED',
        documentNumber: '',
        issueDate: '',
        issuer: '',
        active: true
      });
      setShowAddForm(false);
    } else {
      alert('Preencha todos os campos obrigatórios.');
    }
  };

  const removeDocument = (index: number) => {
    const updatedDocuments = documents.filter((_, i) => i !== index);
    onChange(updatedDocuments);
  };

  const documentTypeLabels = {
    'DEED': '📜 Escritura',
    'REGISTRATION': '📋 Matrícula',
    'CERTIFICATE': '📄 Certidão',
    'LICENSE': '📝 Licença',
    'OTHER': '📁 Outro'
  };

  return (
    <div className="property-documents">
      <div className="section-header">
        <h2>📄 Documentos da Propriedade</h2>
        <p className="section-description">
          Adicione documentos relacionados à propriedade como escrituras, matrículas, certidões, etc.
        </p>
      </div>

      {/* Lista de Documentos */}
      <div className="documents-list">
        {documents.map((doc, index) => (
          <div key={index} className="document-card">
            <div className="document-info">
              <h4>{documentTypeLabels[doc.documentType]} - {doc.documentNumber}</h4>
              <div className="document-details">
                <p><strong>Emissor:</strong> {doc.issuer}</p>
                <p><strong>Data de Emissão:</strong> {new Date(doc.issueDate).toLocaleDateString()}</p>
                {doc.expiryDate && (
                  <p><strong>Validade:</strong> {new Date(doc.expiryDate).toLocaleDateString()}</p>
                )}
                {doc.description && <p><strong>Descrição:</strong> {doc.description}</p>}
              </div>
            </div>
            <div className="document-actions">
              <button 
                onClick={() => removeDocument(index)}
                className="btn-remove"
              >
                🗑️ Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulário de Adição */}
      {showAddForm ? (
        <div className="document-form">
          <h4>➕ Adicionar Documento</h4>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Tipo de Documento *</label>
              <select
                value={newDocument.documentType}
                onChange={(e) => setNewDocument(prev => ({
                  ...prev,
                  documentType: e.target.value as PropertyDocumentDraft['documentType']
                }))}
              >
                <option value="DEED">📜 Escritura</option>
                <option value="REGISTRATION">📋 Matrícula</option>
                <option value="CERTIFICATE">📄 Certidão</option>
                <option value="LICENSE">📝 Licença</option>
                <option value="OTHER">📁 Outro</option>
              </select>
            </div>

            <div className="form-group">
              <label>Número do Documento *</label>
              <input
                type="text"
                value={newDocument.documentNumber}
                onChange={(e) => setNewDocument(prev => ({ ...prev, documentNumber: e.target.value }))}
                placeholder="Ex: 12345, Matrícula 67890"
              />
            </div>

            <div className="form-group">
              <label>Data de Emissão *</label>
              <input
                type="date"
                value={newDocument.issueDate}
                onChange={(e) => setNewDocument(prev => ({ ...prev, issueDate: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Data de Validade</label>
              <input
                type="date"
                value={newDocument.expiryDate || ''}
                onChange={(e) => setNewDocument(prev => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>

            <div className="form-group full-width">
              <label>Órgão Emissor *</label>
              <input
                type="text"
                value={newDocument.issuer}
                onChange={(e) => setNewDocument(prev => ({ ...prev, issuer: e.target.value }))}
                placeholder="Ex: Cartório de Registro de Imóveis"
              />
            </div>

            <div className="form-group full-width">
              <label>Descrição</label>
              <textarea
                value={newDocument.description || ''}
                onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Informações adicionais sobre o documento..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              onClick={() => setShowAddForm(false)}
              className="btn-cancel"
            >
              Cancelar
            </button>
            <button 
              onClick={addDocument}
              className="btn-save"
            >
              Adicionar
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setShowAddForm(true)}
          className="btn-add-document"
        >
          ➕ Adicionar Documento
        </button>
      )}

      {documents.length === 0 && (
        <div className="empty-state">
          <p>📄 Nenhum documento adicionado ainda.</p>
          <p>Documentos são opcionais, mas recomendados para um cadastro completo.</p>
        </div>
      )}
    </div>
  );
};

export default PropertyDocuments;
