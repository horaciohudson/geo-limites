# Projeto: Melhoria na Geração de Memoriais Descritivos (Generalização)

## Objetivo
Aprimorar o pipeline de geração de Memoriais Descritivos com IA, garantindo que o sistema atue de forma genérica para qualquer levantamento topográfico. O foco é enriquecer os dados extraídos pelo Backend (para fornecer semântica cartorial completa) e ajustar a Engenharia de Prompt para que o LLM atue como um "motor de template" estrito, respeitando integralmente a estrutura do `Template.md`.

## Fase 1: Enriquecimento Semântico no Backend (Java/Spring Boot)
Como o LLM não deve calcular ou inferir dados matemáticos/cartoriais (para evitar alucinações), o Backend deve mastigar essas informações e enviá-las prontas no `ResumoTecnico.json`.

- [x] **1.1. Conversor de Números por Extenso**
  - Implementar um utilitário (ex: `NumberToWordsConverter`) para converter valores numéricos em texto.
  - Suportar distâncias e perímetros (ex: `12.34` -> "doze metros e trinta e quatro centímetros").
  - Suportar áreas (ex: `130.00` -> "cento e trinta metros quadrados").
  - *Foco em Generalização:* Deve suportar de centímetros a milhares de metros/hectares.

- [x] **1.2. Conversor de Rumo para Sentido de Caminhamento**
  - Criar lógica para traduzir o Rumo Técnico (ex: `N 47°05' W`) ou Azimute para Sentido de Caminhamento Cartorial (ex: "Leste-Oeste", "Sul-Norte").
  - *Foco em Generalização:* Mapear os quadrantes geográficos de forma padronizada.

- [x] **1.3. Algoritmo de Posição da Face (Frente, Fundos, Laterais)**
  - Implementar lógica geométrica/topológica genérica para classificar as faces do lote.
  - Identificar a "Frente" (face confrontante com o logradouro principal).
  - Classificar as demais faces ("Fundos", "Lateral Esquerda", "Lateral Direita") com base no ângulo/vetor em relação à Frente.
  - Tratar casos de lotes de esquina (duas frentes).

- [x] **1.4. Sanitização de Dados (Clean-up)**
  - Limpar strings de `referencia` e confrontantes, removendo pontuações duplas finais (`..`), espaços extras e padronizando capitalização.

## Fase 2: Engenharia de Prompt e Integração com LLM
Ajustar a forma como o sistema instrui o LLM a utilizar o `Template.md` e o `ResumoTecnico.json`.

- [x] **2.1. Ajuste do *System Prompt* (Strict Template Engine)**
  - Modificar o prompt do agente gerador para proibir a redação livre.
  - O LLM deve atuar estritamente como um preenchedor de placeholders (`{{variavel}}`), mantendo o texto exato do template.
  - Instruir o uso dos novos campos pré-processados (`areaExtenso`, `posicaoCartorial`, etc.).

- [x] **2.2. Padronização de Formatação de Coordenadas**
  - Adicionar instrução explícita no prompt para o placeholder `{{pontos_lote}}`.
  - O formato exigido deve ser sempre: `PXX (coordenadas E X.XXm e N Y.YYm)`.

## Fase 3: Validação e Testes
- [ ] **3.1. Validação de Regressão**
  - Gerar o memorial para o arquivo de teste atual (`TESTE AGENTE_DBL TERRA NOBRE_2.dxf`) e comparar se o resultado se aproxima de 100% do `MemorialExemplo.md`.
- [ ] **3.2. Teste de Generalização**
  - Validar a lógica em lotes irregulares (triangulares, mais de 4 lados) e com áreas/perímetros de tamanhos variados para atestar a robustez do algoritmo de Frente/Fundos e da conversão por extenso.
