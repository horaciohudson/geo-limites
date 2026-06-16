// Versão melhorada da seleção de propriedades
// Este código pode ser integrado ao sistema principal

console.log('🔧 FUNÇÃO MELHORADA DE SELEÇÃO DE PROPRIEDADES');
console.log('==============================================');

// Função melhorada para obter propertyId
function getSelectedPropertyIdImproved() {
  try {
    console.log('🔍 Iniciando busca por propertyId...');
    
    // 1. Tentar buscar propriedade selecionada especificamente para memorial
    const selectedForMemorial = localStorage.getItem('selectedPropertyForMemorial');
    if (selectedForMemorial) {
      try {
        const property = JSON.parse(selectedForMemorial);
        const id = property.propertyId || property.id;
        if (id) {
          console.log('✅ PropertyId encontrado em selectedPropertyForMemorial:', id);
          return id;
        }
      } catch (e) {
        console.warn('⚠️ Erro ao parsear selectedPropertyForMemorial:', e);
      }
    }
    
    // 2. Tentar buscar da propriedade selecionada geral
    const selectedProperty = localStorage.getItem('selectedProperty');
    if (selectedProperty) {
      try {
        const property = JSON.parse(selectedProperty);
        const id = property.propertyId || property.id;
        if (id) {
          console.log('✅ PropertyId encontrado em selectedProperty:', id);
          return id;
        }
      } catch (e) {
        console.warn('⚠️ Erro ao parsear selectedProperty:', e);
      }
    }
    
    // 3. Tentar buscar da lista de propriedades (última ativa)
    const properties = localStorage.getItem('properties');
    if (properties) {
      try {
        const propList = JSON.parse(properties);
        if (Array.isArray(propList) && propList.length > 0) {
          // Buscar propriedade ativa ou a última
          const activeProperty = propList.find(p => p.active === true) || propList[propList.length - 1];
          const id = activeProperty.propertyId || activeProperty.id;
          if (id) {
            console.log('✅ PropertyId encontrado na lista de propriedades:', id);
            return id;
          }
        }
      } catch (e) {
        console.warn('⚠️ Erro ao parsear lista de propriedades:', e);
      }
    }
    
    // 4. Se não encontrou nada, tentar buscar do backend
    console.log('⚠️ Nenhuma propriedade encontrada no localStorage');
    console.log('💡 Sugestão: Execute implement-dynamic-property-selection.js para configurar');
    
    return null;
    
  } catch (error) {
    console.error('❌ Erro geral na busca por propertyId:', error);
    return null;
  }
}

// Função para validar se um propertyId é válido (formato UUID)
function isValidPropertyId(propertyId) {
  if (!propertyId || typeof propertyId !== 'string') {
    return false;
  }
  
  // Verificar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(propertyId);
}

// Função para buscar propriedades do backend quando necessário
async function fetchAndSelectProperty() {
  console.log('🌐 Buscando propriedades do backend...');
  
  try {
    const response = await fetch('/api/properties', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const properties = await response.json();
    
    if (properties.length > 0) {
      const firstProperty = properties[0];
      localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(firstProperty));
      
      console.log('✅ Propriedade selecionada automaticamente:', firstProperty.name);
      return firstProperty.propertyId || firstProperty.id;
    } else {
      console.log('❌ Nenhuma propriedade encontrada no backend');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar propriedades do backend:', error);
    return null;
  }
}

// Função principal melhorada
async function getPropertyIdWithFallback() {
  console.log('🎯 Obtendo propertyId com fallback...');
  
  // Tentar obter do localStorage primeiro
  let propertyId = getSelectedPropertyIdImproved();
  
  // Validar se é um UUID válido
  if (propertyId && isValidPropertyId(propertyId)) {
    console.log('✅ PropertyId válido encontrado:', propertyId);
    return propertyId;
  }
  
  // Se não encontrou ou não é válido, tentar buscar do backend
  console.log('🔄 Tentando buscar do backend...');
  propertyId = await fetchAndSelectProperty();
  
  if (propertyId && isValidPropertyId(propertyId)) {
    console.log('✅ PropertyId obtido do backend:', propertyId);
    return propertyId;
  }
  
  console.log('❌ Não foi possível obter um propertyId válido');
  return null;
}

// Testar a função melhorada
console.log('\n🧪 TESTANDO FUNÇÃO MELHORADA...');
getPropertyIdWithFallback().then(result => {
  console.log('\n📊 RESULTADO DO TESTE:');
  console.log('======================');
  console.log('PropertyId obtido:', result);
  console.log('É válido:', isValidPropertyId(result));
  
  if (result) {
    console.log('🎉 SUCESSO! Sistema pronto para gerar memorial com propriedade real');
  } else {
    console.log('❌ FALHA! Você precisa cadastrar uma propriedade primeiro');
  }
});

// Disponibilizar funções globalmente para uso
window.getSelectedPropertyIdImproved = getSelectedPropertyIdImproved;
window.getPropertyIdWithFallback = getPropertyIdWithFallback;
window.isValidPropertyId = isValidPropertyId;