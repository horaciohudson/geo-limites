// Script para testar a navegação para a página de memorial
// Execute este script no console do navegador (F12)

console.log('🧭 TESTE DE NAVEGAÇÃO PARA MEMORIAL');
console.log('==================================');

// 1. Verificar se estamos na página correta
console.log('📍 URL atual:', window.location.href);
console.log('📍 Pathname:', window.location.pathname);

// 2. Verificar se há arquivos selecionados
const selectedFiles = JSON.parse(localStorage.getItem('selectedFiles') || '[]');
console.log('📁 Arquivos selecionados:', selectedFiles.length);

if (selectedFiles.length === 0) {
  console.log('❌ PROBLEMA: Nenhum arquivo selecionado!');
  console.log('💡 Selecione um arquivo na sidebar primeiro');
  return;
}

console.log('✅ Arquivos encontrados:', selectedFiles.map(f => f.originalName));

// 3. Simular a navegação que o botão faria
const simulateNavigation = () => {
  console.log('🚀 Simulando navegação para memorial...');
  
  const fileNames = selectedFiles.map(f => f.originalName).join(', ');
  const projectName = fileNames.replace(/\.[^/.]+$/g, ''); // Remove extensões
  
  const params = new URLSearchParams({
    fileIds: selectedFiles.map(f => f.id).join(','),
    projectName: projectName,
    projectDescription: `Memorial descritivo gerado para: ${fileNames}`
  });
  
  const memorialUrl = `/memorial?${params.toString()}`;
  console.log('🔗 URL do memorial:', memorialUrl);
  
  // Tentar navegar
  try {
    console.log('🧭 Tentando navegar...');
    window.history.pushState({}, '', memorialUrl);
    
    // Disparar evento de mudança de rota
    window.dispatchEvent(new PopStateEvent('popstate'));
    
    console.log('✅ Navegação simulada com sucesso');
    console.log('💡 Verifique se a página mudou para Memorial');
    
  } catch (error) {
    console.error('❌ Erro na navegação:', error);
  }
};

// 4. Verificar se React Router está funcionando
const testReactRouter = () => {
  console.log('⚛️ Testando React Router...');
  
  // Verificar se há elementos React na página
  const reactElements = document.querySelectorAll('[data-reactroot], #root');
  console.log('🔍 Elementos React encontrados:', reactElements.length);
  
  // Verificar se há links de navegação
  const navLinks = document.querySelectorAll('a[href*="/"]');
  console.log('🔍 Links de navegação encontrados:', navLinks.length);
  
  // Tentar encontrar o componente de navegação
  const sidebarButtons = document.querySelectorAll('button');
  console.log('🔍 Botões na sidebar:', sidebarButtons.length);
};

// 5. Interceptar mudanças de URL
let originalPushState = window.history.pushState;
window.history.pushState = function(...args) {
  console.log('🧭 NAVEGAÇÃO DETECTADA:', args[2]);
  return originalPushState.apply(this, args);
};

// Executar testes
testReactRouter();
console.log('\n🎯 Clique no botão "Gerar Memorial" agora...');
console.log('📊 Monitorando navegação...');

// Aguardar um pouco e então simular
setTimeout(() => {
  console.log('\n🤖 Simulando navegação automática em 3 segundos...');
  setTimeout(simulateNavigation, 3000);
}, 2000);

console.log('\n📝 OBSERVAÇÕES:');
console.log('===============');
console.log('- Se a URL mudar mas a página não carregar, há problema no componente Memorial');
console.log('- Se a URL não mudar, há problema na função de navegação');
console.log('- Se houver erro de console, há problema de JavaScript');
console.log('- Monitore a aba Network para ver se há requisições sendo feitas');