// Diagnóstico completo do problema do botão "Gerar Memorial"
// Execute este script no console do navegador (F12)

console.log('🔬 DIAGNÓSTICO COMPLETO - BOTÃO GERAR MEMORIAL');
console.log('==============================================');

// Função para verificar localStorage
const checkLocalStorage = () => {
  console.log('\n📦 1. VERIFICANDO LOCALSTORAGE:');
  console.log('==============================');
  
  const items = {
    selectedFiles: localStorage.getItem('selectedFiles'),
    selectedMemorialNorms: localStorage.getItem('selectedMemorialNorms'),
    selectedTemplate: localStorage.getItem('selectedTemplate'),
    selectedPropertyForMemorial: localStorage.getItem('selectedPropertyForMemorial'),
    token: localStorage.getItem('token')
  };
  
  Object.entries(items).forEach(([key, value]) => {
    const exists = !!value;
    const icon = exists ? '✅' : '❌';
    console.log(`${icon} ${key}:`, exists ? 'OK' : 'AUSENTE');
    
    if (exists && key !== 'token') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          console.log(`   └─ ${parsed.length} itens`);
        } else {
          console.log(`   └─ ${parsed.name || parsed.id || 'Objeto válido'}`);
        }
      } catch (e) {
        console.log(`   └─ String: ${value.substring(0, 50)}...`);
      }
    }
  });
  
  return items;
};

// Função para verificar o botão
const checkButton = () => {
  console.log('\n🔘 2. VERIFICANDO BOTÃO:');
  console.log('========================');
  
  const button = document.querySelector('button[title="Gerar memorial descritivo com IA"]');
  
  if (!button) {
    console.log('❌ Botão não encontrado na página');
    console.log('💡 Certifique-se de estar na página com a sidebar visível');
    return null;
  }
  
  console.log('✅ Botão encontrado');
  console.log('🔍 Propriedades do botão:');
  console.log('   └─ disabled:', button.disabled);
  console.log('   └─ opacity:', window.getComputedStyle(button).opacity);
  console.log('   └─ cursor:', window.getComputedStyle(button).cursor);
  console.log('   └─ display:', window.getComputedStyle(button).display);
  
  return button;
};

// Função para verificar condições de validação
const checkValidationConditions = (items) => {
  console.log('\n✅ 3. VERIFICANDO CONDIÇÕES:');
  console.log('============================');
  
  const conditions = {
    hasFiles: false,
    hasNorms: false,
    hasTemplate: false,
    hasToken: false
  };
  
  // Verificar arquivos
  if (items.selectedFiles) {
    try {
      const files = JSON.parse(items.selectedFiles);
      conditions.hasFiles = Array.isArray(files) && files.length > 0;
    } catch (e) {
      conditions.hasFiles = false;
    }
  }
  
  // Verificar normas
  if (items.selectedMemorialNorms) {
    try {
      const norms = JSON.parse(items.selectedMemorialNorms);
      conditions.hasNorms = Array.isArray(norms) && norms.length > 0;
    } catch (e) {
      conditions.hasNorms = false;
    }
  }
  
  // Verificar template
  conditions.hasTemplate = !!items.selectedTemplate;
  
  // Verificar token
  conditions.hasToken = !!items.token;
  
  Object.entries(conditions).forEach(([key, value]) => {
    const icon = value ? '✅' : '❌';
    console.log(`${icon} ${key}:`, value ? 'OK' : 'FALHA');
  });
  
  const allConditionsMet = Object.values(conditions).every(Boolean);
  console.log(`\n🎯 Todas as condições atendidas: ${allConditionsMet ? '✅ SIM' : '❌ NÃO'}`);
  
  return { conditions, allConditionsMet };
};

// Função para testar clique
const testClick = (button) => {
  console.log('\n🖱️ 4. TESTANDO CLIQUE:');
  console.log('======================');
  
  if (!button) {
    console.log('❌ Não é possível testar - botão não encontrado');
    return;
  }
  
  // Interceptar console.log para capturar logs da função
  const originalLog = console.log;
  const logs = [];
  
  console.log = function(...args) {
    logs.push(args.join(' '));
    originalLog.apply(console, args);
  };
  
  // Interceptar navegação
  let navigationCalled = false;
  const originalPushState = window.history.pushState;
  window.history.pushState = function(...args) {
    navigationCalled = true;
    console.log('🧭 Navegação interceptada:', args[2]);
    return originalPushState.apply(this, args);
  };
  
  // Simular clique
  console.log('🖱️ Simulando clique...');
  button.click();
  
  // Aguardar um pouco para capturar logs
  setTimeout(() => {
    console.log = originalLog;
    window.history.pushState = originalPushState;
    
    console.log('\n📊 RESULTADO DO CLIQUE:');
    console.log('=======================');
    
    const relevantLogs = logs.filter(log => 
      log.includes('handleGenerateMemorial') || 
      log.includes('validação') || 
      log.includes('memorial') ||
      log.includes('erro') ||
      log.includes('navegação')
    );
    
    if (relevantLogs.length > 0) {
      console.log('📝 Logs capturados:');
      relevantLogs.forEach(log => console.log('   └─', log));
    } else {
      console.log('⚠️ Nenhum log relevante capturado');
    }
    
    console.log('🧭 Navegação chamada:', navigationCalled ? '✅ SIM' : '❌ NÃO');
    
    // Diagnóstico final
    provideFinalDiagnosis(relevantLogs, navigationCalled);
    
  }, 2000);
};

// Função para diagnóstico final
const provideFinalDiagnosis = (logs, navigationCalled) => {
  console.log('\n🎯 DIAGNÓSTICO FINAL:');
  console.log('=====================');
  
  if (logs.some(log => log.includes('handleGenerateMemorial chamado'))) {
    console.log('✅ Função handleGenerateMemorial foi executada');
    
    if (logs.some(log => log.includes('validação falhou'))) {
      console.log('❌ PROBLEMA: Validação falhou');
      console.log('💡 SOLUÇÃO: Verifique os requisitos no localStorage');
    } else if (logs.some(log => log.includes('Todas as validações passaram'))) {
      console.log('✅ Validações passaram');
      
      if (navigationCalled) {
        console.log('✅ Navegação foi chamada');
        console.log('🎉 TUDO FUNCIONANDO! O problema pode estar na página de destino');
      } else {
        console.log('❌ PROBLEMA: Navegação não foi chamada');
        console.log('💡 SOLUÇÃO: Verifique a função generateMemorialIndependent');
      }
    }
  } else {
    console.log('❌ PROBLEMA: Função handleGenerateMemorial não foi executada');
    console.log('💡 POSSÍVEIS CAUSAS:');
    console.log('   - Botão está desabilitado');
    console.log('   - Event listener não está funcionando');
    console.log('   - Erro de JavaScript impedindo execução');
  }
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('===================');
  console.log('1. Se validação falhou: Configure normas/templates');
  console.log('2. Se navegação falhou: Verifique função generateMemorialIndependent');
  console.log('3. Se tudo OK: Verifique componente Memorial.tsx');
  console.log('4. Monitore aba Network para requisições HTTP');
};

// Executar diagnóstico completo
const runDiagnosis = () => {
  const items = checkLocalStorage();
  const button = checkButton();
  const { allConditionsMet } = checkValidationConditions(items);
  
  if (button && allConditionsMet) {
    testClick(button);
  } else {
    console.log('\n⚠️ DIAGNÓSTICO INTERROMPIDO:');
    console.log('============================');
    if (!button) {
      console.log('❌ Botão não encontrado');
    }
    if (!allConditionsMet) {
      console.log('❌ Condições não atendidas');
    }
    console.log('💡 Corrija os problemas acima antes de continuar');
  }
};

// Executar
runDiagnosis();