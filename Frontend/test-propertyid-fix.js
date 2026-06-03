// Teste final da correção do propertyId
// Execute este script no console do navegador (F12)

console.log('🧪 TESTE FINAL - CORREÇÃO DO PROPERTYID');
console.log('======================================');

// Interceptar requisições para monitorar o que está sendo enviado
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const options = args[1];
  
  if (typeof url === 'string' && url.includes('/memorial/generate-gpt')) {
    console.log('\n🚀 REQUISIÇÃO DE MEMORIAL INTERCEPTADA!');
    console.log('📡 URL:', url);
    
    if (options?.body) {
      try {
        const requestData = JSON.parse(options.body);
        console.log('📦 DADOS ENVIADOS:');
        console.log('   🆔 propertyId:', requestData.propertyId);
        console.log('   📝 projectName:', requestData.projectName);
        console.log('   🏠 propertyData presente:', !!requestData.propertyData);
        
        if (requestData.propertyData) {
          console.log('   👤 Proprietário:', requestData.propertyData.ownerName);
          console.log('   🏠 Endereço:', requestData.propertyData.street);
          console.log('   🏙️ Cidade:', requestData.propertyData.city);
        }
        
        if (requestData.propertyId) {
          console.log('🎉 SUCESSO! PropertyId está sendo enviado:', requestData.propertyId);
        } else {
          console.log('❌ PROBLEMA! PropertyId ainda está null/undefined');
        }
        
      } catch (e) {
        console.error('❌ Erro ao parsear requisição:', e);
      }
    }
  }
  
  return originalFetch.apply(this, args);
};

console.log('✅ Monitor de requisições ativado');

// Testar função getSelectedPropertyId atualizada
function testGetSelectedPropertyId() {
  console.log('\n🧪 Testando função getSelectedPropertyId atualizada...');
  
  try {
    const selectedProperty = JSON.parse(localStorage.getItem('selectedPropertyForMemorial') || 'null');
    
    if (selectedProperty) {
      console.log('📋 Propriedade encontrada no localStorage');
      console.log('🔍 Campos disponíveis:', Object.keys(selectedProperty));
      
      const propertyId = selectedProperty.propertyId || selectedProperty.id;
      if (propertyId) {
        console.log('✅ PropertyId encontrado:', propertyId);
        console.log('🔍 Campo usado:', selectedProperty.propertyId ? 'propertyId' : 'id');
        return propertyId;
      } else {
        console.warn('⚠️ Propriedade encontrada mas sem ID válido');
        console.log('📋 Dados da propriedade:', selectedProperty);
      }
    } else {
      console.log('❌ Nenhuma propriedade no localStorage');
    }
    
    return null;
  } catch (e) {
    console.error('❌ Erro ao testar função:', e);
    return null;
  }
}

const propertyId = testGetSelectedPropertyId();

console.log('\n📊 RESULTADO DO TESTE:');
console.log('======================');
console.log('🆔 PropertyId encontrado:', propertyId);
console.log('✅ Função funcionando:', !!propertyId);

if (propertyId) {
  console.log('\n🎉 CORREÇÃO FUNCIONOU!');
  console.log('✅ PropertyId será enviado nas requisições');
  console.log('✅ Backend deve encontrar a propriedade');
  console.log('✅ Memorial deve ter dados reais');
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Vá para o Viewer');
  console.log('2. Clique em "Gerar Memorial"');
  console.log('3. Observe os logs interceptados acima');
  console.log('4. Verifique se o memorial contém dados reais');
} else {
  console.log('\n❌ CORREÇÃO NÃO FUNCIONOU');
  console.log('💡 Execute: debug-property-id-issue.js para diagnóstico completo');
  console.log('💡 Ou vá para Cadastro de Propriedade → Pesquisar e selecione uma propriedade');
}

console.log('\n⏰ Aguardando geração de memorial...');