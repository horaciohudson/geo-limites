# Mini-Projeto: Arquitetura View Model para IA (Backend-For-AI)

## 📌 Objetivo
Eliminar a carga cognitiva e o risco de alucinação do LLM ao redigir as confrontações dos lotes. O Backend em Java assumirá a responsabilidade de processar, agrupar, ordenar e formatar o texto completo das confrontações (incluindo números por extenso, posição cartorial e sentido), entregando um bloco de texto finalizado e pronto para ser inserido no template.

## 🛠️ Fases da Implementação

### Fase 1: Atualização das Estruturas de Dados (DTOs)
- **Arquivo:** `MemorialTechnicalTypes.java`
- **Ação:** Adicionar o campo `String confrontacoesFormatadas` no record `LotTechnicalSummary`.

### Fase 2: Motor de Geração de Texto Cartorial (Java)
- **Arquivo:** `LotTopologyService.java` (ou `TechnicalSummaryService.java`)
- **Ação:** Criar a lógica que:
  1. Itera sobre as orientações cardeais obrigatórias (NORTE, SUL, LESTE, OESTE).
  2. Filtra os `TechnicalSideSummary` (lados) correspondentes a cada direção.
  3. Monta a frase granular utilizando os dados enriquecidos (`posicaoCartorial`, `sentidoCaminhamento`, `lengthExtenso`, etc.).
  4. Agrupa todas as frases em um único parágrafo/texto e salva no campo `confrontacoesFormatadas`.

### Fase 3: Limpeza e Estreitamento do Prompt
- **Arquivo:** `ClaudePromptCacheService.java` e/ou `MemorialPromptContextService.java`
- **Ação:** Remover as regras complexas de redação do prompt. Substituir por uma instrução estrita e simples: *"Para preencher o placeholder de confrontações, utilize EXATAMENTE o conteúdo do campo 'confrontacoesFormatadas' do JSON, sem adicionar, remover ou reescrever nenhuma palavra."*

### Fase 4: Validação
- Compilar o projeto (`mvnw clean compile`).
- Reiniciar o Spring Boot.
- Gerar um novo memorial e validar a estabilidade.

---
*Status:* Em andamento.
