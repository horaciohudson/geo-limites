// Script para debugar exatamente o que está sendo enviado para o backend
// Execute este script no console do navegador (F12)

console.log('🔍 DEBUG: O que está sendo enviado para o backend?');
console.log('================================================');

// 1. Verificar dados no localStorage
console.log('📦 1. DADOS NO LOCALSTORAGE:');
const selectedProperty = localStorage.getItem('selectedPropertyForMemorial');
console.log('selectedPropertyForMemorial:', selectedProperty);

if (selectedProperty) {
  try {
    const property = JSON.parse(selectedProperty);
    console.log('📋 Propriedade parseada:', {
      id: property.id,
      name: property.name,
      isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property.id)
    });
  } catch (e) {
    console.error('❌ Erro ao parsear propriedade:', e);
  }
}

// 2. Simular função getSelectedPropertyId
console.log('\n🔍 2. TESTANDO FUNÇÃO getSelectedPropertyId:');
function getSelectedPropertyId() {
  try {
    const selectedProperty = JSON.parse(localStorage.getItem('selectedPropertyForMemorial') || 'null');
    
    if (selectedProperty && selectedProperty.id) {
      console.log('🏠 PropertyId encontrado no localStorage:', selectedProperty.id);
      return selectedProperty.id;
    }
    
    const properties = JSON.parse(localStorage.getItem('properties') || '[]');
    if (properties.length > 0) {
      const lastProperty = properties[properties.length - 1];
      console.log('🏠 Usando última propriedade criada:', lastProperty.propertyId || lastProperty.id);
      return lastProperty.propertyId || lastProperty.id;
    }
    
    console.warn('⚠️ Nenhuma propriedade encontrada no localStorage');
    return null;
  } catch (e) {
    console.error('❌ Erro ao ler propriedade do localStorage:', e);
    return null;
  }
}

const propertyId = getSelectedPropertyId();
console.log('🎯 Resultado da função:', propertyId);

// 3. Interceptar requisições para /memorial/generate-gpt
console.log('\n🌐 3. INTERCEPTANDO REQUISIÇÕES:');

const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const options = args[1];
  
  if (typeof url === 'string' && url.includes('/memorial/generate-gpt')) {
    console.log('🚀 REQUISIÇÃO INTERCEPTADA!');
    console.log('📡 URL:', url);
    console.log('📤 Method:', options?.method);
    console.log('📋 Headers:', options?.headers);
    
    if (options?.body) {
      try {
        const requestData = JSON.parse(options.body);
        console.log('📦 DADOS ENVIADOS:');
        console.log('   └─ propertyId:', requestData.propertyId);
        console.log('   └─ standardId:', requestData.standardId);
        console.log('   └─ projectName:', requestData.projectName);
        console.log('   └─ entities:', requestData.entities?.length || 0);
        console.log('   └─ propertyData:', !!requestData.propertyData);
        
        if (requestData.propertyData) {
          console.log('🏠 PROPERTY DATA DETALHADO:');
          console.log('   └─ name:', requestData.propertyData.name);
          console.log('   └─ ownerName:', requestData.propertyData.ownerName);
          console.log('   └─ street:', requestData.propertyData.street);
          console.log('   └─ city:', requestData.propertyData.city);
        }
        
        // Verificar se propertyId está null/undefined
        if (!requestData.propertyId) {
          console.log('❌ PROBLEMA ENCONTRADO: propertyId está null/undefined!');
          console.log('💡 Possíveis causas:');
          console.log('   - Função getSelectedPropertyId() retorna null');
          console.log('   - Propriedade não está no localStorage');
          console.log('   - Erro na serialização JSON');
        } else {
          console.log('✅ PropertyId está sendo enviado corretamente');
        }
        
      } catch (e) {
        console.error('❌ Erro ao parsear body da requisição:', e);
      }
    }
  }
  
  return originalFetch.apply(this, args);
};

console.log('✅ Interceptador de requisições ativado');

// 4. Simular dados que seriam enviados
console.log('\n🧪 4. SIMULAÇÃO DE DADOS:');
const mockRequestData = {
  entities: [],
  fileName: 'TESTE.dxf',
  projectName: 'Teste PropertyId',
  projectDescription: 'Teste para verificar propertyId',
  standardId: '12fb339a-89ce-457c-8292-b0109de2a1f1',
  propertyId: propertyId,
  propertyData: selectedProperty ? JSON.parse(selectedProperty) : null
};

console.log('📦 Dados que seriam enviados:');
console.log(JSON.stringify(mockRequestData, null, 2));

console.log('\n📝 INSTRUÇÕES:');
console.log('==============');
console.log('1. Agora gere um memorial no Viewer');
console.log('2. Observe as mensagens de interceptação acima');
console.log('3. Verifique se propertyId está sendo enviado');
console.log('4. Compare com os logs do backend');

console.log('\n⏰ Aguardando geração de memorial...');