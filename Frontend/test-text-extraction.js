// Script para testar extração de textos rotacionados (ruas e distâncias)
// Execute este script no console do navegador (F12)

console.log('🧪 TESTE DE EXTRAÇÃO DE TEXTOS ROTACIONADOS');
console.log('==========================================');

// Função para analisar textos nas entidades DXF carregadas
const analyzeTextEntities = () => {
  console.log('📝 Analisando entidades de texto no DXF carregado...');
  
  // Tentar obter dados DXF do contexto
  const fileContext = window.fileContext || {};
  const dxfData = fileContext.dxfData || {};
  const entities = dxfData.entities || [];
  
  if (entities.length === 0) {
    console.log('❌ Nenhuma entidade DXF encontrada');
    console.log('💡 Carregue um arquivo DXF no Viewer primeiro');
    return;
  }
  
  console.log('📊 Total de entidades:', entities.length);
  
  // Filtrar entidades de texto
  const textEntities = entities.filter(entity => 
    entity.type === 'TEXT' || entity.type === 'MTEXT'
  );
  
  console.log('📝 Entidades de texto encontradas:', textEntities.length);
  
  if (textEntities.length === 0) {
    console.log('❌ Nenhuma entidade de texto encontrada no DXF');
    return;
  }
  
  // Analisar cada texto
  console.log('\n📋 ANÁLISE DETALHADA DOS TEXTOS:');
  console.log('================================');
  
  const streetCandidates = [];
  const measurementCandidates = [];
  const rotatedTexts = [];
  
  textEntities.forEach((entity, index) => {
    const props = entity.properties || {};
    const text = props.text || '';
    const rotation = props.rotation || 0;
    const x = props.x || 0;
    const y = props.y || 0;
    
    console.log(`\n${index + 1}. TEXTO: "${text}"`);
    console.log(`   📍 Posição: (${x.toFixed(2)}, ${y.toFixed(2)})`);
    console.log(`   🔄 Rotação: ${rotation.toFixed(1)}°`);
    console.log(`   🏷️ Layer: ${entity.layer || 'Sem layer'}`);
    
    // Classificar o texto
    const cleanText = text.trim().toUpperCase();
    
    // Verificar se é nome de rua
    const streetPrefixes = ['RUA', 'AVENIDA', 'AV', 'TRAVESSA', 'TRAV', 'ALAMEDA', 'PRAÇA', 'LARGO'];
    const isStreet = streetPrefixes.some(prefix => cleanText.startsWith(prefix));
    
    // Verificar se é medida
    const isMeasurement = /\d+[.,]?\d*\s*m|\d+[.,]?\d*\s*metros?|ÁREA|PERÍMETRO/.test(cleanText);
    
    // Verificar se está rotacionado
    const isRotated = Math.abs(rotation) > 5; // Mais de 5 graus
    
    if (isStreet) {
      streetCandidates.push({ text: cleanText, rotation, position: { x, y } });
      console.log('   🛣️ IDENTIFICADO COMO RUA');
    }
    
    if (isMeasurement) {
      measurementCandidates.push({ text: cleanText, rotation, position: { x, y } });
      console.log('   📏 IDENTIFICADO COMO MEDIDA');
    }
    
    if (isRotated) {
      rotatedTexts.push({ text: cleanText, rotation, position: { x, y } });
      console.log('   🔄 TEXTO ROTACIONADO');
    }
    
    if (!isStreet && !isMeasurement) {
      console.log('   ❓ Tipo não identificado');
    }
  });
  
  // Resumo da análise
  console.log('\n📊 RESUMO DA ANÁLISE:');
  console.log('====================');
  console.log('📝 Total de textos:', textEntities.length);
  console.log('🛣️ Candidatos a ruas:', streetCandidates.length);
  console.log('📏 Candidatos a medidas:', measurementCandidates.length);
  console.log('🔄 Textos rotacionados:', rotatedTexts.length);
  
  // Mostrar ruas encontradas
  if (streetCandidates.length > 0) {
    console.log('\n🛣️ RUAS IDENTIFICADAS:');
    streetCandidates.forEach((street, index) => {
      console.log(`   ${index + 1}. "${street.text}" (${street.rotation.toFixed(1)}°)`);
    });
  }
  
  // Mostrar medidas encontradas
  if (measurementCandidates.length > 0) {
    console.log('\n📏 MEDIDAS IDENTIFICADAS:');
    measurementCandidates.forEach((measure, index) => {
      console.log(`   ${index + 1}. "${measure.text}" (${measure.rotation.toFixed(1)}°)`);
    });
  }
  
  // Mostrar textos rotacionados
  if (rotatedTexts.length > 0) {
    console.log('\n🔄 TEXTOS ROTACIONADOS (>5°):');
    rotatedTexts.forEach((rotated, index) => {
      console.log(`   ${index + 1}. "${rotated.text}" (${rotated.rotation.toFixed(1)}°)`);
    });
  }
  
  return {
    textEntities,
    streetCandidates,
    measurementCandidates,
    rotatedTexts
  };
};

// Função para simular o que o backend fará
const simulateBackendExtraction = () => {
  console.log('\n🤖 SIMULANDO EXTRAÇÃO DO BACKEND...');
  console.log('===================================');
  
  const analysis = analyzeTextEntities();
  
  if (!analysis) {
    console.log('❌ Não foi possível analisar - carregue um DXF primeiro');
    return;
  }
  
  console.log('🔍 O backend deve identificar:');
  console.log(`   🛣️ ${analysis.streetCandidates.length} nomes de ruas`);
  console.log(`   📏 ${analysis.measurementCandidates.length} medidas`);
  console.log(`   🔄 ${analysis.rotatedTexts.length} textos rotacionados`);
  
  console.log('\n💡 RESULTADO ESPERADO NO MEMORIAL:');
  console.log('==================================');
  
  if (analysis.streetCandidates.length > 0) {
    console.log('✅ Ruas reais em vez de [RUA]:');
    analysis.streetCandidates.forEach(street => {
      console.log(`   • "${street.text}"`);
    });
  }
  
  if (analysis.measurementCandidates.length > 0) {
    console.log('✅ Medidas reais em vez de [X,XXm]:');
    analysis.measurementCandidates.forEach(measure => {
      console.log(`   • "${measure.text}"`);
    });
  }
  
  console.log('\n🎯 Para testar a extração completa:');
  console.log('1. Gere um memorial no Viewer');
  console.log('2. Verifique os logs do backend para extração de textos');
  console.log('3. O memorial deve conter ruas e medidas reais');
};

// Executar análise
console.log('🚀 Iniciando análise de textos...');
simulateBackendExtraction();