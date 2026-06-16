# CORREÇÃO DO ERRO DE TIMEOUT NO FRONTEND

## 🔍 PROBLEMA IDENTIFICADO:
- **Erro**: AxiosError em Viewer.tsx:213 na função generateMemorial
- **Causa**: Timeout do frontend menor que o tempo de processamento do backend (2+ minutos)
- **Backend**: Funcionando corretamente (gera memorial de 14.021 caracteres)

## 🛠️ SOLUÇÕES PARA IMPLEMENTAR NO FRONTEND:

### 1. AUMENTAR TIMEOUT DO AXIOS

No arquivo onde está configurado o Axios (provavelmente `api.ts` ou similar):

```typescript
// Configuração atual (provavelmente 30s ou menos)
const api = axios.create({
  baseURL: 'http://localhost:9010',
  timeout: 30000 // 30 segundos - MUITO POUCO!
});

// CORREÇÃO: Aumentar para 5 minutos
const api = axios.create({
  baseURL: 'http://localhost:9010',
  timeout: 300000 // 5 minutos (300 segundos)
});
```

### 2. TIMEOUT ESPECÍFICO PARA MEMORIAL

No arquivo `Viewer.tsx`, na função `generateMemorial`:

```typescript
// Antes (provavelmente assim):
const response = await api.post('/api/memorial/generate-gpt', data);

// CORREÇÃO: Timeout específico para memorial
const response = await api.post('/api/memorial/generate-gpt', data, {
  timeout: 300000, // 5 minutos específico para memorial
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### 3. ADICIONAR INDICADOR DE PROGRESSO

```typescript
const generateMemorial = async () => {
  try {
    setLoading(true);
    setProgress("Iniciando geração do memorial...");
    
    // Simular progresso durante a espera
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev.includes("Analisando")) return "Gerando coordenadas...";
        if (prev.includes("Gerando")) return "Processando com IA...";
        if (prev.includes("Processando")) return "Finalizando memorial...";
        return "Analisando arquivos DXF...";
      });
    }, 15000); // Atualiza a cada 15 segundos
    
    const response = await api.post('/api/memorial/generate-gpt', data, {
      timeout: 300000 // 5 minutos
    });
    
    clearInterval(progressInterval);
    setProgress("Memorial gerado com sucesso!");
    
  } catch (error) {
    clearInterval(progressInterval);
    if (error.code === 'ECONNABORTED') {
      setError("Timeout: A geração está demorando mais que o esperado. Tente novamente.");
    } else {
      setError(`Erro ao gerar memorial: ${error.message}`);
    }
  } finally {
    setLoading(false);
  }
};
```

### 4. TRATAMENTO MELHORADO DE ERROS

```typescript
catch (error) {
  console.error('Erro detalhado:', error);
  
  if (error.code === 'ECONNABORTED') {
    setError("⏰ Timeout: A geração do memorial está demorando mais que o esperado. O processo pode estar em andamento no servidor.");
  } else if (error.response?.status === 500) {
    setError("🔧 Erro interno do servidor. Verifique os logs do backend.");
  } else if (error.response?.status === 403) {
    setError("🔐 Erro de autenticação. Faça login novamente.");
  } else if (error.response?.status === 400) {
    setError("📋 Dados inválidos enviados para o servidor.");
  } else {
    setError(`❌ Erro ao gerar memorial: ${error.message}`);
  }
}
```

## 🎯 IMPLEMENTAÇÃO IMEDIATA:

### Arquivo: `src/api/api.ts` (ou similar)
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:9010',
  timeout: 300000, // 5 minutos para todas as requisições
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Arquivo: `src/components/Viewer.tsx` (linha 213)
```typescript
const generateMemorial = async () => {
  try {
    setGeneratingMemorial(true);
    setMemorialError(null);
    setProgressMessage("🤖 Iniciando geração do memorial com IA...");
    
    // Timer para atualizar progresso
    const progressTimer = setInterval(() => {
      setProgressMessage(prev => {
        if (prev.includes("Iniciando")) return "📊 Analisando entidades DXF...";
        if (prev.includes("Analisando")) return "🎯 Detectando lotes automaticamente...";
        if (prev.includes("Detectando")) return "📝 Gerando coordenadas reais...";
        if (prev.includes("Gerando")) return "🤖 Processando com IA (pode demorar 2-3 min)...";
        return "⏳ Finalizando memorial...";
      });
    }, 20000);
    
    const memorialData = {
      entities: processedEntities,
      fileName: file?.name || 'arquivo.dxf',
      projectName: projectName || 'Projeto Memorial',
      projectDescription: projectDescription || 'Memorial gerado automaticamente',
      standardId: null
    };
    
    console.log('📤 Enviando dados para geração:', memorialData);
    
    const response = await api.post('/api/memorial/generate-gpt', memorialData, {
      timeout: 300000, // 5 minutos específico para memorial
      onUploadProgress: (progressEvent) => {
        console.log('📤 Upload progress:', progressEvent);
      }
    });
    
    clearInterval(progressTimer);
    
    console.log('✅ Memorial gerado com sucesso:', response.data);
    setMemorialContent(response.data.memorialText);
    setProgressMessage("🎉 Memorial gerado com sucesso!");
    
  } catch (error) {
    clearInterval(progressTimer);
    console.error('❌ Erro ao gerar memorial:', error);
    
    let errorMessage = "Erro desconhecido";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "⏰ Timeout: A geração está demorando mais que 5 minutos. Verifique se o servidor está processando.";
    } else if (error.response) {
      switch (error.response.status) {
        case 500:
          errorMessage = "🔧 Erro interno do servidor. Verifique os logs do backend.";
          break;
        case 403:
          errorMessage = "🔐 Erro de autenticação. Faça login novamente.";
          break;
        case 400:
          errorMessage = "📋 Dados inválidos. Verifique o arquivo DXF.";
          break;
        default:
          errorMessage = `🌐 Erro HTTP ${error.response.status}: ${error.response.data?.message || error.message}`;
      }
    } else if (error.request) {
      errorMessage = "🌐 Erro de conexão com o servidor. Verifique se o backend está rodando.";
    } else {
      errorMessage = `❌ Erro: ${error.message}`;
    }
    
    setMemorialError(errorMessage);
    setProgressMessage("");
  } finally {
    setGeneratingMemorial(false);
  }
};
```

## 🚀 RESULTADO ESPERADO:
- ✅ Frontend aguarda até 5 minutos pela resposta
- ✅ Usuário vê progresso durante a geração
- ✅ Erros são tratados de forma clara e específica
- ✅ Memorial de 25 lotes é exibido corretamente

## 📋 CHECKLIST DE IMPLEMENTAÇÃO:
- [ ] Aumentar timeout global do Axios para 300000ms (5 min)
- [ ] Adicionar timeout específico na função generateMemorial
- [ ] Implementar indicador de progresso
- [ ] Melhorar tratamento de erros
- [ ] Testar com arquivo DXF real
- [ ] Verificar se memorial completo é exibido