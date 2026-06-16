// Script para testar diretamente o clique no botão Gerar Memorial
// Execute este script no console do navegador (F12)

console.log('🧪 TESTE DIRETO DO BOTÃO GERAR MEMORIAL');
console.log('=====================================');

// 1. Verificar se o botão existe na página
const button = document.querySelector('button[title="Gerar memorial descritivo com IA"]');
console.log('🔍 Botão encontrado:', !!button);

if (!button) {
  console.log('❌ PROBLEMA: Botão não encontrado na página!');
  console.log('💡 Certifique-se de estar na página correta (sidebar visível)');
  return;
}

// 2. Verificar se o botão está habilitado
const isDisabled = button.disabled;
const opacity = window.getComputedStyle(button).opacity;
console.log('🔍 Botão desabilitado:', isDisabled);
console.log('🔍 Opacidade do botão:', opacity);

if (isDisabled || opacity < 1) {
  console.log('❌ PROBLEMA: Botão está desabilitado!');
  console.log('💡 Verificando condições...');
  
  // Verificar localStorage
  const selectedFiles = JSON.parse(localStorage.getItem('selectedFiles') || '[]');
  const savedNorms = localStorage.getItem('selectedMemorialNorms');
  const savedTemplate = localStorage.getItem('selectedTemplate');
  
  console.log('📁 Arquivos selecionados:', selectedFiles.length);
  console.log('📋 Normas:', !!savedNorms);
  console.log('🎨 Template:', !!savedTemplate);
  
  if (selectedFiles.length === 0) {
    console.log('❌ Selecione um arquivo DXF na lista da sidebar');
  }
  if (!savedNorms) {
    console.log('❌ Configure uma norma em "Gerenciar Normas"');
  }
  if (!savedTemplate) {
    console.log('❌ Configure um template em "Gerenciar Templates"');
  }
} else {
  console.log('✅ Botão está habilitado e pronto para uso');
}

// 3. Interceptar cliques no botão para debug
let originalHandler = null;

// Função para interceptar e debugar o clique
const interceptClick = (event) => {
  console.log('🎯 CLIQUE INTERCEPTADO NO BOTÃO!');
  console.log('📊 Event details:', {
    type: event.type,
    target: event.target.tagName,
    disabled: event.target.disabled,
    timestamp: new Date().toISOString()
  });
  
  // Verificar condições no momento do clique
  const selectedFiles = JSON.parse(localStorage.getItem('selectedFiles') || '[]');
  const savedNorms = localStorage.getItem('selectedMemorialNorms');
  const savedTemplate = localStorage.getItem('selectedTemplate');
  
  console.log('📋 Estado no momento do clique:', {
    files: selectedFiles.length,
    norms: !!savedNorms,
    template: !!savedTemplate,
    canProceed: selectedFiles.length > 0 && !!savedNorms && !!savedTemplate
  });
  
  // Deixar o evento continuar normalmente
  console.log('➡️ Permitindo que o clique continue...');
};

// Adicionar listener de debug
button.addEventListener('click', interceptClick, true);
console.log('✅ Interceptador de clique adicionado');

// 4. Simular clique programático para teste
console.log('\n🤖 SIMULANDO CLIQUE PROGRAMÁTICO...');
setTimeout(() => {
  console.log('🖱️ Disparando clique programático...');
  button.click();
}, 1000);

// 5. Monitorar requisições de rede
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('/memorial/generate-gpt')) {
    console.log('🌐 REQUISIÇÃO DE MEMORIAL DETECTADA!');
    console.log('📡 URL:', url);
    console.log('📤 Dados:', args[1]);
  }
  return originalFetch.apply(this, args);
};

console.log('✅ Monitor de requisições ativado');

console.log('\n📝 INSTRUÇÕES:');
console.log('==============');
console.log('1. Clique no botão "Gerar Memorial" na interface');
console.log('2. Observe as mensagens no console');
console.log('3. Se não aparecer "CLIQUE INTERCEPTADO", há problema no evento');
console.log('4. Se aparecer mas não houver requisição, há problema na lógica');
console.log('5. Se houver requisição mas falhar, há problema no backend');

console.log('\n⏰ Aguardando clique no botão...');