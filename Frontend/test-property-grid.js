// Script para testar a nova grade de propriedades
// Execute este script no console do navegador (F12) após navegar para PropertyRegister

console.log('🧪 TESTANDO NOVA GRADE DE PROPRIEDADES');
console.log('=====================================');

// Função para verificar se a grade foi carregada
const checkPropertyGrid = () => {
  console.log('🔍 Verificando se a grade de propriedades foi carregada...');
  
  // Verificar se estamos na página correta
  const currentPath = window.location.pathname;
  console.log('📍 Página atual:', currentPath);
  
  if (!currentPath.includes('/property-register')) {
    console.log('⚠️ Você precisa estar na página de Cadastro de Propriedade');
    console.log('💡 Navegue para /property-register primeiro');
    return false;
  }
  
  // Verificar se a aba "Pesquisar" está ativa
  const activeTab = document.querySelector('.tab-button.active');
  if (activeTab) {
    console.log('📋 Aba ativa:', activeTab.textContent);
  }
  
  // Verificar se a grade existe
  const propertyGrid = document.querySelector('.property-grid');
  const gridContainer = document.querySelector('.property-grid-container');
  
  console.log('🏠 Grade de propriedades encontrada:', !!propertyGrid);
  console.log('📦 Container da grade encontrado:', !!gridContainer);
  
  if (gridContainer) {
    // Verificar estado da grade
    const loadingState = gridContainer.querySelector('.loading-state');
    const errorState = gridContainer.querySelector('.error-state');
    const emptyState = gridContainer.querySelector('.empty-state');
    
    if (loadingState) {
      console.log('⏳ Estado: Carregando propriedades...');
    } else if (errorState) {
      console.log('❌ Estado: Erro ao carregar propriedades');
      const errorMessage = errorState.querySelector('p')?.textContent;
      console.log('📄 Mensagem de erro:', errorMessage);
    } else if (emptyState) {
      console.log('📋 Estado: Nenhuma propriedade encontrada');
    } else if (propertyGrid) {
      // Contar propriedades
      const propertyRows = propertyGrid.querySelectorAll('.grid-row:not(.grid-header)');
      console.log('🏠 Propriedades encontradas na grade:', propertyRows.length);
      
      // Verificar propriedade selecionada
      const selectedRow = propertyGrid.querySelector('.grid-row.selected');
      if (selectedRow) {
        console.log('✅ Propriedade selecionada encontrada');
      } else {
        console.log('⭕ Nenhuma propriedade selecionada');
      }
    }
  }
  
  return true;
};

// Função para simular seleção de propriedade
const testPropertySelection = () => {
  console.log('\n🖱️ Testando seleção de propriedade...');
  
  const selectButtons = document.querySelectorAll('.select-button');
  console.log('🔘 Botões de seleção encontrados:', selectButtons.length);
  
  if (selectButtons.length > 0) {
    console.log('💡 Para testar, clique em um dos botões ⭕ na grade');
    console.log('💡 Ou execute: document.querySelector(".select-button").click()');
    
    // Adicionar listener para capturar seleções
    selectButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        console.log(`✅ Propriedade ${index + 1} selecionada!`);
        
        // Verificar localStorage
        setTimeout(() => {
          const selectedProperty = localStorage.getItem('selectedPropertyForMemorial');
          if (selectedProperty) {
            try {
              const property = JSON.parse(selectedProperty);
              console.log('💾 Propriedade salva no localStorage:');
              console.log('   🆔 ID:', property.propertyId || property.id);
              console.log('   📝 Nome:', property.name);
              console.log('   👤 Proprietário:', property.ownerName);
            } catch (e) {
              console.error('❌ Erro ao parsear propriedade do localStorage:', e);
            }
          }
        }, 100);
      });
    });
    
    console.log('✅ Listeners de teste adicionados aos botões');
  }
};

// Função para verificar requisições de API
const monitorApiRequests = () => {
  console.log('\n🌐 Monitorando requisições de API...');
  
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    
    if (typeof url === 'string' && url.includes('/properties')) {
      console.log('📡 Requisição para propriedades detectada:', url);
      
      return originalFetch.apply(this, args).then(response => {
        console.log('📥 Resposta recebida:', response.status);
        
        if (response.ok) {
          response.clone().json().then(data => {
            console.log('✅ Propriedades recebidas do banco:', data.length);
            data.forEach((prop, index) => {
              console.log(`   ${index + 1}. ${prop.name || 'Sem nome'} (ID: ${prop.propertyId || prop.id})`);
            });
          }).catch(() => {
            console.log('📄 Resposta não é JSON válido');
          });
        } else {
          console.log('❌ Erro na requisição de propriedades');
        }
        
        return response;
      });
    }
    
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ Monitor de API ativado');
};

// Executar todos os testes
const runAllTests = () => {
  console.log('🚀 Executando todos os testes...');
  
  const gridLoaded = checkPropertyGrid();
  
  if (gridLoaded) {
    testPropertySelection();
    monitorApiRequests();
    
    console.log('\n📋 RESUMO DOS TESTES:');
    console.log('====================');
    console.log('✅ Verificação da grade: Concluída');
    console.log('✅ Teste de seleção: Configurado');
    console.log('✅ Monitor de API: Ativo');
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('===================');
    console.log('1. Clique na aba "Pesquisar" se não estiver ativa');
    console.log('2. Aguarde as propriedades carregarem do banco');
    console.log('3. Clique em ⭕ para selecionar uma propriedade');
    console.log('4. Vá para o Viewer e gere um memorial');
    console.log('5. O memorial deve usar dados reais da propriedade selecionada');
  }
};

// Executar testes
runAllTests();