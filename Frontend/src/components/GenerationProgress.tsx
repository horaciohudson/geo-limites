import React from 'react';

interface GenerationProgressProps {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  timeElapsed: number;
  sessionId?: string;
  onCancel?: () => void;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  isGenerating,
  progress,
  currentStep,
  timeElapsed,
  sessionId,
  onCancel
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
          <h3>Gerando Memorial Descritivo</h3>
          <p className="progress-subtitle">Processando dados tecnicos do memorial - aguarde...</p>
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
            <p>💡 <strong>Dica:</strong> Memoriais com muitos lotes podem demorar mais para processar.</p>
            <p>🔄 O sistema fará até 3 tentativas em caso de timeout.</p>
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
