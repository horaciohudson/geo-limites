// Script para atualizar localStorage com a propriedade real
// Execute este script no console do navegador (F12)

console.log('🔄 ATUALIZANDO PARA PROPRIEDADE REAL');
console.log('===================================');

// ID da propriedade real cadastrada
const REAL_PROPERTY_ID = '9d06d614-eec7-4306-a77c-5a54ed69f1f9';

// Atualizar selectedPropertyForMemorial
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

console.log('✅ Propriedade real configurada no localStorage');
console.log('🆔 ID:', REAL_PROPERTY_ID);
console.log('📝 Nome:', realProperty.name);

console.log('\n🎯 AGORA GERE UM MEMORIAL:');
console.log('1. Vá para o Viewer');
console.log('2. Clique em "Gerar Memorial"');
console.log('3. O backend deve encontrar a propriedade real');
console.log('4. O memorial deve ter dados reais!');