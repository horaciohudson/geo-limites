// Teste específico para verificar serialização do propertyId
// Execute este script no console do navegador (F12)

console.log('🧪 TESTE DE SERIALIZAÇÃO DO PROPERTYID');
console.log('======================================');

// 1. Verificar dados atuais no localStorage
const selectedProperty = localStorage.getItem('selectedPropertyForMemorial');
console.log('📦 Dados no localStorage:', selectedProperty);

if (!selectedProperty) {
  console.log('❌ Nenhuma propriedade no localStorage');
  console.log('💡 Criando propriedade de teste...');
  
  const testProperty = {
    id: '12345678-1234-1234-1234-123456789012',
    propertyId: '12345678-1234-1234-1234-123456789012',
    name: 'Propriedade Teste',
    registrationNumber: 'TEST-001',
    ownerName: 'João da Silva',
    ownerDocument: '123.456.789-00',
    street: 'Rua Maria Ivani da Silva',
    neighborhood: 'Gameleira',
    city: 'Horizonte',
    state: 'CE',
    propertyType: 'URBAN'
  };
  
  localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(testProperty));
  console.log('✅ Propriedade de teste criada');
}

// 2. Testar função getSelectedPropertyId
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
console.log('🎯 PropertyId retornado:', propertyId);
console.log('🔍 Tipo do propertyId:', typeof propertyId);
console.log('🔍 É UUID válido:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId));

// 3. Testar serialização JSON
const testRequest = {
  entities: [],
  fileName: 'TESTE.dxf',
  projectName: 'Teste Serialização',
  projectDescription: 'Teste para verificar serialização do propertyId',
  standardId: '12fb339a-89ce-457c-8292-b0109de2a1f1',
  propertyId: propertyId
};

console.log('\n📦 Objeto antes da serialização:');
console.log('propertyId:', testRequest.propertyId);
console.log('tipo:', typeof testRequest.propertyId);

const serialized = JSON.stringify(testRequest);
console.log('\n📤 JSON serializado:');
console.log(serialized);

const deserialized = JSON.parse(serialized);
console.log('\n📥 Objeto deserializado:');
console.log('propertyId:', deserialized.propertyId);
console.log('tipo:', typeof deserialized.propertyId);

// 4. Verificar se há diferença
if (testRequest.propertyId === deserialized.propertyId) {
  console.log('✅ Serialização/deserialização OK');
} else {
  console.log('❌ Problema na serialização/deserialização');
}

// 5. Testar requisição real
console.log('\n🌐 TESTANDO REQUISIÇÃO REAL:');

const testRealRequest = async () => {
  try {
    const response = await fetch('/api/memorial/generate-gpt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(testRequest)
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Erro do servidor:', errorText);
      
      if (errorText.includes('UUID')) {
        console.log('💡 PROBLEMA CONFIRMADO: Erro relacionado a UUID');
        console.log('🔧 SOLUÇÃO: Verificar se backend espera UUID e frontend envia string');
      }
    } else {
      console.log('✅ Requisição aceita pelo backend');
      const result = await response.json();
      console.log('📝 Resposta:', result);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
};

// 6. Interceptar requisições para ver exatamente o que é enviado
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const options = args[1];
  
  if (typeof url === 'string' && url.includes('/memorial/generate-gpt')) {
    console.log('\n🚀 REQUISIÇÃO INTERCEPTADA DETALHADA:');
    console.log('📡 URL:', url);
    
    if (options?.body) {
      const bodyStr = options.body;
      console.log('📤 Body (string):', bodyStr);
      
      try {
        const bodyObj = JSON.parse(bodyStr);
        console.log('📦 Body (objeto):');
        console.log('   └─ propertyId:', bodyObj.propertyId);
        console.log('   └─ tipo propertyId:', typeof bodyObj.propertyId);
        console.log('   └─ standardId:', bodyObj.standardId);
        console.log('   └─ tipo standardId:', typeof bodyObj.standardId);
        
        // Verificar se ambos são strings (como esperado pelo JSON)
        if (typeof bodyObj.propertyId === 'string' && typeof bodyObj.standardId === 'string') {
          console.log('✅ Ambos os IDs são strings (correto para JSON)');
        } else {
          console.log('❌ Tipos incorretos detectados');
        }
        
      } catch (e) {
        console.error('❌ Erro ao parsear body:', e);
      }
    }
  }
  
  return originalFetch.apply(this, args);
};

console.log('\n📝 EXECUTANDO TESTE REAL...');
testRealRequest();

console.log('\n📋 RESUMO DO TESTE:');
console.log('===================');
console.log('1. PropertyId no localStorage:', !!selectedProperty);
console.log('2. Função getSelectedPropertyId():', !!propertyId);
console.log('3. UUID válido:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId));
console.log('4. Serialização JSON:', 'testando...');
console.log('5. Requisição real:', 'executando...');

console.log('\n⏰ Aguarde os resultados da requisição...');