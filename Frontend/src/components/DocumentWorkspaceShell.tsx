import React from 'react';

type GeneratedDocumentKind = 'memorial' | 'resumo-tecnico';

interface DocumentWorkspaceShellProps {
  documentKind: GeneratedDocumentKind;
  viewerUrl: string;
  children: React.ReactNode;
}

const DocumentWorkspaceShell: React.FC<DocumentWorkspaceShellProps> = ({
  documentKind,
  viewerUrl,
  children
}) => {
  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '20px 22px',
          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)'
        }}
      >
        <div
          style={{
            fontSize: '0.78rem',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 700,
            marginBottom: '8px'
          }}
        >
          Documento Gerado
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem', color: '#0f172a' }}>
          {documentKind === 'resumo-tecnico' ? 'Resumo Tecnico' : 'Memorial Descritivo'}
        </h1>
        <p style={{ margin: '0 0 16px', color: '#475569', lineHeight: 1.55 }}>
          Esta pagina concentra apenas a geracao e a leitura do documento, separada da area principal do Memorial.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href={viewerUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            Voltar ao Memorial
          </a>
          <button
            type="button"
            onClick={() => window.close()}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#fff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Fechar aba
          </button>
        </div>
      </div>

      {children}
    </div>
  );
};

export default DocumentWorkspaceShell;
