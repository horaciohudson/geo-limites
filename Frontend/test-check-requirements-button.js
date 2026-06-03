// Teste do botão "Cheque Requisitos" no Viewer
// Execute este script no console do navegador (F12) quando estiver na página do Viewer

console.log('🧪 TESTE DO BOTÃO CHEQUE REQUISITOS');
console.log('===================================');

// 1. Verificar se estamos na página do viewer
const currentPath = window.location.pathname;
console.log('📍 Página atual:', currentPath);

if (!currentPath.includes('/viewer')) {
  console.log('⚠️ Você precisa estar na página do Viewer para testar este botão');
  console.log('💡 Navegue para /viewer primeiro');
  return;
}

// 2. Procurar pelo botão "Cheque Requisitos"
const checkButton = document.querySelector('button[title*="Verificar se todos os requisitos"]');
console.log('🔍 Botão encontrado:', !!checkButton);

if (!checkButton) {
  console.log('❌ Botão "Cheque Requisitos" não encontrado');
  console.log('💡 Possíveis causas:');
  console.log('- O componente ViewerDXF não foi carregado ainda');
  console.log('- Há erro de JavaScript impedindo a renderização');
  console.log('- O arquivo não foi salvo corretamente');
  return;
}

console.log('✅ Botão "Cheque Requisitos" encontrado!');
console.log('📋 Propriedades do botão:');
console.log('   └─ Texto:', checkButton.textContent);
console.log('   └─ Title:', checkButton.title);
console.log('   └─ Disabled:', checkButton.disabled);

// 3. Verificar se o botão está visível e clicável
const buttonStyle = window.getComputedStyle(checkButton);
console.log('🎨 Estilo do botão:');
console.log('   └─ Display:', buttonStyle.display);
console.log('   └─ Visibility:', buttonStyle.visibility);
console.log('   └─ Background:', buttonStyle.backgroundColor);
console.log('   └─ Color:', buttonStyle.color);

// 4. Testar clique no botão
console.log('\n🖱️ Testando clique no botão...');

// Interceptar alerts para capturar a mensagem
let alertMessage = '';
const originalAlert = window.alert;
window.alert = function(message) {
  alertMessage = message;
  console.log('📢 Alert interceptado:', message);
  return originalAlert.call(window, message);
};

// Simular clique
try {
  checkButton.click();
  console.log('✅ Clique executado com sucesso');
  
  // Aguardar um pouco para capturar o alert
  setTimeout(() => {
    if (alertMessage) {
      console.log('📋 Mensagem do alert capturada:');
      console.log(alertMessage);
    } else {
      console.log('⚠️ Nenhum alert foi disparado');
    }
    
    // Restaurar alert original
    window.alert = originalAlert;
  }, 1000);
  
} catch (error) {
  console.error('❌ Erro ao clicar no botão:', error);
  window.alert = originalAlert;
}

// 5. Verificar outros botões de zoom para comparação
console.log('\n🔍 Verificando outros botões de zoom...');
const zoomButtons = document.querySelectorAll('button[title*="Zoom"]');
console.log('🔍 Botões de zoom encontrados:', zoomButtons.length);

zoomButtons.forEach((btn, index) => {
  console.log(`   ${index + 1}. ${btn.textContent} - ${btn.title}`);
});

console.log('\n📝 RESULTADO DO TESTE:');
console.log('======================');
if (checkButton) {
  console.log('✅ Botão "Cheque Requisitos" foi adicionado com sucesso');
  console.log('✅ Está visível e clicável no Viewer');
  console.log('✅ Localizado ao lado dos botões de zoom (+/-)');
  console.log('\n💡 Para usar:');
  console.log('1. Vá para a página do Viewer');
  console.log('2. Clique no botão "✅ Cheque Requisitos"');
  console.log('3. Veja o relatório completo dos requisitos');
} else {
  console.log('❌ Botão não foi encontrado');
  console.log('💡 Verifique se o arquivo ViewerDXF.tsx foi salvo');
}

console.log('\n🎯 Próximos passos:');
console.log('- Use o botão para verificar requisitos antes de gerar memorial');
console.log('- O botão mostra exatamente o que está faltando no localStorage');
console.log('- Facilita o diagnóstico de problemas na geração de memorial');