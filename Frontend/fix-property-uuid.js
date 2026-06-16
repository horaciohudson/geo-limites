// Script para corrigir o UUID da propriedade no localStorage
// Execute este script no console do navegador (F12)

console.log('🔧 CORRIGINDO UUID DA PROPRIEDADE');
console.log('================================');

// 1. Verificar propriedade atual no localStorage
const currentProperty = localStorage.getItem('selectedPropertyForMemorial');
console.log('🔍 Propriedade atual:', currentProperty);

if (currentProperty) {
  try {
    const property = JSON.parse(currentProperty);
    console.log('📋 Dados atuais:', {
      id: property.id,
      name: property.name,
      isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property.id)
    });
    
    // Se o ID não é um UUID válido, corrigir
    if (!property.id || property.id === 'test-123' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property.id)) {
      console.log('❌ UUID inválido detectado, corrigindo...');
      
      // Usar UUID válido
      property.id = '12345678-1234-1234-1234-123456789012';
      property.propertyId = '12345678-1234-1234-1234-123456789012';
      
      // Salvar de volta no localStorage
      localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(property));
      console.log('✅ UUID corrigido para:', property.id);
    } else {
      console.log('✅ UUID já está válido');
    }
    
  } catch (e) {
    console.error('❌ Erro ao parsear propriedade:', e);
  }
} else {
  console.log('⚠️ Nenhuma propriedade encontrada no localStorage');
  
  // Criar propriedade com UUID válido
  const validProperty = {
    id: '12345678-1234-1234-1234-123456789012',
    propertyId: '12345678-1234-1234-1234-123456789012',
    name: 'Propriedade Teste',
    registrationNumber: 'TEST-001',
    ownerName: 'João da Silva',
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
  console.log('✅ Propriedade criada com UUID válido:', validProperty.id);
}

// 2. Verificar outras propriedades no localStorage
const properties = localStorage.getItem('properties');
if (properties) {
  try {
    const propertiesList = JSON.parse(properties);
    console.log('\n📋 Verificando lista de propriedades...');
    
    let needsUpdate = false;
    propertiesList.forEach((prop, index) => {
      if (!prop.id || prop.id === 'test-123' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prop.id)) {
        console.log(`❌ Propriedade ${index + 1} tem UUID inválido:`, prop.id);
        prop.id = '12345678-1234-1234-1234-123456789012';
        prop.propertyId = '12345678-1234-1234-1234-123456789012';
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      localStorage.setItem('properties', JSON.stringify(propertiesList));
      console.log('✅ Lista de propriedades atualizada');
    } else {
      console.log('✅ Todas as propriedades têm UUIDs válidos');
    }
    
  } catch (e) {
    console.error('❌ Erro ao verificar lista de propriedades:', e);
  }
}

console.log('\n🎯 CORREÇÃO CONCLUÍDA');
console.log('====================');
console.log('✅ UUIDs corrigidos para formato válido');
console.log('✅ Backend deve aceitar as requisições agora');
console.log('\n💡 Próximos passos:');
console.log('1. Clique no botão "Gerar Memorial" novamente');
console.log('2. O memorial deve ser gerado sem erros');
console.log('3. Monitore os logs do backend para confirmação');