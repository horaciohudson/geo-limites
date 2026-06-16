// Teste final para verificar se a correção do UUID resolveu o problema
// Execute este script no console do navegador (F12)

console.log('🧪 TESTE FINAL - CORREÇÃO DO UUID');
console.log('=================================');

// 1. Verificar se os UUIDs estão corretos
const checkUUIDs = () => {
  console.log('🔍 Verificando UUIDs no localStorage...');
  
  const selectedProperty = localStorage.getItem('selectedPropertyForMemorial');
  if (selectedProperty) {
    try {
      const property = JSON.parse(selectedProperty);
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property.id);
      
      console.log('📋 Propriedade selecionada:');
      console.log('   └─ ID:', property.id);
      console.log('   └─ Nome:', property.name);
      console.log('   └─ UUID válido:', isValidUUID ? '✅ SIM' : '❌ NÃO');
      
      return isValidUUID;
    } catch (e) {
      console.error('❌ Erro ao verificar propriedade:', e);
      return false;
    }
  } else {
    console.log('⚠️ Nenhuma propriedade selecionada');
    return false;
  }
};

// 2. Simular requisição para testar se o backend aceita
const testBackendRequest = async () => {
  console.log('\n🌐 Testando comunicação com backend...');
  
  const selectedProperty = JSON.parse(localStorage.getItem('selectedPropertyForMemorial') || 'null');
  if (!selectedProperty) {
    console.log('❌ Nenhuma propriedade para testar');
    return false;
  }
  
  // Dados de teste mínimos
  const testRequest = {
    entities: [],
    fileName: 'TESTE.dxf',
    projectName: 'Teste UUID',
    projectDescription: 'Teste para verificar se UUID está funcionando',
    standardId: '12fb339a-89ce-457c-8292-b0109de2a1f1',
    propertyId: selectedProperty.id,
    propertyData: {
      registrationNumber: selectedProperty.registrationNumber,
      name: selectedProperty.name,
      street: selectedProperty.street,
      neighborhood: selectedProperty.neighborhood,
      city: selectedProperty.city,
      state: selectedProperty.state,
      ownerName: selectedProperty.ownerName,
      ownerDocument: selectedProperty.ownerDocument,
      propertyType: selectedProperty.propertyType
    }
  };
  
  console.log('📤 Enviando requisição de teste...');
  console.log('🔍 PropertyId:', testRequest.propertyId);
  
  try {
    const response = await fetch('/api/memorial/generate-gpt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(testRequest)
    });
    
    console.log('📥 Resposta do backend:', response.status);
    
    if (response.ok) {
      console.log('✅ SUCESSO! Backend aceitou a requisição');
      const result = await response.json();
      console.log('📝 Memorial gerado:', result.memorialText ? 'SIM' : 'NÃO');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Erro do backend:', response.status);
      console.log('📄 Detalhes:', errorText);
      
      if (errorText.includes('UUID')) {
        console.log('💡 Ainda há problema com UUID - execute fix-property-uuid.js');
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return false;
  }
};

// 3. Executar testes
const runTests = async () => {
  const uuidValid = checkUUIDs();
  
  if (!uuidValid) {
    console.log('\n❌ UUID inválido detectado');
    console.log('💡 Execute o script fix-property-uuid.js primeiro');
    return;
  }
  
  console.log('\n✅ UUID válido - testando backend...');
  const backendOk = await testBackendRequest();
  
  console.log('\n🎯 RESULTADO FINAL:');
  console.log('==================');
  
  if (backendOk) {
    console.log('🎉 CORREÇÃO FUNCIONOU!');
    console.log('✅ UUID está válido');
    console.log('✅ Backend aceita as requisições');
    console.log('✅ Memorial pode ser gerado');
    console.log('\n💡 Agora você pode usar o botão "Gerar Memorial" normalmente');
  } else {
    console.log('❌ Ainda há problemas');
    console.log('💡 Verifique:');
    console.log('- Se o backend está rodando na porta 9010');
    console.log('- Se você está logado (token válido)');
    console.log('- Se há outros erros no console');
  }
};

// Executar testes
runTests();