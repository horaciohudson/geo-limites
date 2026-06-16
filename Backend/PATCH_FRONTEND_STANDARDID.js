// ========================================
// 🔧 PATCH PARA CORRIGIR STANDARDID NO FRONTEND
// ========================================

// PROBLEMA: Frontend não está enviando standardId do localStorage
// SOLUÇÃO: Incluir standardId em todas as requisições para /api/memorial/generate-gpt

// ========================================
// 📁 ARQUIVO: Frontend/src/pages/Viewer.tsx
// ========================================

// ❌ CÓDIGO ATUAL (LINHA ~230):
/*
const response = await api.post('/memorial/generate-gpt', memorialRequest);
*/

// ✅ CÓDIGO CORRIGIDO:
/*
// Pegar norma do localStorage
const selectedStandard = JSON.parse(localStorage.getItem('selectedStandard') || '{}');
if (!selectedStandard.id) {
  throw new Error('Nenhuma norma selecionada. Selecione uma norma primeiro.');
}

const memorialRequest = {
  entities: dxfEntities,
  fileName: fileName,
  projectName: projectName,
  projectDescription: projectDescription,
  standardId: selectedStandard.id  // ← ADICIONAR ESTA LINHA
};

console.log('🚀 Viewer enviando memorial com standardId:', selectedStandard.id);
const response = await api.post('/memorial/generate-gpt', memorialRequest);
*/

// ========================================
// 📁 ARQUIVO: Frontend/src/pages/Memorial.tsx
// ========================================

// ❌ CÓDIGO ATUAL (LINHA ~427):
/*
const response = await api.post('/memorial/generate-gpt', requestData, {
  timeout: 300000,
});
*/

// ✅ CÓDIGO CORRIGIDO:
/*
// Pegar norma do localStorage
const selectedStandard = JSON.parse(localStorage.getItem('selectedStandard') || '{}');
if (!selectedStandard.id) {
  throw new Error('Nenhuma norma selecionada. Selecione uma norma primeiro.');
}

const requestData = {
  entities: dxfEntities,
  fileName: fileName,
  projectName: projectName,
  projectDescription: projectDescription,
  standardId: selectedStandard.id  // ← ADICIONAR ESTA LINHA
};

console.log('🚀 Memorial enviando com standardId:', selectedStandard.id);
const response = await api.post('/memorial/generate-gpt', requestData, {
  timeout: 300000,
});
*/

// ========================================
// 📁 ARQUIVO: Frontend/src/pages/Report.tsx
// ========================================

// ❌ CÓDIGO ATUAL (LINHA ~108):
/*
const response = await api.post<MemorialResponse>(
  '/memorial/generate-gpt',
  request
);
*/

// ✅ CÓDIGO CORRIGIDO:
/*
// Pegar norma do localStorage
const selectedStandard = JSON.parse(localStorage.getItem('selectedStandard') || '{}');
if (!selectedStandard.id) {
  throw new Error('Nenhuma norma selecionada. Selecione uma norma primeiro.');
}

const request = {
  entities: dxfEntities,
  fileName: fileName,
  projectName: projectName,
  projectDescription: projectDescription,
  standardId: selectedStandard.id  // ← ADICIONAR ESTA LINHA
};

console.log('🚀 Report enviando com standardId:', selectedStandard.id);
const response = await api.post<MemorialResponse>(
  '/memorial/generate-gpt',
  request
);
*/

// ========================================
// 📁 ARQUIVO: Frontend/src/components/Sidebar.tsx
// ========================================

// ❌ CÓDIGO ATUAL (LINHA ~316 e ~484):
/*
const response = await fetch('/api/memorial/generate-gpt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(testData),
});
*/

// ✅ CÓDIGO CORRIGIDO:
/*
// Pegar norma do localStorage
const selectedStandard = JSON.parse(localStorage.getItem('selectedStandard') || '{}');
if (!selectedStandard.id) {
  throw new Error('Nenhuma norma selecionada. Selecione uma norma primeiro.');
}

const testData = {
  entities: mockEntities,
  fileName: 'teste.dxf',
  projectName: 'Projeto Teste',
  projectDescription: 'Teste de geração',
  standardId: selectedStandard.id  // ← ADICIONAR ESTA LINHA
};

console.log('🚀 Sidebar enviando com standardId:', selectedStandard.id);
const response = await fetch('/api/memorial/generate-gpt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(testData),
});
*/

// ========================================
// 🎯 RESUMO DAS ALTERAÇÕES NECESSÁRIAS:
// ========================================

/*
1. EM TODOS OS ARQUIVOS que fazem requisição para '/memorial/generate-gpt':
   - Ler selectedStandard do localStorage
   - Verificar se selectedStandard.id existe
   - Incluir standardId no objeto da requisição
   - Adicionar log para debug

2. ARQUIVOS A ALTERAR:
   - Frontend/src/pages/Viewer.tsx
   - Frontend/src/pages/Memorial.tsx  
   - Frontend/src/pages/Report.tsx
   - Frontend/src/components/Sidebar.tsx

3. TESTE:
   - Após aplicar as correções, o backend vai receber standardId
   - Logs vão mostrar: "✅ Norma encontrada: NBR ABNT-NBR-17047 (ID: 12fb339a-89ce-457c-8292-b0109de2a1f1)"
*/

console.log('📋 Patch criado! Aplique as correções nos arquivos do frontend.');