# HANDOFF - NOVA TASK

## Estado Atual

O projeto `geo-limites` avancou bastante em quatro frentes que ficaram conectadas:

1. memorial descritivo mais deterministico
2. georreferenciamento por pontos nomeados cadastrados no imovel
3. consolidacao do memorial interativo no visualizador
4. reorganizacao visual do cadastro e da pagina de imoveis

A diretriz consolidada desta etapa foi:

- backend como fonte da verdade geometrica
- IA apenas como redatora
- fallback tecnico quando a IA falhar ou a OpenAI devolver `429`
- uso de pontos/estacas reais cadastrados para aproximar o desenho de coordenadas reais

## Atualizacao De Publicacao - 2026-06-19

Esta frente foi isolada, commitada, publicada no GitHub e aplicada na VPS pela branch:

- `publish-vps-sync-20260619-memorial-landmarks`

### Commits principais desta rodada

- `b1fdaab` `feat: consolida memorial interativo e georreferenciamento por landmarks`
- `1390c1f` `fix: alinhar service de creditos com memorial interativo`
- `0ec117c` `fix: restaura compatibilidade da pasta de templates`
- `f94729c` `fix: permite rolagem na sidebar de configuracoes`
- `7e8244b` `fix: compatibiliza creditos com contagem explicita de lotes`
- `7b844e7` `fix: adiciona descricao customizada ao consumo de creditos`

### Status de producao

- frontend publicado com sucesso na VPS
- backend publicado com sucesso na VPS
- swagger respondendo `HTTP 200` em `http://127.0.0.1:9010/swagger-ui/index.html`
- area de `Configuracao` recomposta com `Normas e Exemplos` e `Pasta de Templates`
- memorial com creditos recompilado e implantado apos alinhar `MemorialCreditIntegrationService` e `CreditService`

### O que ficou fora desta publicacao

- mudancas paralelas de `Conta`, `admin`, `docs`, `templates` fora do escopo fechado
- uploads e temporarios locais
- varias alteracoes ainda existentes no working tree local e no repo da VPS

### Riscos residuais

- ainda ha um erro de shutdown do Logback no encerramento da instancia anterior (`NoClassDefFoundError: ch/qos/logback/classic/spi/ThrowableProxy`), mas isso nao bloqueou o deploy nem a subida da nova versao
- a VPS segue com arquivos modificados localmente em `Backend/mvnw`, `deploy/scripts/deploy-backend.sh` e `deploy/scripts/deploy-frontend.sh`
- ainda vale uma validacao funcional final completa do fluxo de memorial e creditos em producao

## O Que Foi Entregue

### Memorial e backend tecnico

- Ordenacao e consolidacao do memorial foram endurecidas para reduzir mistura de lotes e duplicacoes.
- O backend passou a sustentar melhor o fallback deterministico quando a OpenAI falha por `429`.
- O resumo tecnico por lote foi fortalecido para servir de base a uma redacao mais controlada.
- O georreferenciamento por pontos nomeados foi integrado ao fluxo tecnico dos lotes.
- Os vertices tecnicos dos lotes agora podem nascer com coordenadas projetadas quando houver amarracao suficiente.

### Georreferenciamento

- O cadastro do imovel passou a aceitar varios pontos/estacas nomeados.
- O matching entre cadastro e desenho foi implementado no backend.
- Com 1 ponto conhecido: ha translacao.
- Com 2 ou mais pontos conhecidos: ha translacao, rotacao e escala.
- O sistema registra correspondencias e residuo medio da transformacao.

### Viewer e memorial interativo

- O memorial interativo deixou de repetir `DECLARACAO` por lote.
- A montagem final passou a ordenar melhor os blocos e concentrar o fechamento no final.
- O `ViewerDXF` foi reduzido para uma area quadrada, evitando o canvas excessivamente alto.
- A consolidacao no frontend ficou mais previsivel, embora ainda mereca uma rodada final de validacao apos novo teste completo.

### Cadastro e pagina de imoveis

- `Pontos ou Estacas de Referencia` agora aparecem em tabela no cadastro.
- O botao `+ Adicionar Ponto ou Estaca` foi movido para o cabecalho da secao.
- A antiga secao visual de `Coordenadas Este/Norte` foi removida.
- A area `Origem das Coordenadas` foi simplificada e compactada.
- A pagina `Imoveis` passou a mostrar os pontos/estacas cadastrados em vez de depender so de SIRGAS isolado.

## Arquivos Principais Desta Frente

### Backend

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/DxfGeoReferenciaExtractorService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/PropertyService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/mapper/PropertyMapper.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/MemorialApiController.java`

### Frontend

- `Frontend/src/pages/Viewer.tsx`
- `Frontend/src/components/ViewerDXF.tsx`
- `Frontend/src/components/property/PropertyBasicData.tsx`
- `Frontend/src/components/property/PropertySummary.tsx`
- `Frontend/src/pages/PropertiesPresentation.tsx`
- `Frontend/src/pages/PropertyRegister.tsx`
- `Frontend/src/styles/App.css`
- `Frontend/src/types/property.ts`

## Validacoes Ja Feitas

- Backend compilando com `.\mvnw.cmd -q -DskipTests compile`
- Diagnosticos limpos nos arquivos alterados mais recentemente
- Diagnosticos limpos nos ajustes de frontend desta etapa

## Problemas Ainda Em Aberto

### 1. Validacao final do memorial completo

Ainda e recomendavel rodar um teste completo novo para confirmar:

- topo com um unico cabecalho
- todos os lotes esperados presentes
- declaracao unica no fechamento
- ausencia de bloco hibrido ou lote fora do padrao

### 2. Dependencia operacional da OpenAI

Os logs mais recentes ainda mostraram `429 Too Many Requests` em algumas geracoes.

Isso significa:

- o fallback esta protegendo a operacao
- mas a escrita da IA ainda pode oscilar por limite temporario

### 3. Limpeza de repositorio e estabilizacao operacional

O deploy principal desta frente ja foi concluido, mas o repositorio continua com muitas alteracoes misturadas, incluindo frentes fora deste escopo:

- creditos
- templates
- admin
- docs
- temporarios
- uploads

- Para as proximas rodadas, ainda e preciso revisar com cuidado o que realmente entra em cada commit.

## Nova Task Recomendada

Fechar a validacao funcional da entrega e preparar a proxima rodada sem misturar frentes paralelas.

### Objetivo

Validar em producao o que foi publicado e limpar o terreno para a proxima frente sem contaminar deploys futuros.

### Prioridade 1

Executar uma validacao final do fluxo principal publicado:

- login
- configuracao com `Normas e Exemplos` e `Pasta de Templates`
- cadastro/edicao de imovel com pontos nomeados
- viewer
- geracao de memorial
- conferencia do consumo e do estorno de creditos quando aplicavel

### Prioridade 2

Investigar pendencias operacionais remanescentes:

- erro de shutdown do Logback no backend
- arquivos modificados localmente na VPS
- working tree local ainda misturado com outras frentes

### Prioridade 3

Preparar a proxima rodada com seguranca:

- separar novas frentes por commit
- evitar reaproveitar branch quebrada antiga
- considerar clone/worktree mais limpo para novos deploys

## Escopo Seguro Sugerido Para Commit

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/DxfGeoReferenciaExtractorService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/PropertyService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/mapper/PropertyMapper.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/MemorialApiController.java`
- `Frontend/src/components/property/PropertyBasicData.tsx`
- `Frontend/src/components/property/PropertySummary.tsx`
- `Frontend/src/pages/PropertiesPresentation.tsx`
- `Frontend/src/pages/PropertyRegister.tsx`
- `Frontend/src/pages/Viewer.tsx`
- `Frontend/src/components/ViewerDXF.tsx`
- `Frontend/src/styles/App.css`
- `Frontend/src/types/property.ts`

## O Que Nao Levar Sem Revisao

- `Backend/uploads/dxf/*`
- `Backend/Memoriais/*`
- `.dbg/`
- `.trae-publish-temp/`
- arquivos temporarios e testes soltos
- mudancas de creditos/admin/templates/docs que nao pertencem a esta entrega

## Sugestao De Inicio Imediato Para A Proxima Pessoa

1. validar em producao `Configuracao`, `Cadastro de Imoveis`, `Viewer` e geracao de memorial
2. confirmar o fluxo de creditos com um caso real ou controlado
3. registrar qualquer erro residual observado em runtime
4. tratar separadamente a limpeza do repo local e da VPS
5. so depois iniciar nova frente funcional
