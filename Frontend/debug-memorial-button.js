// Script para debugar por que o botão "Gerar Memorial" não funciona
// Execute este script no console do navegador (F12)

console.log('🔍 DEBUG: Por que o botão Gerar Memorial não funciona?');
console.log('=======================================================');

// 1. Verificar se há arquivos selecionados
const selectedFiles = JSON.parse(localStorage.getItem('selectedFiles') || '[]');
console.log('📁 Arquivos selecionados:', selectedFiles.length);
if (selectedFiles.length === 0) {
  console.log('❌ PROBLEMA: Nenhum arquivo selecionado!');
  console.log('💡 SOLUÇÃO: Selecione um arquivo DXF na lista da sidebar');
} else {
  console.log('✅ Arquivos OK:', selectedFiles.map(f => f.originalName));
}

// 2. Verificar normas selecionadas
const savedNorms = localStorage.getItem('selectedMemorialNorms');
console.log('📋 Normas no localStorage:', savedNorms);
if (!savedNorms) {
  console.log('❌ PROBLEMA: Nenhuma norma selecionada!');
  console.log('💡 SOLUÇÃO: Vá em "Gerenciar Normas" e selecione uma norma ABNT');
} else {
  try {
    const norms = JSON.parse(savedNorms);
    console.log('✅ Normas OK:', norms.length, 'normas selecionadas');
    console.log('📝 Normas:', norms.map(n => n.name));
  } catch (e) {
    console.log('❌ PROBLEMA: Erro ao parsear normas!', e);
  }
}

// 3. Verificar template selecionado
const savedTemplate = localStorage.getItem('selectedTemplate');
console.log('🎨 Template no localStorage:', savedTemplate);
if (!savedTemplate) {
  console.log('❌ PROBLEMA: Nenhum template selecionado!');
  console.log('💡 SOLUÇÃO: Vá em "Gerenciar Templates" e selecione um template');
} else {
  try {
    const template = JSON.parse(savedTemplate);
    console.log('✅ Template OK:', template.name || template.id);
  } catch (e) {
    console.log('✅ Template OK (string):', savedTemplate);
  }
}

// 4. Verificar propriedade para memorial
const selectedProperty = localStorage.getItem('selectedPropertyForMemorial');
console.log('🏠 Propriedade para memorial:', selectedProperty);
if (!selectedProperty) {
  console.log('⚠️ AVISO: Nenhuma propriedade selecionada para memorial');
  console.log('💡 DICA: Vá em "Cadastro de Propriedade" e selecione uma propriedade');
} else {
  try {
    const property = JSON.parse(selectedProperty);
    console.log('✅ Propriedade OK:', property.name);
  } catch (e) {
    console.log('❌ PROBLEMA: Erro ao parsear propriedade!', e);
  }
}

// 5. Resumo das condições
console.log('\n📊 RESUMO DAS CONDIÇÕES:');
console.log('========================');
const hasFiles = selectedFiles.length > 0;
const hasNorms = savedNorms && JSON.parse(savedNorms).length > 0;
const hasTemplate = !!savedTemplate;

console.log('✅ Arquivos selecionados:', hasFiles ? 'SIM' : 'NÃO');
console.log('✅ Normas selecionadas:', hasNorms ? 'SIM' : 'NÃO');
console.log('✅ Template selecionado:', hasTemplate ? 'SIM' : 'NÃO');

const canGenerate = hasFiles && hasNorms && hasTemplate;
console.log('\n🎯 PODE GERAR MEMORIAL:', canGenerate ? '✅ SIM' : '❌ NÃO');

if (!canGenerate) {
  console.log('\n🔧 AÇÕES NECESSÁRIAS:');
  if (!hasFiles) console.log('1. Selecione um arquivo DXF na sidebar');
  if (!hasNorms) console.log('2. Vá em "Gerenciar Normas" e selecione uma norma');
  if (!hasTemplate) console.log('3. Vá em "Gerenciar Templates" e selecione um template');
} else {
  console.log('\n🎉 Todas as condições estão OK!');
  console.log('💡 Se o botão ainda não funciona, verifique:');
  console.log('- Se há erros no console do navegador');
  console.log('- Se o backend está rodando na porta 9010');
  console.log('- Se há problemas de rede/conectividade');
}

console.log('\n🔍 Para mais detalhes, abra as ferramentas de desenvolvedor e monitore a aba Network ao clicar no botão.');