// Implementação de seleção dinâmica de propriedades reais
// Execute este script no console do navegador (F12)

console.log('🔧 IMPLEMENTANDO SELEÇÃO DINÂMICA DE PROPRIEDADES');
console.log('================================================');

// Função para buscar propriedades reais do backend
const fetchRealProperties = async () => {
  console.log('📡 Buscando propriedades reais do backend...');
  
  try {
    const response = await fetch('/api/properties', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const properties = await response.json();
    console.log('✅ Propriedades encontradas:', properties.length);
    
    properties.forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.name || 'Sem nome'} (ID: ${prop.propertyId || prop.id})`);
    });
    
    return properties;
    
  } catch (error) {
    console.error('❌ Erro ao buscar propriedades:', error);
    return [];
  }
};

// Função para selecionar automaticamente a primeira propriedade disponível
const selectFirstAvailableProperty = async () => {
  console.log('\n🎯 Selecionando primeira propriedade disponível...');
  
  const properties = await fetchRealProperties();
  
  if (properties.length === 0) {
    console.log('❌ Nenhuma propriedade encontrada no backend');
    console.log('💡 Você precisa cadastrar uma propriedade primeiro');
    return null;
  }
  
  // Selecionar a primeira propriedade
  const selectedProperty = properties[0];
  const propertyId = selectedProperty.propertyId || selectedProperty.id;
  
  console.log('✅ Propriedade selecionada:', selectedProperty.name || 'Sem nome');
  console.log('🆔 ID:', propertyId);
  
  // Salvar no localStorage
  localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(selectedProperty));
  
  return selectedProperty;
};

// Função para criar interface de seleção de propriedades
const createPropertySelector = async () => {
  console.log('\n🎨 Criando seletor de propriedades...');
  
  const properties = await fetchRealProperties();
  
  if (properties.length === 0) {
    console.log('❌ Nenhuma propriedade para selecionar');
    return;
  }
  
  console.log('\n📋 PROPRIEDADES DISPONÍVEIS:');
  console.log('============================');
  
  properties.forEach((prop, index) => {
    const name = prop.name || 'Sem nome';
    const id = prop.propertyId || prop.id;
    const owner = prop.ownerName || 'Sem proprietário';
    
    console.log(`${index + 1}. ${name}`);
    console.log(`   └─ ID: ${id}`);
    console.log(`   └─ Proprietário: ${owner}`);
    console.log(`   └─ Comando: selectProperty(${index})`);
    console.log('');
  });
  
  // Criar função global para seleção
  window.selectProperty = (index) => {
    if (index < 0 || index >= properties.length) {
      console.log('❌ Índice inválido');
      return;
    }
    
    const selected = properties[index];
    localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(selected));
    
    console.log('✅ Propriedade selecionada:', selected.name || 'Sem nome');
    console.log('🆔 ID:', selected.propertyId || selected.id);
    console.log('💾 Salva no localStorage');
    
    return selected;
  };
  
  console.log('💡 Para selecionar uma propriedade, digite: selectProperty(0), selectProperty(1), etc.');
};

// Função principal
const implementDynamicSelection = async () => {
  console.log('🚀 Implementando seleção dinâmica...');
  
  // Tentar selecionar automaticamente
  const autoSelected = await selectFirstAvailableProperty();
  
  if (autoSelected) {
    console.log('\n✅ SELEÇÃO AUTOMÁTICA CONCLUÍDA');
    console.log('🎯 Propriedade configurada automaticamente');
    console.log('💡 Para mudar, use o seletor abaixo');
  }
  
  // Criar seletor para mudanças futuras
  await createPropertySelector();
  
  console.log('\n📋 RESUMO:');
  console.log('==========');
  console.log('✅ Sistema configurado para usar propriedades reais do backend');
  console.log('✅ Propriedade selecionada automaticamente (se disponível)');
  console.log('✅ Interface de seleção criada para mudanças futuras');
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('===================');
  console.log('1. Gere um memorial no Viewer');
  console.log('2. O sistema usará a propriedade real selecionada');
  console.log('3. Para mudar propriedade: selectProperty(índice)');
};

// Executar implementação
implementDynamicSelection();