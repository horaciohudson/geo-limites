# Mini Projeto: Melhorar o Resumo Tecnico para Elevar o Memorial

## Objetivo
Corrigir o `Resumo Tecnico` para que ele deixe de contaminar o `Memorial` com:

- lotes fora da numeracao esperada;
- contornos grandes promovidos como se fossem lotes validos;
- excesso de microsegmentacao nas confrontacoes;
- uso incompleto do `processingContext` na narrativa do terreno original;
- insumos verbosos demais para a IA, aumentando tempo e custo sem melhorar a qualidade.

## Premissa desta frente
Nao considerar, por enquanto, divergencias de cadastro da propriedade em relacao ao exemplo. Esta frente trata apenas da qualidade estrutural do resumo e do quanto ele ajuda ou atrapalha a geracao do memorial.

## Diagnostico resumido
Hoje o `Memorial` esta ruim em parte porque o `Resumo Tecnico` ja sai ruim.

Sinais encontrados:

- `ResumoTecnico_JSON.md` traz `lotNumber` e geometrias fora do padrao esperado para o caso.
- `MemorialComIA_Local.md` replica quase literalmente as areas, perimetros, ordens e confrontacoes do resumo.
- o `TERRENO 1` do memorial ainda falha na montagem, mas isso nao explica sozinho a distorcao dos lotes;
- o resumo entrega muitos segmentos individuais, e a IA gasta tempo narrando detalhe demais.

## Meta funcional
Fazer o `Resumo Tecnico` passar a produzir uma base canonica e enxuta, adequada para:

1. painel de resumo;
2. exportacao;
3. geracao deterministica;
4. geracao assistida por IA com menos tokens e menos ambiguidade.

## Escopo
### Dentro do escopo
- revisar a numeracao e ordenacao dos lotes no resumo;
- impedir que contornos globais ou poligonos indevidos sejam promovidos como lotes reais;
- consolidar confrontacoes por direcao de forma mais inteligente;
- enriquecer o resumo com dados territoriais canonicos do `processingContext`;
- reduzir a verbosidade estrutural enviada ao memorial.

### Fora do escopo
- corrigir cadastro de proprietario, cidade, matricula ou identificacao do imovel;
- redesenhar o layout visual do painel;
- alterar o template juridico final do memorial.

## Frentes de trabalho
### Frente 1: Corrigir a selecao e a numeracao dos lotes no resumo
**Problema**
- O resumo aceita ou promove lotes fora do conjunto esperado.
- A ordenacao atual depende de `lotNumberHint` e fallback por indice, o que pode consolidar o poligono errado como lote valido.

**Arquivos principais**
- [LotTopologyService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/LotTopologyService.java)
- [MemorialApiService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java)
- [technicalSummaryPayload.ts](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/adapters/geolimites/technicalSummaryPayload.ts)
- [geoLimitesLotTextUtils.ts](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/adapters/geolimites/geoLimitesLotTextUtils.ts)

**Mudancas desejadas**
- priorizar lotes detectados por ancora textual consistente;
- rebaixar poligonos gigantes ou globais para contexto territorial, nunca para lote unitario;
- criar regra objetiva para rejeitar lotes com area/perimetro desproporcionais ao conjunto;
- garantir alinhamento entre `detectedLotNumbers` e `LotTechnicalSummary`.

**Criterio de aceite**
- os lotes do resumo saem em ordem crescente e coerente com a malha do desenho;
- o resumo nao promove `area total`, `remanescente` ou contorno global como `LOTE 1`, `2` ou `3`.

### Frente 2: Consolidar o resumo para falar em lados, nao em microarestas
**Problema**
- o resumo carrega lados demais e o memorial acaba narrando cada microtrecho.

**Arquivos principais**
- [TechnicalSummaryService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/TechnicalSummaryService.java)
- [DeterministicMemorialService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/DeterministicMemorialService.java)
- [MemorialPromptContextService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialPromptContextService.java)

**Mudancas desejadas**
- manter `sides` tecnicos completos no JSON, mas produzir uma camada canonica mais compacta para narrativa;
- reforcar `consolidatedConfrontations` como fonte principal do memorial;
- agrupar sequencias colineares e repetidas quando a referencia e a direcao forem equivalentes;
- passar ao memorial um resumo territorial por face, em vez de despejar todas as arestas.

**Criterio de aceite**
- o memorial deixa de repetir dezenas de linhas com `confrontando neste segmento`;
- cada lote pode ser descrito por face com poucas subdivisoes realmente necessarias.

### Frente 3: Fortalecer o processingContext como base do terreno original
**Problema**
- o resumo ate preserva `processingContext`, mas o memorial ainda nao aproveita isso de forma suficiente.

**Arquivos principais**
- [TechnicalSummaryService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/TechnicalSummaryService.java)
- [DeterministicMemorialService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/DeterministicMemorialService.java)
- [MemorialPromptContextService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialPromptContextService.java)

**Mudancas desejadas**
- distinguir claramente no resumo:
  - terreno original;
  - area total primaria;
  - lotes resultantes;
- produzir campos canonicos para a narrativa do terreno original;
- permitir que o memorial use o `processingContext` sem depender de fallback fraco dos lotes.

**Criterio de aceite**
- o `TERRENO 1` do memorial pode ser montado com base territorial valida, sem `0,00m` e sem confrontacoes vazias, desde que o `processingContext` exista.

### Frente 4: Reduzir o custo do prompt do memorial
**Problema**
- mesmo sem pausas artificiais, a IA ainda recebe contexto grande demais.

**Arquivos principais**
- [MemorialPromptContextService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialPromptContextService.java)
- [MemorialApiService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java)

**Mudancas desejadas**
- enviar para a IA apenas a representacao canonica do lote;
- reservar vertices completos e lados tecnicos completos para validacao, nao para narrativa livre;
- reduzir o tamanho do prompt por lote/chunk;
- medir tempo real antes e depois.

**Criterio de aceite**
- o tempo de geracao cai perceptivelmente;
- a saida fica mais proxima do exemplo mesmo com menos texto de entrada.

## Ordem sugerida de execucao
1. `LotTopologyService`: filtrar/promover apenas lotes validos e revisar numeracao.
2. `TechnicalSummaryService`: introduzir camada canonica compacta para confrontacoes e narrativa.
3. `MemorialPromptContextService`: consumir preferencialmente a camada canonica do resumo.
4. `DeterministicMemorialService`: montar melhor o terreno original via `processingContext`.
5. medir novamente tempo e qualidade do memorial.

## Entregaveis
- resumo tecnico com lotes coerentes e ordenados;
- novo bloco canonico por lote, focado em narrativa;
- geracao de memorial com menos verbosidade e menos tempo;
- comparacao antes/depois usando:
  - [ResumoTecnico_JSON.md](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/Memoriais/ResumoTecnico_JSON.md)
  - [MemorialComIA_Local.md](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/Memoriais/MemorialComIA_Local.md)
  - [MemorialExemplo.md](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/Memoriais/MemorialExemplo.md)

## Checklist de aceite
- [ ] o resumo nao usa poligono global como lote unitario;
- [ ] os lotes saem em ordem crescente e batem com a leitura do desenho;
- [ ] o resumo oferece confrontacoes consolidadas por face de forma confiavel;
- [ ] o memorial deixa de abrir com terreno original zerado quando houver `processingContext`;
- [ ] o memorial fica mais proximo do exemplo no estilo e na estrutura;
- [ ] o tempo de geracao cai em relacao ao estado atual.

## Proxima execucao recomendada
Comecar pela `Frente 1`, porque ela ataca a raiz do desvio. Se a numeracao e a selecao dos lotes continuarem erradas, qualquer melhoria textual no memorial vira apenas maquiagem.
