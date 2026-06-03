import React, { useState, useEffect } from 'react';
import { useCreditContext } from '../contexts/CreditContext';

interface CreditNotificationProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHide?: boolean;
  hideDelay?: number;
}

const CreditNotification: React.FC<CreditNotificationProps> = ({
  position = 'top-right',
  autoHide = true,
  hideDelay = 5000
}) => {
  const { currentBalance, isLowBalance, isCriticalBalance, loading } = useCreditContext();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (loading || isDismissed) return;

    // Mostrar notificação apenas se saldo baixo ou crítico
    if (isLowBalance || isCriticalBalance) {
      setIsVisible(true);

      // Auto-hide se configurado
      if (autoHide) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, hideDelay);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [currentBalance, isLowBalance, isCriticalBalance, loading, isDismissed, autoHide, hideDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  const handlePurchaseCredits = () => {
    window.location.href = '/my-account?tab=3';
  };

  if (!isVisible || loading) return null;

  const getNotificationStyle = () => {
    if (isCriticalBalance) {
      return {
        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
        color: 'white',
        icon: '⛔',
        title: 'Sem Créditos!',
        message: 'Você não possui créditos para gerar memoriais.'
      };
    } else if (isLowBalance) {
      return {
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: 'white',
        icon: '⚠️',
        title: 'Créditos Baixos!',
        message: `Restam apenas ${currentBalance} créditos.`
      };
    }
    return null;
  };

  const style = getNotificationStyle();
  if (!style) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`credit-notification ${positionClasses[position]}`}>
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">{style.icon}</span>
          <h4 className="notification-title">{style.title}</h4>
          <button 
            onClick={handleDismiss}
            className="dismiss-btn"
            title="Fechar"
          >
            ✕
          </button>
        </div>
        
        <p className="notification-message">{style.message}</p>
        
        <div className="notification-actions">
          <button 
            onClick={handlePurchaseCredits}
            className="purchase-btn"
          >
            💰 Comprar Créditos
          </button>
        </div>
      </div>
      
      <style>{`
        .credit-notification {
          position: fixed;
          z-index: 9999;
          max-width: 350px;
          background: ${style.background};
          color: ${style.color};
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          animation: slideIn 0.3s ease-out;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(${position.includes('right') ? '100%' : '-100%'});
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .notification-content {
          padding: 1.25rem;
        }
        
        .notification-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .notification-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .notification-title {
          flex: 1;
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        
        .dismiss-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: inherit;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        
        .dismiss-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }
        
        .notification-message {
          margin: 0 0 1rem 0;
          font-size: 0.95rem;
          line-height: 1.4;
          opacity: 0.95;
        }
        
        .notification-actions {
          display: flex;
          justify-content: center;
        }
        
        .purchase-btn {
          background: rgba(255, 255, 255, 0.9);
          color: ${isCriticalBalance ? '#dc2626' : '#d97706'};
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .purchase-btn:hover {
          background: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        @media (max-width: 768px) {
          .credit-notification {
            max-width: calc(100vw - 2rem);
            left: 1rem !important;
            right: 1rem !important;
          }
          
          .notification-content {
            padding: 1rem;
          }
          
          .notification-header {
            gap: 0.5rem;
          }
          
          .notification-icon {
            font-size: 1.25rem;
          }
          
          .notification-title {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CreditNotification;