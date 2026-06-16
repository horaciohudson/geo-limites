// Script para buscar e usar a propriedade REAL do banco de dados
// Execute este script no console do navegador (F12)

console.log('🔍 BUSCANDO PROPRIEDADE REAL DO BANCO DE DADOS');
console.log('==============================================');

// Função para buscar propriedades reais do backend
const fetchRealPropertiesFromDB = async () => {
  console.log('📡 Conectando ao backend para buscar propriedades reais...');
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ Token não encontrado - faça login primeiro');
      return [];
    }
    
    console.log('🔑 Token encontrado, fazendo requisição...');
    
    const response = await fetch('/api/properties', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Erro na resposta:', errorText);
      return [];
    }
    
    const properties = await response.json();
    console.log('✅ Propriedades recebidas do banco:', properties.length);
    
    return properties;
    
  } catch (error) {
    console.error('❌ Erro ao buscar propriedades:', error);
    return [];
  }
};

// Função para mostrar propriedades encontradas
const displayRealProperties = (properties) => {
  console.log('\n📋 PROPRIEDADES REAIS DO BANCO DE DADOS:');
  console.log('========================================');
  
  if (properties.length === 0) {
    console.log('❌ Nenhuma propriedade encontrada no banco');
    console.log('💡 Você precisa cadastrar uma propriedade primeiro');
    return;
  }
  
  properties.forEach((prop, index) => {
    console.log(`\n${index + 1}. PROPRIEDADE REAL:`);
    console.log('   🆔 ID:', prop.propertyId || prop.id);
    console.log('   📝 Nome:', prop.name || 'Sem nome');
    console.log('   📋 Registro:', prop.registrationNumber || 'Sem registro');
    console.log('   👤 Proprietário:', prop.ownerName || 'Sem proprietário');
    console.log('   🏠 Endereço:', prop.street || 'Sem endereço');
    console.log('   🏙️ Cidade:', prop.city || 'Sem cidade');
    console.log('   📏 Área:', prop.totalArea || 'Sem área');
    console.log('   📐 Perímetro:', prop.totalPerimeter || 'Sem perímetro');
    console.log('   🏷️ Tipo:', prop.propertyType || 'Sem tipo');
    console.log('   ✅ Ativa:', prop.active !== false ? 'SIM' : 'NÃO');
  });
};

// Função para substituir dados fictícios por dados reais
const replaceWithRealProperty = (properties) => {
  if (properties.length === 0) {
    console.log('\n❌ Não é possível substituir - nenhuma propriedade real encontrada');
    return false;
  }
  
  console.log('\n🔄 SUBSTITUINDO DADOS FICTÍCIOS POR DADOS REAIS...');
  
  // Pegar a primeira propriedade real (ou você pode escolher outra)
  const realProperty = properties[0];
  
  console.log('📝 Propriedade selecionada:', realProperty.name || 'Sem nome');
  console.log('🆔 ID real:', realProperty.propertyId || realProperty.id);
  
  // Substituir no localStorage
  localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(realProperty));
  
  console.log('✅ localStorage atualizado com dados reais do banco!');
  
  return true;
};

// Função para comparar dados fictícios vs reais
const compareData = (realProperties) => {
  console.log('\n🔍 COMPARAÇÃO: DADOS FICTÍCIOS vs DADOS REAIS');
  console.log('=============================================');
  
  const currentData = localStorage.getItem('selectedPropertyForMemorial');
  if (currentData) {
    try {
      const current = JSON.parse(currentData);
      console.log('\n❌ DADOS ATUAIS (FICTÍCIOS):');
      console.log('   🆔 ID:', current.id);
      console.log('   📝 Nome:', current.name);
      console.log('   👤 Proprietário:', current.ownerName);
      console.log('   🏠 Endereço:', current.street);
      console.log('   🏙️ Cidade:', current.city);
    } catch (e) {
      console.log('❌ Erro ao parsear dados atuais');
    }
  }
  
  if (realProperties.length > 0) {
    const real = realProperties[0];
    console.log('\n✅ DADOS REAIS (DO BANCO):');
    console.log('   🆔 ID:', real.propertyId || real.id);
    console.log('   📝 Nome:', real.name);
    console.log('   👤 Proprietário:', real.ownerName);
    console.log('   🏠 Endereço:', real.street);
    console.log('   🏙️ Cidade:', real.city);
  }
};

// Função principal
const fetchAndReplaceWithRealData = async () => {
  console.log('🚀 Iniciando busca por dados reais...');
  
  // Buscar propriedades reais do banco
  const realProperties = await fetchRealPropertiesFromDB();
  
  // Mostrar propriedades encontradas
  displayRealProperties(realProperties);
  
  // Comparar dados
  compareData(realProperties);
  
  // Substituir por dados reais
  const success = replaceWithRealProperty(realProperties);
  
  if (success) {
    console.log('\n🎉 SUCESSO! DADOS REAIS CONFIGURADOS');
    console.log('=====================================');
    console.log('✅ localStorage agora contém dados reais do banco');
    console.log('✅ O frontend enviará o ID real da propriedade');
    console.log('✅ O backend encontrará a propriedade no banco');
    console.log('✅ O memorial será gerado com dados verdadeiros');
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. Gere um memorial no Viewer');
    console.log('2. Verifique os logs - deve mostrar "PROPRIEDADE ENCONTRADA"');
    console.log('3. O memorial deve conter dados reais da propriedade');
  } else {
    console.log('\n❌ FALHA! NÃO FOI POSSÍVEL CONFIGURAR DADOS REAIS');
    console.log('===============================================');
    console.log('💡 Você precisa cadastrar uma propriedade no sistema primeiro');
    console.log('💡 Vá em "Cadastro de Propriedade" e crie uma propriedade real');
  }
};

// Executar
fetchAndReplaceWithRealData();