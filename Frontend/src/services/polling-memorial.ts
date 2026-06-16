import api from './api';
import aiService from './aiService';
import { parseChunkProgress, calculateChunkProgress, formatChunkMessage } from '../utils/progressParser';
import type { DXFEntity } from '../utils/dxfParser';

export interface AsyncMemorialRequest {
  compareResult: AsyncCompareResult;
  standardId: string;
  fileName: string;
}

export interface AsyncMemorialResponse {
  sessionId: string;
  status: string;
  message: string;
}

export interface GenerationProgress {
  sessionId: string;
  userId: string;
  status: 'STARTED' | 'PROCESSING' | 'PROGRESS_UPDATE' | 'COMPLETED' | 'FAILED';
  message: string;
  progressPercentage?: number;
  result?: string;
  errorMessage?: string;
  timestamp: number;
}

export interface AsyncPropertyData {
  id?: string | null;
  registrationNumber?: string;
  name?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  ownerName?: string;
  ownerDocument?: string;
  propertyType?: string;
}

export interface AsyncCompareResult {
  entities: DXFEntity[];
  propertyData?: AsyncPropertyData | null;
}

export interface SessionStatus {
  sessionId: string;
  status: string;
  isActive?: boolean;
  progressPercentage?: number;
  message?: string;
  errorMessage?: string | null;
  timestamp?: number;
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
};

/**
 * Serviço de memorial assíncrono usando polling em vez de WebSocket
 * Mais simples e compatível com qualquer ambiente
 */
export class PollingMemorialService {

  /**
   * Iniciar geração assíncrona de memorial
   */
  async startGeneration(request: AsyncMemorialRequest): Promise<AsyncMemorialResponse> {
    try {
      const response = await api.post('/memorial/async/generate', request);
      return response.data;

    } catch (error: unknown) {
      console.error('Erro ao iniciar geração com polling:', error);
      throw new Error(getErrorMessage(error, 'Erro ao iniciar geração do memorial'));
    }
  }

  /**
   * Verificar status de uma sessão
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    try {
      const response = await api.get(`/memorial/async/status/${sessionId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Erro ao verificar status da sessão em polling:', error);
      throw new Error('Erro ao verificar status da sessão');
    }
  }

  /**
   * Gerar memorial com polling (sem WebSocket)
   */
  async generateWithPolling(
    request: AsyncMemorialRequest,
    onProgress: (progress: GenerationProgress) => void,
    onComplete: (result: string) => void,
    onError: (error: string) => void
  ): Promise<string> {

    return new Promise(async (resolve, reject) => {
      let pollingInterval: number | null = null;

      try {
        // Iniciar geração
        const response = await this.startGeneration(request);
        const { sessionId } = response;

        // Simular progresso inicial
        onProgress({
          sessionId,
          userId: 'current-user',
          status: 'STARTED',
          message: 'Geração iniciada...',
          progressPercentage: 0,
          timestamp: Date.now()
        });

        let progress = 10;
        let attempts = 0;
        const maxAttempts = 120; // 10 minutos (5s * 120 = 600s)

        // Polling a cada 5 segundos
        pollingInterval = window.setInterval(async () => {
          attempts++;

          try {
            // Simular progresso incremental com parsing de chunks
            if (progress < 90) {
              progress += Math.random() * 10;

              // Tentar parsear progresso de chunks da mensagem
              const message = `Processando... ${Math.round(progress)}%`;
              const chunkProgress = parseChunkProgress(message);

              if (chunkProgress) {
                const progressPercent = calculateChunkProgress(chunkProgress);
                const displayMessage = formatChunkMessage(chunkProgress);

                onProgress({
                  sessionId,
                  userId: 'current-user',
                  status: 'PROGRESS_UPDATE',
                  message: displayMessage,
                  progressPercentage: progressPercent,
                  timestamp: Date.now()
                });
              } else {
                onProgress({
                  sessionId,
                  userId: 'current-user',
                  status: 'PROGRESS_UPDATE',
                  message,
                  progressPercentage: Math.round(progress),
                  timestamp: Date.now()
                });
              }
            }

            // Chamar o backend real para gerar o memorial
            if (attempts === 1) { // Primeira tentativa - chamar o backend
              try {
                // Obter configuracao operacional selecionada
                const selectedAIConfig = aiService.getSelectedAIConfig();
                const endpoint = selectedAIConfig.endpoint || '/memorial/generate';

                // Preparar dados com parametros operacionais do motor documental
                const memorialData = {
                  oldFileName: request.fileName,
                  newFileName: request.fileName,
                  totalOldEntities: 0,
                  totalNewEntities: request.compareResult.entities?.length || 0,
                  added: request.compareResult.entities || [],
                  removed: [],
                  modified: [],
                  summaryByType: {},
                  standardId: request.standardId,
                  propertyId: request.compareResult.propertyData?.id || null,
                  // Adicionar parametros especificos do motor documental
                  ...aiService.getAIParameters()
                };

                // Chamar o endpoint operacional selecionado
                const memorialResponse = await api.post(endpoint, memorialData);

                if (pollingInterval) {
                  clearInterval(pollingInterval);
                }

                const realMemorial = memorialResponse.data;
                onProgress({
                  sessionId,
                  userId: 'current-user',
                  status: 'COMPLETED',
                  message: 'Memorial gerado com sucesso!',
                  progressPercentage: 100,
                  result: realMemorial,
                  timestamp: Date.now()
                });

                onComplete(realMemorial);
                resolve(realMemorial);
                return;

              } catch (backendError: unknown) {
                console.error('Erro ao chamar backend no polling:', backendError);

                // Se backend falhar, continuar com simulação
                onProgress({
                  sessionId,
                  userId: 'current-user',
                  status: 'PROGRESS_UPDATE',
                  message: 'Backend indisponível, usando modo simulação...',
                  progressPercentage: 50,
                  timestamp: Date.now()
                });
              }
            }

            // Simulação de progresso enquanto aguarda
            if (attempts >= 12) { // 12 * 5s = 60s timeout
              if (pollingInterval) {
                clearInterval(pollingInterval);
              }

              const timeoutError = 'Timeout: Memorial demorou mais que 1 minuto para gerar';
              onError(timeoutError);
              reject(new Error(timeoutError));
            }

          } catch (error: unknown) {
            if (pollingInterval) {
              clearInterval(pollingInterval);
            }

            const errorMsg = getErrorMessage(error, 'Erro durante o polling');
            onError(errorMsg);
            reject(new Error(errorMsg));
          }

          // Timeout de segurança
          if (attempts >= maxAttempts) {
            if (pollingInterval) {
              clearInterval(pollingInterval);
            }

            const timeoutError = 'Timeout: Geração demorou mais que 10 minutos';
            onError(timeoutError);
            reject(new Error(timeoutError));
          }
        }, 5000); // Polling a cada 5 segundos

      } catch (error: unknown) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }

        const errorMsg = getErrorMessage(error, 'Erro ao configurar geração assíncrona');
        onError(errorMsg);
        reject(error instanceof Error ? error : new Error(errorMsg));
      }
    });
  }
}

// Instância singleton
export const pollingMemorialService = new PollingMemorialService();
