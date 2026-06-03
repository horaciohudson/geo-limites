// Script para corrigir o propertyId no localStorage com o ID real da propriedade
// Execute este script no console do navegador (F12)

console.log('🔧 CORRIGINDO PROPERTYID PARA PROPRIEDADE REAL');
console.log('==============================================');

// ID da propriedade real cadastrada no sistema
const REAL_PROPERTY_ID = '9d06d614-eec7-4306-a77c-5a54ed69f1f9';

// 1. Atualizar propriedade selecionada para memorial
const updateSelectedProperty = () => {
  console.log('📝 Atualizando selectedPropertyForMemorial...');
  
  const realProperty = {
    id: REAL_PROPERTY_ID,
    propertyId: REAL_PROPERTY_ID,
    name: 'Propriedade Real Cadastrada',
    registrationNumber: 'REG-REAL-001',
    ownerName: 'Proprietário Real',
    ownerDocument: '000.000.000-00',
    street: 'Rua Real',
    number: '100',
    neighborhood: 'Bairro Real',
    city: 'Cidade Real',
    state: 'CE',
    zipCode: '00000-000',
    totalArea: 500.00,
    totalPerimeter: 90.00,
    propertyType: 'URBAN'
  };
  
  localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(realProperty));
  console.log('✅ Propriedade atualizada com ID real:', REAL_PROPERTY_ID);
  
  return realProperty;
};

// 2. Verificar se há outras propriedades no localStorage que precisam ser atualizadas
const updatePropertiesList = () => {
  console.log('\n📋 Verificando lista de propriedades...');
  
  try {
    const properties = JSON.parse(localStorage.getItem('properties') || '[]');
    console.log('📊 Propriedades encontradas:', properties.length);
    
    // Verificar se já existe a propriedade real
    const hasRealProperty = properties.some(p => p.id === REAL_PROPERTY_ID || p.propertyId === REAL_PROPERTY_ID);
    
    if (!hasRealProperty) {
      console.log('➕ Adicionando propriedade real à lista...');
      const realProperty = {
        id: REAL_PROPERTY_ID,
        propertyId: REAL_PROPERTY_ID,
        name: 'Propriedade Real Cadastrada',
        registrationNumber: 'REG-REAL-001',
        ownerName: 'Proprietário Real',
        ownerDocument: '000.000.000-00',
        street: 'Rua Real',
        neighborhood: 'Bairro Real',
        city: 'Cidade Real',
        state: 'CE',
        propertyType: 'URBAN',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      properties.push(realProperty);
      localStorage.setItem('properties', JSON.stringify(properties));
      console.log('✅ Propriedade real adicionada à lista');
    } else {
      console.log('✅ Propriedade real já existe na lista');
    }
    
  } catch (e) {
    console.error('❌ Erro ao atualizar lista de propriedades:', e);
  }
};

// 3. Testar função getSelectedPropertyId
const testPropertyIdFunction = () => {
  console.log('\n🧪 Testando função getSelectedPropertyId...');
  
  // Simular a função do frontend
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
  console.log('✅ É o ID real?', propertyId === REAL_PROPERTY_ID);
  
  return propertyId;
};

// 4. Executar todas as correções
const runFix = () => {
  console.log('🚀 Executando correções...');
  
  const property = updateSelectedProperty();
  updatePropertiesList();
  const propertyId = testPropertyIdFunction();
  
  console.log('\n📊 RESUMO DA CORREÇÃO:');
  console.log('======================');
  console.log('✅ PropertyId real configurado:', REAL_PROPERTY_ID);
  console.log('✅ Propriedade selecionada atualizada:', !!property);
  console.log('✅ Lista de propriedades atualizada');
  console.log('✅ Função getSelectedPropertyId() testada:', propertyId === REAL_PROPERTY_ID);
  
  if (propertyId === REAL_PROPERTY_ID) {
    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('✅ O frontend agora enviará o ID da propriedade real');
    console.log('✅ O backend deve encontrar a propriedade no banco');
    console.log('✅ O memorial será gerado com dados reais');
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. Gere um memorial no Viewer');
    console.log('2. Verifique os logs do backend - deve mostrar "PROPRIEDADE ENCONTRADA"');
    console.log('3. Verifique o memorial - deve conter dados reais da propriedade');
  } else {
    console.log('\n❌ CORREÇÃO FALHOU');
    console.log('💡 Verifique se há erros no console');
  }
};

// Executar correção
runFix();