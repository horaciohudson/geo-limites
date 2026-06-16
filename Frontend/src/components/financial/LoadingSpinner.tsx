import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message = 'Carregando...',
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const containerClass = fullScreen 
    ? 'fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={`loading-spinner-container ${containerClass} ${className}`}>
      <div className="loading-content">
        {/* Spinner animado */}
        <div className={`loading-spinner ${sizeClasses[size]}`}>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        
        {/* Mensagem */}
        {message && (
          <p className="loading-message">{message}</p>
        )}
      </div>
      
      <style>{`
        .loading-spinner-container {
          text-align: center;
        }
        
        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        
        .loading-spinner {
          position: relative;
          display: inline-block;
        }
        
        .spinner-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }
        
        .spinner-ring:nth-child(1) {
          animation-delay: -0.45s;
        }
        
        .spinner-ring:nth-child(2) {
          animation-delay: -0.3s;
        }
        
        .spinner-ring:nth-child(3) {
          animation-delay: -0.15s;
        }
        
        .loading-message {
          color: #6b7280;
          font-weight: 500;
          margin: 0;
          font-size: ${size === 'small' ? '0.875rem' : size === 'large' ? '1.125rem' : '1rem'};
        }
        
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        /* Variações de tamanho */
        .w-6 { width: 1.5rem; }
        .h-6 { height: 1.5rem; }
        .w-12 { width: 3rem; }
        .h-12 { height: 3rem; }
        .w-16 { width: 4rem; }
        .h-16 { height: 4rem; }
        
        /* Utilitários Flexbox */
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        
        /* Posicionamento */
        .fixed { position: fixed; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .relative { position: relative; }
        .absolute { position: absolute; }
        
        /* Background */
        .bg-white { background-color: white; }
        .bg-opacity-90 { background-color: rgba(255, 255, 255, 0.9); }
        
        /* Z-index */
        .z-50 { z-index: 50; }
        
        /* Padding */
        .p-8 { padding: 2rem; }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;