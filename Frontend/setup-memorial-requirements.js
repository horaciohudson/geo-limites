// Script para configurar os requisitos mínimos para gerar memorial
// Execute este script no console do navegador para configurar automaticamente

console.log('🔧 CONFIGURANDO REQUISITOS PARA GERAR MEMORIAL');
console.log('==============================================');

// 1. Criar norma padrão se não existir
const createDefaultNorm = () => {
  const defaultNorm = {
    id: '12fb339a-89ce-457c-8292-b0109de2a1f1',
    name: 'ABNT NBR 13133:1994 - Execução de levantamento topográfico',
    description: 'Norma padrão para levantamentos topográficos',
    active: true
  };
  
  let norms = [];
  try {
    const savedNorms = localStorage.getItem('selectedMemorialNorms');
    if (savedNorms) {
      norms = JSON.parse(savedNorms);
    }
  } catch (e) {
    console.log('Criando nova lista de normas...');
  }
  
  // Adicionar norma padrão se não existir
  if (!norms.find(n => n.id === defaultNorm.id)) {
    norms.push(defaultNorm);
    localStorage.setItem('selectedMemorialNorms', JSON.stringify(norms));
    console.log('✅ Norma padrão adicionada:', defaultNorm.name);
  } else {
    console.log('✅ Norma padrão já existe');
  }
};

// 2. Criar template padrão se não existir
const createDefaultTemplate = () => {
  const defaultTemplate = {
    id: 'template-padrao-001',
    name: 'Template Padrão Memorial',
    description: 'Template padrão para geração de memoriais descritivos'
  };
  
  const savedTemplate = localStorage.getItem('selectedTemplate');
  if (!savedTemplate) {
    localStorage.setItem('selectedTemplate', JSON.stringify(defaultTemplate));
    console.log('✅ Template padrão criado:', defaultTemplate.name);
  } else {
    console.log('✅ Template já existe');
  }
};

// 3. Criar propriedade de teste se não existir
const createTestProperty = () => {
  const testProperty = {
    id: '12345678-1234-1234-1234-123456789012',
    propertyId: '12345678-1234-1234-1234-123456789012',
    name: 'Lote 25 - Quadra B - Teste',
    registrationNumber: 'REG-2024-001',
    ownerName: 'João Silva Santos',
    ownerDocument: '123.456.789-00',
    street: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    totalArea: 600.00,
    totalPerimeter: 100.00,
    propertyType: 'LOTE'
  };
  
  const savedProperty = localStorage.getItem('selectedPropertyForMemorial');
  if (!savedProperty) {
    localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(testProperty));
    console.log('✅ Propriedade de teste criada:', testProperty.name);
  } else {
    console.log('✅ Propriedade já existe');
  }
};

// Executar configurações
createDefaultNorm();
createDefaultTemplate();
createTestProperty();

console.log('\n🎯 VERIFICAÇÃO FINAL:');
console.log('====================');

// Verificar se tudo está configurado
const hasNorms = !!localStorage.getItem('selectedMemorialNorms');
const hasTemplate = !!localStorage.getItem('selectedTemplate');
const hasProperty = !!localStorage.getItem('selectedPropertyForMemorial');

console.log('✅ Normas configuradas:', hasNorms ? 'SIM' : 'NÃO');
console.log('✅ Template configurado:', hasTemplate ? 'SIM' : 'NÃO');
console.log('✅ Propriedade configurada:', hasProperty ? 'SIM' : 'NÃO');

console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('==================');
console.log('1. Selecione um arquivo DXF na lista da sidebar');
console.log('2. Clique no botão "Gerar Memorial" 🤖');
console.log('3. O memorial deve ser gerado com dados reais da propriedade');

console.log('\n💡 DICA: Se ainda não funcionar, execute o script debug-memorial-button.js para mais detalhes.');