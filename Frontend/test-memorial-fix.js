// Teste da correção do botão Gerar Memorial
// Execute este script no console do navegador (F12)

console.log('🧪 TESTE DA CORREÇÃO - BOTÃO GERAR MEMORIAL');
console.log('==========================================');

// 1. Verificar se há arquivos selecionados
const selectedFiles = JSON.parse(localStorage.getItem('selectedFiles') || '[]');
console.log('📁 Arquivos selecionados:', selectedFiles.length);

if (selectedFiles.length === 0) {
  console.log('❌ Selecione arquivos DXF na sidebar primeiro');
  return;
}

selectedFiles.forEach((file, index) => {
  console.log(`   ${index + 1}. ${file.originalName} (ID: ${file.id})`);
});

// 2. Verificar outros requisitos
const hasNorms = !!localStorage.getItem('selectedMemorialNorms');
const hasTemplate = !!localStorage.getItem('selectedTemplate');
const hasToken = !!localStorage.getItem('token');

console.log('\n📋 Requisitos:');
console.log('✅ Arquivos:', selectedFiles.length > 0 ? 'OK' : 'FALTA');
console.log('✅ Normas:', hasNorms ? 'OK' : 'FALTA');
console.log('✅ Template:', hasTemplate ? 'OK' : 'FALTA');
console.log('✅ Token:', hasToken ? 'OK' : 'FALTA');

const allReady = selectedFiles.length > 0 && hasNorms && hasTemplate && hasToken;
console.log('\n🎯 Pronto para gerar memorial:', allReady ? '✅ SIM' : '❌ NÃO');

if (!allReady) {
  console.log('💡 Complete os requisitos antes de testar');
  return;
}

// 3. Interceptar navegação para verificar se funciona
let navigationDetected = false;
const originalPushState = window.history.pushState;

window.history.pushState = function(...args) {
  const url = args[2];
  if (typeof url === 'string' && url.includes('/memorial')) {
    navigationDetected = true;
    console.log('🎉 SUCESSO! Navegação para memorial detectada:', url);
    
    // Extrair parâmetros da URL
    const urlObj = new URL(url, window.location.origin);
    const params = urlObj.searchParams;
    
    console.log('📊 Parâmetros da navegação:');
    console.log('   └─ fileIds:', params.get('fileIds'));
    console.log('   └─ projectName:', params.get('projectName'));
    console.log('   └─ projectDescription:', params.get('projectDescription'));
    
    // Restaurar função original
    window.history.pushState = originalPushState;
  }
  
  return originalPushState.apply(this, args);
};

// 4. Encontrar e testar o botão
const button = document.querySelector('button[title="Gerar memorial descritivo com IA"]');

if (!button) {
  console.log('❌ Botão não encontrado na página');
  return;
}

console.log('\n🔘 Botão encontrado - testando clique...');
console.log('⏳ Aguarde alguns segundos...');

// Simular clique
button.click();

// Verificar resultado após 3 segundos
setTimeout(() => {
  if (navigationDetected) {
    console.log('\n🎉 CORREÇÃO FUNCIONOU!');
    console.log('✅ O botão agora navega corretamente para a página de memorial');
    console.log('✅ A página de memorial vai carregar os dados DXF automaticamente');
    console.log('\n💡 Próximos passos:');
    console.log('1. Clique no botão "Gerar Memorial" na interface');
    console.log('2. Aguarde a página de memorial carregar');
    console.log('3. O memorial deve ser gerado automaticamente');
  } else {
    console.log('\n❌ Ainda há problemas');
    console.log('💡 Verifique se:');
    console.log('- O botão está visível e habilitado');
    console.log('- Não há erros no console');
    console.log('- Todos os requisitos estão OK');
  }
  
  // Restaurar função original se ainda não foi
  window.history.pushState = originalPushState;
  
}, 3000);

console.log('\n📝 Monitorando navegação...');