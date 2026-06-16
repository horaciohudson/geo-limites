// PATCH URGENTE: Adicionar propertyId nas requisições de memorial
// PROBLEMA: Frontend não está enviando propertyId, então backend não consegue usar dados reais da propriedade

// ========================================
// 📁 ARQUIVO: Frontend/src/components/Sidebar.tsx
// ========================================

// 🔧 FUNÇÃO AUXILIAR PARA ADICIONAR NO INÍCIO DO ARQUIVO:
/*
// Função para obter propertyId selecionado do localStorage
function getSelectedPropertyId() {
  try {
    const selectedProperty = JSON.parse(localStorage.getItem('selectedProperty') || 'null');
    if (selectedProperty && selectedProperty.propertyId) {
      console.log('🏠 PropertyId encontrado no localStorage:', selectedProperty.propertyId);
      return selectedProperty.propertyId;
    }
    
    if (selectedProperty && selectedProperty.id) {
      console.log('🏠 PropertyId encontrado como .id no localStorage:', selectedProperty.id);
      return selectedProperty.id;
    }
    
    console.warn('⚠️ Nenhuma propriedade selecionada no localStorage');
    return null;
  } catch (e) {
    console.error('❌ Erro ao ler selectedProperty do localStorage:', e);
    return null;
  }
}
*/

// ========================================
// 🔧 CORREÇÃO 1: Teste de Coordenadas Reais (linha ~320)
// ========================================

// ❌ CÓDIGO ATUAL:
/*
const testData = {
  entities: [
    // ... entidades
  ],
  fileName: 'TESTE AGENTE_DBL TERRA NOBRE_1.dxf',
  projectName: 'Teste com Coordenadas REAIS',
  projectDescription: 'Teste usando coordenadas reais extraídas: X(2901-2999), Y(1475-1569)',
  standardId: (() => {
    const standards = JSON.parse(localStorage.getItem('standards') || '[]');
    const activeStandard = standards.find((s: any) => s.active);
    return activeStandard?.id || '12fb339a-89ce-457c-8292-b0109de2a1f1';
  })()
};
*/

// ✅ CÓDIGO CORRIGIDO:
/*
const testData = {
  entities: [
    // ... entidades
  ],
  fileName: 'TESTE AGENTE_DBL TERRA NOBRE_1.dxf',
  projectName: 'Teste com Coordenadas REAIS',
  projectDescription: 'Teste usando coordenadas reais extraídas: X(2901-2999), Y(1475-1569)',
  standardId: (() => {
    const standards = JSON.parse(localStorage.getItem('standards') || '[]');
    const activeStandard = standards.find((s: any) => s.active);
    return activeStandard?.id || '12fb339a-89ce-457c-8292-b0109de2a1f1';
  })(),
  propertyId: getSelectedPropertyId() // ← NOVA LINHA CRÍTICA
};
*/

// ========================================
// 🔧 CORREÇÃO 2: Debug de Memorial (linha ~488)
// ========================================

// ❌ CÓDIGO ATUAL:
/*
const memorialData = {
  entities: entities.slice(0, 50), // Limitar para teste
  fileName: 'DEBUG_TEST.dxf',
  projectName: 'Debug Test',
  projectDescription: 'Teste de debug completo',
  standardId: null
};
*/

// ✅ CÓDIGO CORRIGIDO:
/*
const memorialData = {
  entities: entities.slice(0, 50), // Limitar para teste
  fileName: 'DEBUG_TEST.dxf',
  projectName: 'Debug Test',
  projectDescription: 'Teste de debug completo',
  standardId: null,
  propertyId: getSelectedPropertyId() // ← NOVA LINHA CRÍTICA
};
*/

// ========================================
// 🔧 CORREÇÃO 3: Memorial Principal (linha ~540)
// ========================================

// ❌ CÓDIGO ATUAL:
/*
const memorialData = {
  entities: allDxfData,
  fileName: fileNames,
  projectName: projectName,
  projectDescription: `Memorial descritivo gerado para: ${fileNames}`,
  standardId: savedNorms ? JSON.parse(savedNorms)[0]?.id : null
};
*/

// ✅ CÓDIGO CORRIGIDO:
/*
const memorialData = {
  entities: allDxfData,
  fileName: fileNames,
  projectName: projectName,
  projectDescription: `Memorial descritivo gerado para: ${fileNames}`,
  standardId: savedNorms ? JSON.parse(savedNorms)[0]?.id : null,
  propertyId: getSelectedPropertyId() // ← NOVA LINHA CRÍTICA
};
*/

// ========================================
// 📋 OUTROS ARQUIVOS QUE PODEM PRECISAR DE CORREÇÃO:
// ========================================

// 📁 Frontend/src/pages/Report.tsx (linha ~108):
/*
// ❌ ANTES:
const response = await api.post<MemorialResponse>(
  '/memorial/generate-gpt',
  request
);

// ✅ DEPOIS:
const requestWithProperty = {
  ...request,
  propertyId: getSelectedPropertyId()
};

const response = await api.post<MemorialResponse>(
  '/memorial/generate-gpt',
  requestWithProperty
);
*/

// ========================================
// 🧪 COMO TESTAR A CORREÇÃO:
// ========================================

/*
1. Aplicar as correções acima
2. No console do navegador, definir uma propriedade de teste:
   
   localStorage.setItem('selectedProperty', JSON.stringify({
     propertyId: '12345678-1234-1234-1234-123456789012',
     name: 'Propriedade Teste',
     ownerName: 'João Silva'
   }));

3. Gerar um memorial
4. Verificar os logs do backend - deve mostrar:
   ✅ PROPRIEDADE ENCONTRADA NO STORAGE!
   📝 Adicionado ao prompt - Nome: Propriedade Teste
   📝 Adicionado ao prompt - Proprietário: João Silva

5. Verificar se o memorial contém "João Silva" em vez de placeholders
*/

// ========================================
// 🎯 RESULTADO ESPERADO:
// ========================================

/*
ANTES da correção (logs do backend):
ℹ️ NENHUMA PROPRIEDADE ESPECIFICADA
📝 Memorial será gerado com dados genéricos/placeholders

DEPOIS da correção (logs do backend):
✅ PROPRIEDADE ENCONTRADA NO STORAGE!
📝 Adicionado ao prompt - Nome: [Nome real]
📝 Adicionado ao prompt - Proprietário: [Nome real]
🎉 EXCELENTE: Dados suficientes para memorial completo!
*/

console.log('🔧 PATCH_FRONTEND_PROPERTYID.js carregado');
console.log('📋 Aplique as correções acima no arquivo Sidebar.tsx');
console.log('🧪 Teste com localStorage.setItem para verificar funcionamento');