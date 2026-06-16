// Teste final para verificar se o propertyId está sendo enviado corretamente
// Execute este script no console do navegador (F12)

console.log('🎯 TESTE FINAL - PROPERTYID NO MEMORIAL');
console.log('======================================');

// 1. Garantir que há uma propriedade válida no localStorage
const ensureValidProperty = () => {
  console.log('🔧 Garantindo propriedade válida no localStorage...');
  
  const validProperty = {
    id: '12345678-1234-1234-1234-123456789012',
    propertyId: '12345678-1234-1234-1234-123456789012',
    name: 'Propriedade Teste Final',
    registrationNumber: 'TEST-FINAL-001',
    ownerName: 'João da Silva Santos',
    ownerDocument: '123.456.789-00',
    street: 'Rua Maria Ivani da Silva',
    number: '123',
    neighborhood: 'Gameleira',
    city: 'Horizonte',
    state: 'CE',
    zipCode: '62755-000',
    totalArea: 600.00,
    totalPerimeter: 100.00,
    propertyType: 'URBAN'
  };
  
  localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(validProperty));
  console.log('✅ Propriedade válida configurada:', validProperty.name);
  return validProperty;
};

// 2. Testar função getSelectedPropertyId
const testGetPropertyId = () => {
  console.log('\n🧪 Testando função getSelectedPropertyId...');
  
  // Simular a função do Viewer.tsx
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
  console.log('✅ Função OK:', !!propertyId);
  
  return propertyId;
};

// 3. Interceptar requisições para monitorar
const setupRequestInterceptor = () => {
  console.log('\n🌐 Configurando interceptador de requisições...');
  
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1];
    
    if (typeof url === 'string' && url.includes('/memorial/generate-gpt')) {
      console.log('\n🚀 REQUISIÇÃO DE MEMORIAL INTERCEPTADA!');
      console.log('📡 URL:', url);
      console.log('📅 Timestamp:', new Date().toISOString());
      
      if (options?.body) {
        try {
          const requestData = JSON.parse(options.body);
          console.log('📦 DADOS DA REQUISIÇÃO:');
          console.log('   └─ propertyId:', requestData.propertyId);
          console.log('   └─ tipo:', typeof requestData.propertyId);
          console.log('   └─ é null?', requestData.propertyId === null);
          console.log('   └─ é undefined?', requestData.propertyId === undefined);
          console.log('   └─ é string vazia?', requestData.propertyId === '');
          console.log('   └─ standardId:', requestData.standardId);
          console.log('   └─ projectName:', requestData.projectName);
          console.log('   └─ entidades:', requestData.entities?.length || 0);
          
          if (requestData.propertyId) {
            console.log('🎉 SUCESSO! PropertyId está sendo enviado:', requestData.propertyId);
          } else {
            console.log('❌ PROBLEMA! PropertyId não está sendo enviado ou está null/undefined');
          }
          
        } catch (e) {
          console.error('❌ Erro ao parsear requisição:', e);
        }
      }
    }
    
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ Interceptador configurado');
};

// 4. Monitorar logs do console
const setupConsoleMonitor = () => {
  console.log('\n📊 Configurando monitor de logs...');
  
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Capturar logs específicos do Viewer
    if (message.includes('PropertyId encontrado') || 
        message.includes('VERIFICAÇÃO FINAL') ||
        message.includes('PropertyId corrigido')) {
      originalLog.apply(console, ['🎯 LOG CAPTURADO:', ...args]);
    } else {
      originalLog.apply(console, args);
    }
  };
  
  console.error = function(...args) {
    const message = args.join(' ');
    
    if (message.includes('PropertyId') || message.includes('propertyId')) {
      originalLog.apply(console, ['🚨 ERRO CAPTURADO:', ...args]);
    } else {
      originalError.apply(console, args);
    }
  };
  
  console.log('✅ Monitor de logs configurado');
};

// 5. Executar todos os testes
const runAllTests = () => {
  console.log('\n🚀 EXECUTANDO TODOS OS TESTES...');
  
  const property = ensureValidProperty();
  const propertyId = testGetPropertyId();
  setupRequestInterceptor();
  setupConsoleMonitor();
  
  console.log('\n📋 RESUMO DOS TESTES:');
  console.log('====================');
  console.log('✅ Propriedade no localStorage:', !!property);
  console.log('✅ Função getSelectedPropertyId():', !!propertyId);
  console.log('✅ Interceptador de requisições:', 'ativo');
  console.log('✅ Monitor de logs:', 'ativo');
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('===================');
  console.log('1. Vá para o Viewer (visualizar um arquivo DXF)');
  console.log('2. Clique no botão "Gerar Memorial"');
  console.log('3. Observe os logs interceptados acima');
  console.log('4. Verifique se propertyId está sendo enviado');
  
  console.log('\n⏰ Aguardando geração de memorial...');
  console.log('📊 Monitorando requisições e logs...');
};

// Executar testes
runAllTests();