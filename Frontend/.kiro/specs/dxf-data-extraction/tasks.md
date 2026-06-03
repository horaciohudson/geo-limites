# Plano de Implementação - Correção da Visualização DXF e Extração de Dados

## Visão Geral

Primeiro corrigir a visualização DXF para garantir alinhamento correto dos textos e elementos, depois implementar extração automática de dados técnicos baseada na visualização corrigida.

- [x] 1. Corrigir visualização DXF no ViewerDXF component




  - Revisar e corrigir algoritmos de renderização de texto
  - Ajustar posicionamento e alinhamento de elementos TEXT e MTEXT
  - Corrigir escala e rotação de textos para visualização precisa
  - Garantir que vértices P1, P2, etc. apareçam nas posições corretas
  - _Requisitos: Base para extração precisa de dados_



- [ ] 1.1 Analisar problemas atuais na renderização
  - Identificar onde textos estão desalinhados ou fora de posição
  - Verificar se coordenadas de texto estão sendo interpretadas corretamente
  - Analisar problemas de escala e zoom na visualização



  - Comparar com arquivo original no AutoCAD para identificar discrepâncias
  - _Requisitos: Diagnóstico dos problemas visuais_

- [x] 1.2 Corrigir renderização de elementos TEXT


  - Ajustar algoritmo de posicionamento de texto baseado em coordenadas DXF
  - Corrigir aplicação de rotação e alinhamento de texto
  - Implementar escala correta para diferentes níveis de zoom
  - Ajustar altura e largura de texto conforme especificações DXF
  - _Requisitos: Textos posicionados corretamente_




- [ ] 1.3 Corrigir renderização de elementos MTEXT
  - Implementar suporte adequado para texto multilinha
  - Corrigir formatação e quebras de linha



  - Ajustar posicionamento de blocos de texto complexos
  - Implementar interpretação correta de códigos de formatação MTEXT
  - _Requisitos: Textos multilinha corretos_

- [ ] 1.4 Ajustar sistema de coordenadas e transformações
  - Verificar se transformações de coordenadas DXF para canvas estão corretas
  - Corrigir inversão de eixos Y se necessário
  - Ajustar origem e escala do sistema de coordenadas
  - Implementar transformações corretas para rotação e espelhamento
  - _Requisitos: Sistema de coordenadas preciso_

- [ ] 1.5 Validar precisão da visualização corrigida
  - Comparar visualização com arquivo original no AutoCAD
  - Verificar se vértices P1, P2, etc. estão nas posições corretas
  - Confirmar que nomes de ruas aparecem próximos às linhas correspondentes
  - Testar com diferentes arquivos DXF para garantir robustez
  - _Requisitos: Visualização precisa para extração confiável_

- [ ] 2. Criar serviço de extração de dados de propriedade
  - Implementar PropertyDataExtractor que processa dados DXF já parseados
  - Extrair vértices identificados como pontos P1, P2, P3, etc.
  - Identificar confrontações a partir de elementos de texto próximos às linhas
  - Calcular área e perímetro automaticamente baseado nos vértices
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [ ] 2.1 Implementar extração de vértices do DXF
  - Analisar entidades DXF parseadas para identificar pontos com labels P1, P2, etc.
  - Extrair coordenadas X, Y, Z dos pontos identificados
  - Associar labels de texto aos pontos correspondentes usando proximidade
  - Ordenar vértices em sequência lógica para formar polígono
  - _Requisitos: 1.1, 1.2, 1.3, 1.4_

- [ ] 2.2 Implementar extração de confrontações
  - Identificar elementos de texto que representam nomes de ruas
  - Calcular distâncias entre vértices consecutivos
  - Determinar direções cardeais baseadas nas coordenadas
  - Associar textos de confrontação às linhas correspondentes por proximidade
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.3 Implementar cálculos geométricos automáticos
  - Calcular área total usando algoritmo de polígono (Shoelace formula)
  - Calcular perímetro somando distâncias entre vértices consecutivos
  - Validar se polígono está fechado e corrigir se necessário
  - Implementar validação de geometria (auto-intersecções, etc.)
  - _Requisitos: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Integrar extração com PropertyTechnicalData
  - Conectar com FileContext existente para detectar arquivos DXF
  - Adicionar botão "Extrair do DXF" quando dados estão disponíveis
  - Implementar lógica para processar múltiplos arquivos DXF
  - _Requisitos: 1.5, 4.4, 5.1_

- [ ] 3.1 Modificar PropertyTechnicalData para detectar DXF
  - Usar useFileContext hook para acessar dados DXF parseados
  - Verificar se há arquivos DXF com dados válidos disponíveis
  - Mostrar indicador visual quando extração está disponível
  - _Requisitos: 5.1, 5.4_

- [ ] 3.2 Adicionar botão de extração automática
  - Implementar botão "📐 Extrair do DXF" na interface
  - Adicionar loading state durante processamento
  - Mostrar progresso para arquivos grandes
  - _Requisitos: 5.1, 5.2_

- [ ] 4. Criar componente de prévia de extração
  - Desenvolver DXFExtractionPreview para mostrar dados extraídos
  - Permitir edição manual dos dados antes da confirmação
  - Implementar validação visual dos dados extraídos
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4.1 Implementar interface de prévia
  - Criar componente para exibir vértices extraídos em tabela editável
  - Mostrar confrontações identificadas com possibilidade de edição
  - Exibir cálculos de área e perímetro com validação
  - _Requisitos: 5.1, 5.2_

- [ ] 4.2 Adicionar funcionalidade de edição na prévia
  - Permitir edição de nomes de vértices
  - Permitir correção de coordenadas se necessário
  - Permitir edição de descrições de confrontações
  - Implementar validação em tempo real das edições
  - _Requisitos: 5.2, 5.3_

- [ ] 5. Implementar detecção de sistema de coordenadas
  - Analisar faixas de coordenadas para identificar sistema provável
  - Permitir seleção manual quando detecção automática falha
  - Validar coordenadas contra sistemas conhecidos do Brasil
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 5.1 Criar detector de sistema de coordenadas
  - Implementar heurísticas para identificar SIRGAS 2000, SAD 69, etc.
  - Analisar faixas de valores X, Y para determinar sistema provável
  - _Requisitos: 4.1, 4.2_

- [ ] 5.2 Adicionar validação de coordenadas
  - Verificar se coordenadas estão dentro do território brasileiro
  - Alertar sobre possíveis inconsistências de sistema
  - _Requisitos: 4.3, 4.4_

- [ ] 6. Implementar tratamento robusto de erros
  - Criar fallbacks para quando extração automática falha
  - Implementar mensagens de erro claras e acionáveis
  - Permitir extração parcial quando alguns dados não são encontrados
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.1 Implementar estratégias de fallback
  - Permitir entrada manual quando extração falha completamente
  - Combinar dados extraídos com entrada manual para dados faltantes
  - _Requisitos: 6.1, 6.5_

- [ ] 6.2 Criar sistema de mensagens de erro
  - Implementar mensagens específicas para diferentes tipos de erro
  - Sugerir ações corretivas quando possível
  - _Requisitos: 6.2, 6.3_

- [ ]* 7. Implementar testes para visualização e extração
  - Criar testes unitários para correções de renderização
  - Testar PropertyDataExtractor com diferentes arquivos DXF
  - Validar cálculos geométricos e detecção de coordenadas
  - _Requisitos: Validação de qualidade_

- [ ]* 7.1 Criar testes para visualização corrigida
  - Testar renderização de texto em diferentes posições e rotações
  - Validar transformações de coordenadas
  - Testar comportamento com diferentes níveis de zoom
  - _Requisitos: Qualidade da visualização_

- [ ]* 7.2 Criar testes para extração de dados
  - Testar extração de vértices com diferentes formatos de label
  - Testar cálculos de área e perímetro
  - Testar detecção de sistema de coordenadas
  - _Requisitos: 1.1, 1.2, 1.3, 3.1, 3.2, 4.1, 4.2_