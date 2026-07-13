import { useEffect, useState } from 'react';
import type { ProcessingContextStatusDTO } from '@/utils/processingContextStatus';

export type GeneratedDocumentKind = 'memorial' | 'resumo-tecnico';

interface CompleteDocumentGenerationParams {
  memorial: string;
  technicalSummaryJson?: string;
  processingContextStatus?: ProcessingContextStatusDTO | null;
  step: string;
}

export const useDocumentGenerationState = () => {
  const [memorial, setMemorial] = useState('');
  const [technicalSummaryJson, setTechnicalSummaryJson] = useState('');
  const [processingContextStatus, setProcessingContextStatus] = useState<ProcessingContextStatusDTO | null>(null);
  const [generatedDocumentKind, setGeneratedDocumentKind] = useState<GeneratedDocumentKind>('memorial');
  const [isGeneratingMemorial, setIsGeneratingMemorial] = useState(false);
  const [memorialError, setMemorialError] = useState('');
  const [memorialStartTime, setMemorialStartTime] = useState<number | null>(null);
  const [memorialTimeElapsed, setMemorialTimeElapsed] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [memorialCurrentStep, setMemorialCurrentStep] = useState('');

  useEffect(() => {
    if (!isGeneratingMemorial || !memorialStartTime) {
      return;
    }

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - memorialStartTime) / 1000);
      setMemorialTimeElapsed(elapsed);
      setGenerationProgress((currentProgress) => {
        if (currentProgress >= 95) {
          return currentProgress;
        }

        const timedProgress = Math.min(95, Math.max(2, elapsed * 4));
        if (currentProgress === 0) {
          return timedProgress;
        }

        return Math.max(currentProgress, timedProgress);
      });
      setMemorialCurrentStep((currentStep) => currentStep || 'Processando o Resumo Tecnico aplicado...');
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isGeneratingMemorial, memorialStartTime]);

  const beginGeneration = (kind: GeneratedDocumentKind, initialStep: string) => {
    setIsGeneratingMemorial(true);
    setGeneratedDocumentKind(kind);
    setMemorialError('');
    setMemorial('');
    setTechnicalSummaryJson(kind === 'resumo-tecnico' ? '' : '');
    setProcessingContextStatus(null);
    setMemorialStartTime(Date.now());
    setMemorialTimeElapsed(0);
    setGenerationProgress(0);
    setMemorialCurrentStep(initialStep);
  };

  const updateGeneration = (params: { progress?: number; step?: string }) => {
    if (typeof params.progress === 'number') {
      setGenerationProgress(params.progress);
    }
    if (typeof params.step === 'string') {
      setMemorialCurrentStep(params.step);
    }
  };

  const completeGeneration = ({
    memorial: nextMemorial,
    technicalSummaryJson: nextTechnicalSummaryJson = '',
    processingContextStatus: nextProcessingContextStatus = null,
    step
  }: CompleteDocumentGenerationParams) => {
    setMemorial(nextMemorial);
    setTechnicalSummaryJson(nextTechnicalSummaryJson);
    setProcessingContextStatus(nextProcessingContextStatus);
    setGenerationProgress(100);
    setMemorialCurrentStep(step);
    setIsGeneratingMemorial(false);
    setMemorialStartTime(null);
  };

  const failGeneration = (message: string, step = 'Erro na geracao') => {
    setMemorial('');
    setProcessingContextStatus(null);
    setMemorialError(message);
    setMemorialCurrentStep(step);
    setIsGeneratingMemorial(false);
    setMemorialStartTime(null);
  };

  const stopGeneration = () => {
    setIsGeneratingMemorial(false);
    setMemorialStartTime(null);
  };

  return {
    memorial,
    setMemorial,
    technicalSummaryJson,
    setTechnicalSummaryJson,
    processingContextStatus,
    setProcessingContextStatus,
    generatedDocumentKind,
    setGeneratedDocumentKind,
    isGeneratingMemorial,
    memorialError,
    setMemorialError,
    memorialTimeElapsed,
    generationProgress,
    memorialCurrentStep,
    setMemorialCurrentStep,
    setGenerationProgress,
    beginGeneration,
    updateGeneration,
    completeGeneration,
    failGeneration,
    stopGeneration
  };
};
