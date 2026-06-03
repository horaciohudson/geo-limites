/**
 * PATCH URGENTE PARA CORRIGIR TIMEOUT NO FRONTEND
 * 
 * Aplicar estas mudanças no frontend para resolver o erro:
 * "Erro ao gerar memorial descritivo"
 */

// ============================================================================
// 1. CONFIGURAÇÃO DO AXIOS (arquivo: src/api/api.js ou src/services/api.js)
// ============================================================================

import axios from 'axios';

// ANTES (configuração atual - PROBLEMÁTICA):
/*
const api = axios.create({
  baseURL: 'http://localhost:9010',
  timeout: 30000 // 30 segundos - MUITO POUCO!
});
*/

// DEPOIS (configuração corrigida):
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:9010',
  timeout: 300000, // 5 MINUTOS (300 segundos) - SUFICIENTE PARA IA
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
});

// Interceptor para logs detalhados
api.interceptors.request.use(
  (config) => {
    console.log('🚀 Enviando requisição:', config.method?.toUpperCase(), config.url);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Erro na requisição:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ Resposta recebida:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Erro na resposta:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export default api;

// ============================================================================
// 2. FUNÇÃO GENERATEmemorial (arquivo: src/components/Viewer.tsx linha 213)
// ============================================================================

const generateMemorial = async () => {
  try {
    // Estado de loading
    setGeneratingMemorial(true);
    setMemorialError(null);
    setProgressMessage("🤖 Iniciando geração do memorial com IA...");
    
    console.log('📊 Iniciando geração do memorial...');
    
    // Timer para mostrar progresso ao usuário
    let progressStep = 0;
    const progressMessages = [
      "📊 Analisando entidades DXF...",
      "🎯 Detectando lotes automaticamente...", 
      "📝 Gerando coordenadas reais...",
      "🤖 Processando com IA (pode demorar 2-3 minutos)...",
      "⏳ Finalizando memorial...",
      "🎉 Quase pronto..."
    ];
    
    const progressTimer = setInterval(() => {
      if (progressStep < progressMessages.length - 1) {
        progressStep++;
        setProgressMessage(progressMessages[progressStep]);
      }
    }, 25000); // Atualiza a cada 25 segundos
    
    // Preparar dados para envio
    const memorialData = {
      entities: processedEntities || [],
      fileName: file?.name || 'arquivo.dxf',
      projectName: projectName || 'Projeto Memorial',
      projectDescription: projectDescription || 'Memorial gerado automaticamente',
      standardId: null
    };
    
    console.log('📤 Enviando dados:', {
      entidades: memorialData.entities.length,
      arquivo: memorialData.fileName,
      projeto: memorialData.projectName
    });
    
    // REQUISIÇÃO COM TIMEOUT AUMENTADO
    const response = await api.post('/api/memorial/generate-gpt', memorialData, {
      timeout: 300000, // 5 MINUTOS ESPECÍFICO PARA MEMORIAL
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      // Callback para monitorar progresso do upload
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`📤 Upload: ${percentCompleted}%`);
      }
    });
    
    // Limpar timer de progresso
    clearInterval(progressTimer);
    
    // Verificar resposta
    if (!response.data || !response.data.memorialText) {
      throw new Error('Resposta inválida do servidor - memorial não encontrado');
    }
    
    console.log('✅ Memorial gerado com sucesso!', {
      tamanho: response.data.memorialText.length,
      projeto: response.data.projectName
    });
    
    // Atualizar estado com sucesso
    setMemorialContent(response.data.memorialText);
    setProgressMessage("🎉 Memorial gerado com sucesso!");
    
    // Limpar mensagem de sucesso após 3 segundos
    setTimeout(() => setProgressMessage(""), 3000);
    
  } catch (error) {
    // Limpar timer em caso de erro
    if (progressTimer) clearInterval(progressTimer);
    
    console.error('❌ Erro detalhado ao gerar memorial:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Tratamento específico de erros
    let errorMessage = "Erro desconhecido ao gerar memorial";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "⏰ Timeout: A geração está demorando mais que 5 minutos. " +
                    "Isso pode indicar um problema no servidor ou arquivo muito complexo. " +
                    "Tente novamente ou use um arquivo menor.";
    } else if (error.response) {
      // Erro com resposta do servidor
      switch (error.response.status) {
        case 500:
          errorMessage = "🔧 Erro interno do servidor. Verifique se o backend está funcionando " +
                        "e se a API da OpenAI está configurada corretamente.";
          break;
        case 403:
          errorMessage = "🔐 Erro de autenticação. Sua sessão pode ter expirado. " +
                        "Faça login novamente.";
          break;
        case 400:
          errorMessage = "📋 Dados inválidos enviados para o servidor. " +
                        "Verifique se o arquivo DXF está correto.";
          break;
        case 404:
          errorMessage = "🔍 Endpoint não encontrado. Verifique se o backend está atualizado.";
          break;
        default:
          errorMessage = `🌐 Erro HTTP ${error.response.status}: ${
            error.response.data?.message || error.message
          }`;
      }
    } else if (error.request) {
      errorMessage = "🌐 Erro de conexão com o servidor. Verifique se o backend está rodando " +
                    "na porta 9010 e se não há problemas de rede.";
    } else {
      errorMessage = `❌ Erro inesperado: ${error.message}`;
    }
    
    // Atualizar estado com erro
    setMemorialError(errorMessage);
    setProgressMessage("");
    
    // Log para debug
    console.error('🔍 Para debug - verificar:', {
      'Backend rodando?': 'http://localhost:9010/actuator/health',
      'OpenAI configurada?': 'Verificar logs do backend',
      'Arquivo DXF válido?': 'Verificar se tem entidades válidas'
    });
    
  } finally {
    setGeneratingMemorial(false);
  }
};

// ============================================================================
// 3. COMPONENTE DE PROGRESSO (adicionar no JSX do Viewer.tsx)
// ============================================================================

// No JSX, adicionar antes do botão de gerar memorial:
/*
{generatingMemorial && (
  <div className="memorial-progress">
    <div className="progress-spinner"></div>
    <p>{progressMessage}</p>
    <small>⏱️ Tempo estimado: 2-3 minutos</small>
  </div>
)}

{memorialError && (
  <div className="memorial-error">
    <h4>❌ Erro na Geração do Memorial</h4>
    <p>{memorialError}</p>
    <button onClick={() => setMemorialError(null)}>Tentar Novamente</button>
  </div>
)}
*/

// ============================================================================
// 4. CSS PARA PROGRESSO (adicionar no arquivo CSS)
// ============================================================================

/*
.memorial-progress {
  text-align: center;
  padding: 20px;
  background: #f0f8ff;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  margin: 10px 0;
}

.progress-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.memorial-error {
  background: #ffebee;
  border: 2px solid #f44336;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
}

.memorial-error h4 {
  color: #d32f2f;
  margin: 0 0 10px 0;
}

.memorial-error button {
  background: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}
*/

// ============================================================================
// 5. VARIÁVEIS DE ESTADO (adicionar no componente Viewer.tsx)
// ============================================================================

/*
const [generatingMemorial, setGeneratingMemorial] = useState(false);
const [progressMessage, setProgressMessage] = useState("");
const [memorialError, setMemorialError] = useState(null);
const [memorialContent, setMemorialContent] = useState("");
*/

console.log('🔧 PATCH FRONTEND APLICADO - Timeout aumentado para 5 minutos');
console.log('📋 Próximos passos:');
console.log('1. Aplicar as mudanças acima no código do frontend');
console.log('2. Reiniciar o servidor de desenvolvimento');
console.log('3. Testar geração de memorial');
console.log('4. Verificar se aguarda os 2-3 minutos necessários');