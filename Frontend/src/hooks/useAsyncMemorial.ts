import { useState, useEffect, useCallback } from 'react';
import { pollingMemorialService } from '@/services/polling-memorial';
import type { AsyncMemorialRequest, GenerationProgress } from '@/services/polling-memorial';

interface ErrorLike {
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

export interface UseAsyncMemorialState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  memorial: string | null;
  error: string | null;
  sessionId: string | null;
  timeElapsed: number;
}

export interface UseAsyncMemorialActions {
  generateMemorial: (request: AsyncMemorialRequest) => Promise<void>;
  cancelGeneration: () => Promise<void>;
  clearState: () => void;
}

export const useAsyncMemorial = (): [UseAsyncMemorialState, UseAsyncMemorialActions] => {
  const [state, setState] = useState<UseAsyncMemorialState>({
    isGenerating: false,
    progress: 0,
    currentStep: '',
    memorial: null,
    error: null,
    sessionId: null,
    timeElapsed: 0
  });

  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeInterval, setTimeInterval] = useState<number | null>(null);

  useEffect(() => {
    if (state.isGenerating && startTime) {
      if (timeInterval) {
        clearInterval(timeInterval);
      }

      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setState(prev => ({
          ...prev,
          timeElapsed: elapsed
        }));
      }, 1000);

      setTimeInterval(interval);

      return () => {
        clearInterval(interval);
      };
    }

    if (timeInterval) {
      clearInterval(timeInterval);
      setTimeInterval(null);
    }
  }, [state.isGenerating, startTime]);

  const generateMemorial = useCallback(async (request: AsyncMemorialRequest) => {
    try {
      if (timeInterval) {
        clearInterval(timeInterval);
        setTimeInterval(null);
      }

      const now = Date.now();
      setStartTime(now);
      setState({
        isGenerating: true,
        progress: 0,
        currentStep: 'Iniciando geração...',
        memorial: null,
        error: null,
        sessionId: null,
        timeElapsed: 0
      });

      await pollingMemorialService.generateWithPolling(
        request,
        (progress: GenerationProgress) => {
          setState(prev => ({
            ...prev,
            sessionId: progress.sessionId,
            progress: progress.progressPercentage || prev.progress,
            currentStep: progress.message,
            error: null
          }));
        },
        (result: string) => {
          setState(prev => ({
            ...prev,
            isGenerating: false,
            progress: 100,
            currentStep: 'Memorial gerado com sucesso!',
            memorial: result,
            error: null
          }));

          if (timeInterval) {
            clearInterval(timeInterval);
            setTimeInterval(null);
          }
        },
        (error: string) => {
          console.error('Erro na geração assíncrona:', error);

          setState(prev => ({
            ...prev,
            isGenerating: false,
            currentStep: 'Erro na geração',
            error,
            memorial: null
          }));

          if (timeInterval) {
            clearInterval(timeInterval);
            setTimeInterval(null);
          }
        }
      );
    } catch (error: unknown) {
      console.error('Erro ao iniciar geração assíncrona:', error);
      const errorMessage = getErrorMessage(error, 'Erro desconhecido');

      setState(prev => ({
        ...prev,
        isGenerating: false,
        currentStep: 'Erro ao iniciar geração',
        error: errorMessage,
        memorial: null
      }));

      if (timeInterval) {
        clearInterval(timeInterval);
        setTimeInterval(null);
      }
    }
  }, [timeInterval]);

  const cancelGeneration = useCallback(async () => {
    if (timeInterval) {
      clearInterval(timeInterval);
      setTimeInterval(null);
    }

    setState(prev => ({
      ...prev,
      isGenerating: false,
      currentStep: 'Geração cancelada',
      error: 'Geração cancelada pelo usuário'
    }));
  }, [timeInterval]);

  const clearState = useCallback(() => {
    setState({
      isGenerating: false,
      progress: 0,
      currentStep: '',
      memorial: null,
      error: null,
      sessionId: null,
      timeElapsed: 0
    });

    if (timeInterval) {
      clearInterval(timeInterval);
      setTimeInterval(null);
    }

    setStartTime(null);
  }, [timeInterval]);

  return [
    state,
    {
      generateMemorial,
      cancelGeneration,
      clearState
    }
  ];
};
