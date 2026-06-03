// Script para debugar e corrigir o problema do propertyId
// Execute este script no console do navegador (F12)

console.log('🔍 DEBUG: PROBLEMA DO PROPERTYID NULL');
console.log('====================================');

// 1. Verificar dados atuais no localStorage
const checkCurrentData = () => {
  console.log('📦 Verificando dados no localStorage...');
  
  const selectedProperty = localStorage.getItem('selectedPropertyForMemorial');
  console.log('🏠 selectedPropertyForMemorial:', selectedProperty);
  
  if (selectedProperty) {
    try {
      const property = JSON.parse(selectedProperty);
      console.log('📋 Dados parseados:', property);
      console.log('🔍 Campos disponíveis:', Object.keys(property));
      console.log('🆔 property.id:', property.id);
      console.log('🆔 property.propertyId:', property.propertyId);
      console.log('📝 property.name:', property.name);
      
      return property;
    } catch (e) {
      console.error('❌ Erro ao parsear propriedade:', e);
      return null;
    }
  } else {
    console.log('❌ Nenhuma propriedade no localStorage');
    return null;
  }
};

// 2. Simular função getSelectedPropertyId
const testGetPropertyId = () => {
  console.log('\n🧪 Testando função getSelectedPropertyId...');
  
  function getSelectedPropertyId() {
    try {
      const selectedProperty = JSON.parse(localStorage.getItem('selectedPropertyForMemorial') || 'null');
      
      if (selectedProperty) {
        const propertyId = selectedProperty.propertyId || selectedProperty.id;
        if (propertyId) {
          console.log('✅ PropertyId encontrado:', propertyId);
          console.log('🔍 Campo usado:', selectedProperty.propertyId ? 'propertyId' : 'id');
          return propertyId;
        } else {
          console.warn('⚠️ Propriedade encontrada mas sem ID válido:', selectedProperty);
        }
      }
      
      const properties = JSON.parse(localStorage.getItem('properties') || '[]');
      if (properties.length > 0) {
        const lastProperty = properties[properties.length - 1];
        const fallbackId = lastProperty.propertyId || lastProperty.id;
        if (fallbackId) {
          console.log('✅ Usando última propriedade criada:', fallbackId);
          return fallbackId;
        }
      }
      
      console.warn('⚠️ Nenhuma propriedade encontrada');
      return null;
    } catch (e) {
      console.error('❌ Erro:', e);
      return null;
    }
  }
  
  const result = getSelectedPropertyId();
  console.log('🎯 Resultado:', result);
  return result;
};

// 3. Corrigir dados se necessário
const fixPropertyData = (currentProperty) => {
  console.log('\n🔧 Verificando se precisa corrigir dados...');
  
  if (!currentProperty) {
    console.log('❌ Nenhuma propriedade para corrigir');
    return false;
  }
  
  // Verificar se tem ID válido
  const hasValidId = currentProperty.propertyId || currentProperty.id;
  
  if (!hasValidId) {
    console.log('❌ Propriedade sem ID válido - precisa corrigir');
    
    // Se tem dados mas não tem ID, pode ser que venha do banco com campo diferente
    if (currentProperty.name && currentProperty.ownerName) {
      console.log('💡 Propriedade tem dados mas sem ID - pode ser do banco');
      console.log('🔍 Tentando buscar ID do banco...');
      
      // Buscar propriedades do banco para encontrar o ID correto
      fetchPropertyIdFromBackend(currentProperty);
      return true;
    }
  } else {
    console.log('✅ Propriedade tem ID válido:', hasValidId);
    return false;
  }
};

// 4. Buscar ID correto do banco
const fetchPropertyIdFromBackend = async (currentProperty) => {
  console.log('📡 Buscando propriedades do banco para encontrar ID correto...');
  
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
    console.log('✅ Propriedades do banco:', properties.length);
    
    // Tentar encontrar a propriedade correspondente
    const matchingProperty = properties.find(p => 
      p.name === currentProperty.name || 
      p.ownerName === currentProperty.ownerName ||
      p.registrationNumber === currentProperty.registrationNumber
    );
    
    if (matchingProperty) {
      console.log('🎯 Propriedade correspondente encontrada!');
      console.log('🆔 ID correto:', matchingProperty.propertyId || matchingProperty.id);
      
      // Atualizar localStorage com dados completos
      localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(matchingProperty));
      console.log('✅ localStorage atualizado com dados corretos do banco');
      
      return matchingProperty.propertyId || matchingProperty.id;
    } else {
      console.log('❌ Nenhuma propriedade correspondente encontrada no banco');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar propriedades do banco:', error);
    return null;
  }
};

// 5. Executar diagnóstico completo
const runDiagnosis = async () => {
  console.log('🚀 Executando diagnóstico completo...');
  
  const currentProperty = checkCurrentData();
  const propertyId = testGetPropertyId();
  
  if (!propertyId) {
    console.log('\n❌ PROBLEMA CONFIRMADO: PropertyId é null');
    
    const needsFix = fixPropertyData(currentProperty);
    if (needsFix) {
      console.log('🔄 Tentando corrigir...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar correção
      
      // Testar novamente
      const newPropertyId = testGetPropertyId();
      if (newPropertyId) {
        console.log('🎉 CORREÇÃO APLICADA COM SUCESSO!');
        console.log('✅ PropertyId agora disponível:', newPropertyId);
      } else {
        console.log('❌ Correção falhou - problema persiste');
      }
    }
  } else {
    console.log('\n✅ TUDO OK: PropertyId encontrado:', propertyId);
  }
  
  console.log('\n📋 RESUMO:');
  console.log('==========');
  console.log('🏠 Propriedade no localStorage:', !!currentProperty);
  console.log('🆔 PropertyId disponível:', !!propertyId);
  console.log('🎯 Pronto para memorial:', !!propertyId);
  
  if (propertyId) {
    console.log('\n🎉 SISTEMA PRONTO!');
    console.log('✅ Agora você pode gerar um memorial com dados reais');
    console.log('💡 Vá para o Viewer e clique em "Gerar Memorial"');
  } else {
    console.log('\n❌ SISTEMA NÃO PRONTO');
    console.log('💡 Vá para Cadastro de Propriedade → Aba Pesquisar');
    console.log('💡 Selecione uma propriedade na grade');
  }
};

// Executar diagnóstico
runDiagnosis();