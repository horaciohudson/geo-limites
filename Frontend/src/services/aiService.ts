/**
 * Serviço para geração assistida de memoriais.
 * Mantém uma única configuração operacional para o fluxo documental.
 */

export interface AIConfig {
  name: string;
  description: string;
  icon: string;
  endpoint: string;
  model: string;
}

export interface MemorialQuality {
  score: number;
  issues: string[];
  lotsFound: number;
  hasRealCoordinates: boolean;
  isComplete: boolean;
}

export interface AIParameters {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
}

export type GenerateMemorialRequest = Record<string, unknown> & {
  expectedLots?: number;
};

export type GenerateMemorialResponse = Record<string, unknown> & {
  memorial?: string;
};

export const CLAUDE_CONFIG: AIConfig = {
  name: 'Motor Documental',
  description: 'Fluxo avancado para analise tecnica e documentacao profissional',
  icon: '🧠',
  endpoint: '/memorial/generate-gpt',
  model: 'claude-3-5-sonnet-20241022'
};

/**
 * Obtém a configuração operacional principal
 */
export const getAIConfig = (): AIConfig => {
  return CLAUDE_CONFIG;
};

/**
 * Obtém a configuração operacional selecionada (compatibilidade com polling-memorial)
 */
export const getSelectedAIConfig = (): AIConfig => {
  return CLAUDE_CONFIG;
};

/**
 * Obtém o endpoint para geração de memorial
 */
export const getMemorialEndpoint = (): string => {
  return CLAUDE_CONFIG.endpoint;
};

/**
 * Validação de qualidade do memorial gerado
 */
export const validateMemorialQuality = (memorial: string, expectedLots: number): MemorialQuality => {
  const quality: MemorialQuality = {
    score: 0,
    issues: [],
    lotsFound: 0,
    hasRealCoordinates: false,
    isComplete: false
  };

  // Contar lotes
  const loteMatches = memorial.match(/LOTE\s+\d+:/gi);
  quality.lotsFound = loteMatches ? loteMatches.length : 0;

  // Verificar completude
  quality.isComplete = quality.lotsFound >= expectedLots;
  if (!quality.isComplete) {
    quality.issues.push(`Memorial incompleto: ${quality.lotsFound}/${expectedLots} lotes`);
  }

  // Verificar coordenadas reais (não sequenciais)
  const coordMatches = memorial.match(/E\s+(\d+\.\d+)m/g);
  if (coordMatches && coordMatches.length > 5) {
    const coords = coordMatches.map(c => parseFloat(c.match(/(\d+\.\d+)/)?.[1] || '0'));
    const isSequential = coords.slice(1).every((coord, i) =>
      Math.abs(coord - coords[i] - 0.1) < 0.05 // Detectar incrementos de 0.1
    );
    quality.hasRealCoordinates = !isSequential;

    if (isSequential) {
      quality.issues.push('Coordenadas parecem fictícias (sequenciais)');
    }
  }

  // Calcular score
  quality.score += quality.isComplete ? 50 : (quality.lotsFound / expectedLots) * 50;
  quality.score += quality.hasRealCoordinates ? 30 : 0;
  quality.score += memorial.includes('SIRGAS 2000') ? 10 : 0;
  quality.score += memorial.includes('confrontações') ? 10 : 0;

  return quality;
};

/**
 * Obtém parâmetros do motor documental
 */
export const getAIParameters = (): AIParameters => {
  return {
    model: CLAUDE_CONFIG.model,
    temperature: 0.2,
    max_tokens: 8000,
    top_p: 0.9
  };
};

/**
 * Configuração de retry
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  delays: [1000, 2000, 5000], // ms entre tentativas
  qualityThreshold: 70 // Score mínimo aceitável
};

/**
 * Geração com retry inteligente
 */
export const generateMemorialWithRetry = async (
  requestData: GenerateMemorialRequest
): Promise<(GenerateMemorialResponse & { quality: MemorialQuality })> => {
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const response = await fetch(CLAUDE_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestData,
          ...getAIParameters()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json() as GenerateMemorialResponse;

      if (result.memorial) {
        const quality = validateMemorialQuality(result.memorial, requestData.expectedLots || 25);

        if (quality.score >= RETRY_CONFIG.qualityThreshold) {
          return { ...result, quality };
        }
      }

    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error);
    }

    // Aguardar antes da próxima tentativa
    if (attempt < RETRY_CONFIG.maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.delays[attempt - 1]));
    }
  }

  throw new Error(`Falha ao gerar memorial de qualidade após ${RETRY_CONFIG.maxAttempts} tentativas`);
};

/**
 * Formata o nome do motor documental para exibição
 */
export const formatAIName = (): string => {
  return `${CLAUDE_CONFIG.icon} ${CLAUDE_CONFIG.name}`;
};

export default {
  getAIConfig,
  getSelectedAIConfig,
  getMemorialEndpoint,
  formatAIName,
  getAIParameters,
  generateMemorialWithRetry,
  validateMemorialQuality,
  RETRY_CONFIG,
  CLAUDE_CONFIG
};
