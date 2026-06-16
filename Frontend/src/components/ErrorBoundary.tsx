import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary capturou um erro:', error);
    console.error('📍 Informações do erro:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>🚨 Ops! Algo deu errado</h2>
            <p>Ocorreu um erro inesperado na aplicação.</p>
            
            <details className="error-details">
              <summary>Detalhes técnicos</summary>
              <div className="error-info">
                <h4>Erro:</h4>
                <pre>{this.state.error?.message}</pre>
                
                <h4>Stack Trace:</h4>
                <pre>{this.state.error?.stack}</pre>
                
                {this.state.errorInfo && (
                  <>
                    <h4>Component Stack:</h4>
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </>
                )}
              </div>
            </details>
            
            <div className="error-actions">
              <button 
                onClick={() => window.location.reload()}
                className="btn-reload"
              >
                🔄 Recarregar Página
              </button>
              <button 
                onClick={() => window.history.back()}
                className="btn-back"
              >
                ← Voltar
              </button>
            </div>
          </div>
          
          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 50vh;
              padding: 2rem;
              background-color: #f8f9fa;
            }
            
            .error-content {
              max-width: 600px;
              background: white;
              border-radius: 8px;
              padding: 2rem;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              border-left: 4px solid #dc3545;
            }
            
            .error-content h2 {
              color: #dc3545;
              margin-bottom: 1rem;
            }
            
            .error-details {
              margin: 1.5rem 0;
              border: 1px solid #dee2e6;
              border-radius: 4px;
            }
            
            .error-details summary {
              padding: 0.75rem;
              background-color: #f8f9fa;
              cursor: pointer;
              border-bottom: 1px solid #dee2e6;
            }
            
            .error-info {
              padding: 1rem;
            }
            
            .error-info h4 {
              margin: 1rem 0 0.5rem 0;
              color: #495057;
            }
            
            .error-info pre {
              background-color: #f8f9fa;
              padding: 0.75rem;
              border-radius: 4px;
              overflow-x: auto;
              font-size: 0.875rem;
              border: 1px solid #dee2e6;
            }
            
            .error-actions {
              display: flex;
              gap: 1rem;
              margin-top: 1.5rem;
            }
            
            .btn-reload, .btn-back {
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 500;
              transition: background-color 0.2s;
            }
            
            .btn-reload {
              background-color: #007bff;
              color: white;
            }
            
            .btn-reload:hover {
              background-color: #0056b3;
            }
            
            .btn-back {
              background-color: #6c757d;
              color: white;
            }
            
            .btn-back:hover {
              background-color: #545b62;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
