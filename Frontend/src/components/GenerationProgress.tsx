import React from 'react';
import '../styles/GenerationProgress.css';

interface GenerationProgressProps {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  timeElapsed: number;
  sessionId?: string;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  tips?: React.ReactNode;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  isGenerating,
  progress,
  currentStep,
  timeElapsed,
  sessionId,
  onCancel,
  title = "Gerando Memorial Descritivo",
  subtitle = "Processando dados tecnicos do memorial - aguarde...",
  tips
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isGenerating) {
    return null;
  }

  return (
    <div className="memorial-progress-overlay">
      <div className="memorial-progress-modal">
        <div className="progress-header">
          <h3>{title}</h3>
          <p className="progress-subtitle">{subtitle}</p>
        </div>

        <div className="progress-content">
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-percentage">{progress}%</span>
          </div>

          <div className="progress-step">
            <span className="step-icon">⚙️</span>
            <span className="step-text">{currentStep}</span>
          </div>

          <div className="progress-info">
            <div className="time-info">
              <span>⏱️ Tempo decorrido: {formatTime(timeElapsed)}</span>
            </div>
            <div className="estimate-info">
              <span>📊 Processamento assíncrono</span>
            </div>
            {sessionId && (
              <div className="session-info">
                <span>🔗 Sessão: {sessionId.substring(0, 8)}...</span>
              </div>
            )}
          </div>

          <div className="progress-tips">
            {tips || (
              <>
                <p>💡 <strong>Dica:</strong> Memoriais com muitos lotes podem demorar mais para processar.</p>
                <p>🔄 O sistema fará até 3 tentativas em caso de timeout.</p>
              </>
            )}
          </div>
        </div>

        {onCancel && (
          <div className="progress-actions">
            <button
              className="cancel-button"
              onClick={onCancel}
              disabled={timeElapsed < 30}
            >
              {timeElapsed < 30 ? `Cancelar (${30 - timeElapsed}s)` : 'Cancelar Geração'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerationProgress;
