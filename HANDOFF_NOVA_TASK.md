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

## Atualizacao De Continuidade - 2026-06-20

Desde a ultima publicacao, houve uma rodada adicional focada principalmente em memorial, exportacao PDF, templates e consolidacao de mudancas locais que estavam pendentes.

### Commit mais recente ja publicado no GitHub

- branch: `publish-vps-sync-20260619-memorial-landmarks`
- commit: `ac9a5f6` `feat: sincroniza ajustes de memorial, creditos e templates`

### O que foi confirmado nesta rodada

- o problema de cabecalho duplo no memorial local foi finalmente isolado com clareza
- a geracao do memorial passou a devolver um unico cabecalho correto no texto
- o cabecalho duplicado que continuava aparecendo era criado no momento da exportacao para PDF
- a causa raiz ficou no frontend, nos fluxos de exportacao de:
  - `Frontend/src/pages/Memorial.tsx`
  - `Frontend/src/pages/Viewer.tsx`
  - `Frontend/src/pages/Report.tsx`
- a exportacao PDF foi ajustada para nao desenhar um segundo cabecalho quando o memorial ja comeca com `Memorial Descritivo`
- o arquivo local `Backend/Memoriais/MemorialComIA_Local.md` passou a ficar com cabecalho unico no formato:
  - `Memorial Descritivo`
  - `Projeto: 12345, INCRA-4567`
  - `Arquivo: TESTE AGENTE_DBL TERRA NOBRE_2.dxf`
  - `Data: 19/06/2026`

### Validacoes feitas nesta rodada

- frontend compilando com `npm run build`
- backend compilando com `.\mvnw.cmd -q -DskipTests compile`
- commit consolidado criado e enviado ao GitHub
- working tree local limpo do ponto de vista do projeto, restando apenas `\.trae-publish-temp\` como backup temporario nao versionado

### Estado de deploy desta rodada

- o commit `ac9a5f6` ja esta no GitHub, mas ainda nao foi aplicado na VPS nesta conversa
- o acesso da VPS foi identificado pelos logs como:
  - host/IP: `2.25.169.55`
  - prompt observado: `root@srv1729495:~#`
- ainda falta confirmar o metodo exato de conexao SSH operacional a partir desta maquina para executar o deploy remoto com seguranca

### Risco residual mais importante

- como o commit mais recente ainda nao foi reaplicado na VPS, a producao pode continuar sem a correcao definitiva do cabecalho duplicado no PDF

## Atualizacao Mais Recente - 2026-06-20

Desde a atualizacao acima, a frente principal mudou de foco e ficou concentrada no endurecimento tecnico da geracao do memorial, principalmente para reduzir dependencia da IA e impedir cobranca indevida de lotes fora do escopo ativo.

### Arquitetura tecnica nova ja preparada

- foi iniciado o mini-projeto `Backend/project/memorial-base-estruturado/README.md`
- o mapeamento tecnico do pipeline atual foi registrado em `Backend/project/memorial-base-estruturado/MAPEAMENTO_ATUAL.md`
- o backend passou a montar um `memorial_base_json` estruturado antes da redacao da IA
- esse snapshot tecnico passou a ser persistido em `tab_memorial_base_snapshots`
- foi criado endpoint para inspecao do ultimo snapshot tecnico por propriedade em `GET /api/properties/{id}/memorial-base/latest`

### Arquivos centrais desta frente

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialBaseBuilderService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialBaseSnapshotService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/PropertyController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/model/MemorialBaseSnapshot.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/repository/MemorialBaseSnapshotRepository.java`
- `Backend/src/main/resources/db/migration/V15__memorial_base_snapshots.sql`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/memorialbase/*`

### Regra de negocio consolidada pelo usuario

- nao cobrar lotes faltantes da sequencia geral do desenho
- considerar apenas camada ativa, selecao ativa e poligonos efetivamente enviados na geracao
- se lotes existirem em camada antiga ou no desenho completo, mas nao estiverem no escopo ativo, eles nao devem ser exigidos da IA
- exemplo citado pelo usuario: nao pedir automaticamente `2, 4, 5, 10, 11` se esses lotes nao pertencem ao escopo ativo daquela geracao

### Ajuste tecnico concluido agora

- `MemorialApiService` deixou de usar apenas a contagem global presumida para validar completude do memorial
- a quantidade de lotes considerada na geracao passou a ser limitada pelo numero real de poligonos/lotes do escopo ativo
- a validacao final agora compara o memorial com os lotes esperados do proprio backend para aquele escopo
- com isso, conjuntos esparsos de lotes ativos deixam de ser invalidados por ausencia de numeros intermediarios que nao fazem parte da geracao atual

### Validacoes feitas nesta ultima rodada

- diagnosticos limpos em `MemorialApiService.java`
- backend compilando com `.\mvnw.cmd -q -DskipTests compile`
- a tabela `tab_memorial_base_snapshots` ja existe no banco segundo confirmacao do usuario

### Estado exato para retomada

- a infraestrutura do `memorial_base_json` ja esta pronta
- a regra de completude por escopo ativo ja foi ajustada no backend
- esta ultima alteracao de escopo ativo foi feita localmente e validada por compilacao
- ainda nao ficou registrado neste handoff nenhum commit novo dessa ultima micro-rodada

### Proximo passo recomendado

1. executar um teste dirigido com selecao parcial de lotes/camadas
2. confirmar em runtime quais lotes o backend considerou como escopo ativo naquela geracao
3. se o comportamento estiver correto, criar commit isolado apenas desta frente do memorial
4. depois publicar no GitHub e aplicar em ambiente remoto com validacao funcional

### Resultado esperado do proximo teste

- se o usuario enviar apenas alguns poligonos/lotes ativos, o memorial deve cobrar somente esses lotes
- nao deve haver pedido indevido para refazer lotes ausentes da camada ativa
- a IA deve continuar apenas como redatora do escopo tecnico validado pelo backend

## Nova Task Da IDE - 2026-06-20

Criar uma nova task operacional focada em publicacao segura e validacao final do memorial apos a rodada consolidada no commit `ac9a5f6`.

### Objetivo

Aplicar na VPS o commit mais recente e confirmar em producao que o memorial e a exportacao PDF permanecem com um unico cabecalho.

### Prioridade 1

Executar o deploy remoto seguro da branch `publish-vps-sync-20260619-memorial-landmarks` contendo o commit `ac9a5f6`.

Checklist minimo:

- acessar a VPS correta
- entrar em `/opt/geolimites/repo`
- confirmar `git status` e branch atual na VPS antes de qualquer `pull`
- atualizar a branch para o commit mais recente
- republicar frontend
- republicar backend
- verificar o status do servico backend e o Swagger

### Prioridade 2

Validar funcionalmente em producao o fluxo de memorial apos o deploy:

- gerar memorial
- exportar memorial em PDF
- confirmar que o PDF nao cria cabecalho extra
- confirmar que o topo exibido permanece:
  - `Memorial Descritivo`
  - `Projeto: 12345, INCRA-4567`
  - `Arquivo: ...`
  - `Data: ...`

### Prioridade 3

Se ainda houver divergencia em producao:

- comparar o texto exibido na tela com o PDF exportado
- verificar se a instancia publicada realmente corresponde ao commit `ac9a5f6`
- revisar logs do backend e fluxo de exportacao no frontend antes de tocar em template ou prompt novamente

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

## Atualizacao Mais Recente - 2026-06-23

Desde a ultima atualizacao deste handoff, a frente principal saiu temporariamente do memorial/georreferenciamento e ficou fortemente concentrada em:

- persistencia real de templates fora do `localStorage`
- estabilizacao do fluxo `Configuracao > Normas e Exemplos`
- limpeza de UX em `Normas e Template do Memorial`
- endurecimento do cadastro/edicao de imovel para arquivos e origem de coordenadas

### O que foi concluido nesta rodada

- `Normas e Exemplos` ficou consolidado como a tela principal correta da configuracao
- o fluxo de `Buscar Modelo` passou a aceitar dois caminhos de forma explicita:
  - `JSON` importa template pronto
  - `PDF/TXT` gera modelo/template com IA
- os templates novos deixaram de depender de `createdTemplates` no `localStorage`
- templates agora sao persistidos no backend e gravados em `Backend/templates`
- a listagem de templates em `Normas e Exemplos` passou a usar o backend como fonte principal
- templates legados que ainda existiam apenas no `localStorage` passaram a ser migrados automaticamente para o backend
- `Normas e Template do Memorial` deixou de depender de `createdTemplates` para montar a lista de templates
- o cartao `📄 Template deste memorial` foi limpo, removendo `Secoes` e `Template ID`
- `Operacao > Arquivos DXF` foi simplificado para uso por combobox + `Adicionar`, com reaproveitamento dos arquivos tecnicos cadastrados no imovel
- `Cadastro de Imovel` foi endurecido para reidratar corretamente:
  - arquivos tecnicos persistidos
  - origem/fonte das coordenadas gravada

### Ajuste importante no fluxo de salvar template

Foi identificado e corrigido um erro de frontend no salvamento local do template:

- erro observado:
  - `SecurityError: Failed to execute 'showSaveFilePicker' on 'Window': Must be handling a user gesture to show a file picker`
- causa:
  - o `showSaveFilePicker` era chamado depois do processamento assincrono da IA/backend, fora do gesto direto do usuario
- correcao aplicada:
  - a escolha do local de salvamento agora acontece no inicio da acao do usuario
  - o JSON gerado e gravado depois no handle ja obtido
  - se o picker nao estiver disponivel, o frontend faz fallback para download automatico
  - se o usuario cancelar a escolha do local, o template continua salvo no sistema sem tratar isso como falha de processamento

### Melhorias de UX concluidas em `Normas e Exemplos`

- adicionados botoes pequenos de ajuda `?` em:
  - `📘 Normas Base`
  - `📄 Modelos Base`
- esses botoes seguem o mesmo padrao visual/funcional usado em `Criar sua Conta`
- o botao `Buscar Modelo` foi renomeado para `Buscar Modelo/Template`
- a tela foi considerada pelo usuario como "muito boa" e funcionalmente estabilizada

### Arquivos principais tocados nesta rodada

#### Frontend

- `Frontend/src/pages/ConfigureTemplates.tsx`
- `Frontend/src/pages/MemorialStandards.tsx`
- `Frontend/src/pages/Files.tsx`
- `Frontend/src/pages/PropertyRegister.tsx`
- `Frontend/src/pages/PropertiesPresentation.tsx`
- `Frontend/src/components/property/PropertySummary.tsx`
- `Frontend/src/App.tsx`
- `Frontend/src/types/template.ts`

#### Backend

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/TemplateService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/TemplateCreateDTO.java`

### Validacoes feitas nesta rodada

- frontend compilando com `npm run build`
- backend compilando com `mvn -q -DskipTests compile`
- diagnosticos limpos nos arquivos recentes de frontend
- diagnosticos limpos nos arquivos recentes de backend
- logs do backend confirmando geracao e persistencia correta do template quando o erro estava apenas no frontend

### Estado exato para retomada

- `Normas e Exemplos` esta estavel e pode ser considerado fechado nesta rodada
- templates agora estao persistidos fora do `localStorage`
- `Normas e Template do Memorial` ja consome templates do backend
- o erro conhecido mais relevante fora dessa frente ficou em aberto:
  - erro ao regravar `Cadastro de Imoveis`
- o georreferenciamento nao foi retomado nesta rodada final; apenas ficou preparado para ser a proxima frente

### Proximo passo recomendado

1. abrir uma nova task focada em georreferenciamento com contexto limpo
2. revisar o backend de georreferenciamento a partir de:
   - `DxfGeoReferenciaExtractorService`
   - `MemorialApiService`
   - fluxo real de pontos/estacas cadastrados no imovel
3. reproduzir um caso real controlado para verificar:
   - correspondencia desenho x landmarks
   - transformacao aplicada
   - residuos
   - reflexo no memorial final
4. em paralelo, manter anotado como pendencia separada o erro ao regravar `Cadastro de Imoveis`, para nao misturar essa investigacao com georreferenciamento

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

## Atualizacao Mais Recente - 2026-06-25

Desde a ultima atualizacao deste handoff, a frente principal saiu do eixo de templates e passou a abrir uma nova trilha de produto para o `GeoLimites`:

- editor corretivo orientado ao memorial
- reaproveitamento de conceitos do `Studio`, sem depender do `Studio` como produto
- uso de um caso real de DXF para decidir o que deve ser corrigido dentro do sistema e o que deve continuar no AutoCAD

### Decisao de produto consolidada nesta rodada

- o `GeoLimites` nao deve tentar virar um CAD generico
- a equipe ja conhece AutoCAD, entao nao faz sentido competir com ele
- o caminho recomendado e um `editor corretivo` pequeno, especializado e guiado pelo `Resumo Tecnico`
- o visualizador continua leve
- o modo corretivo entra apenas quando houver problema tecnico localizado e potencialmente corrigivel com baixo atrito

### O que foi criado nesta rodada

Foi aberto um mini-projeto novo em:

- `Backend/project/editor-corretivo-memorial/README.md`
- `Backend/project/editor-corretivo-memorial/ROADMAP.md`
- `Backend/project/editor-corretivo-memorial/BACKLOG.md`
- `Backend/project/editor-corretivo-memorial/CASO_PILOTO_25_LOTES_5_ABERTOS.md`
- `Backend/project/editor-corretivo-memorial/TABELA_CLASSIFICACAO_CASO_PILOTO.md`

### O que esse mini-projeto define

- o editor corretivo nao substitui AutoCAD
- ele deve resolver apenas o que afeta a cadeia `DXF -> Resumo Tecnico -> Memorial`
- a `Fase 0` agora e delimitar com clareza quais erros merecem correcao interna
- o primeiro caso real escolhido para isso foi um DXF de `25 lotes` com `5 lotes abertos`

### Caso piloto escolhido

O caso piloto foi consolidado como:

- `25 lotes com 5 lotes abertos`

Esse caso foi escolhido porque:

- testa um loteamento real maior
- força o sistema a priorizar integridade geometrica em vez de simples contagem de lotes
- ajuda a separar correcoes de baixo atrito de casos que devem continuar no AutoCAD

### Matriz de decisao criada

Foi criada uma matriz de classificacao para o caso piloto em:

- `Backend/project/editor-corretivo-memorial/TABELA_CLASSIFICACAO_CASO_PILOTO.md`

Objetivo dessa matriz:

- identificar lote por lote o problema real
- classificar a causa como simples ou estrutural
- decidir se vale corrigir no `GeoLimites`
- indicar a ferramenta minima necessaria
- registrar quando o caso deve continuar no AutoCAD

### Regras de escopo consolidadas

Um problema so deve entrar no editor corretivo se cumprir a maior parte destes criterios:

- erro localizado
- intencao geometrica clara
- baixo risco de o sistema inventar a solucao
- correcao mais rapida que sair para AutoCAD

Se o problema exigir:

- redesenho amplo
- varias entidades incoerentes
- geometria ambigua

entao o caso deve continuar no AutoCAD.

### Artefatos tecnicos ja existentes que podem ajudar na proxima rodada

- o frontend ja possui utilitarios de geometria e snapping em `Frontend/src/utils/geometry.ts`
- o `ViewerDXF` ja possui partes de snapping e interacao com segmentos/pontos em `Frontend/src/components/ViewerDXF.tsx`
- o backend ja possui persistencia de `snapshot tecnico` ligada ao memorial base:
  - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialBaseSnapshotService.java`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/model/MemorialBaseSnapshot.java`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/controller/PropertyController.java`

Esses pontos sugerem que a versao corrigida do arquivo provavelmente deve nascer como `snapshot tecnico corrigido`, e nao como reescrita cega do DXF original logo na primeira fase.

### Observacao importante para retomada

Nesta conversa, o usuario informou que existe um DXF real com `25 lotes` e `5 lotes abertos` que sera usado como caso piloto.

Tambem foram localizados arquivos DXF candidatos no repositorio, entre eles:

- `Frontend/arquivos_dxf/TESTE AGENTE_DBL TERRA NOBRE_2.dxf`
- `Backend/src/main/resources/DXF/TESTE AGENTE_DBL TERRA NOBRE_2.dxf`
- `Frontend/arquivos_dxf/TESTE AGENTE_DBL TERRA NOBRE_1.dxf`

Mas ainda nao ficou confirmado neste handoff qual deles e, de fato, o arquivo oficial do caso piloto dos `5 lotes abertos`.

### Nova task recomendada agora

Abrir a `Fase 0` do projeto `editor-corretivo-memorial` usando o caso piloto real de `25 lotes com 5 lotes abertos`.

### Objetivo

Preencher a matriz de classificacao do caso piloto e fechar a fronteira entre:

- o que o `GeoLimites` deve corrigir
- o que deve continuar no AutoCAD

### Prioridade 1

Confirmar qual e o DXF oficial do caso piloto.

Checklist minimo:

- identificar o arquivo exato usado pelo usuario
- abrir o arquivo no fluxo atual do visualizador
- gerar ou inspecionar o `Resumo Tecnico`
- descobrir exatamente quais sao os 5 lotes abertos

### Prioridade 2

Preencher `Backend/project/editor-corretivo-memorial/TABELA_CLASSIFICACAO_CASO_PILOTO.md` com:

- lote
- tipo de abertura
- causa provavel
- corrigivel no GeoLimites?
- ferramenta necessaria
- deve continuar no AutoCAD?

### Prioridade 3

Ao final da classificacao, decidir o escopo da primeira onda do editor corretivo.

Resultado esperado:

- lista curta de ferramentas minimas
- exclusao explicita do que nao vale implementar agora
- criterio objetivo para saber se o editor corretivo vale o investimento

### Proximo passo recomendado

1. confirmar o DXF oficial do caso piloto
2. cruzar esse DXF com o `Resumo Tecnico`
3. preencher a tabela lote por lote
4. so depois iniciar implementacao de qualquer ferramenta corretiva

## Atualizacao Mais Recente - 2026-06-26

Desde a ultima atualizacao deste handoff, a direcao principal mudou de forma explicita:

- o `Visualizador` foi mantido para pesquisa e referencia
- a nova frente ativa passou a ser um `Editor CAD` independente
- a UX base foi espelhada a partir do projeto `Studio`
- o foco deixou de ser heuristica em cima do viewer e passou a ser edicao CAD real no frontend

### Decisao de produto consolidada

- nao remover o `Visualizador`
- criar um `Editor CAD` proprio ao lado dele
- abrir em tela cheia
- abrir vazio, sem herdar automaticamente o DXF do fluxo antigo
- tratar o editor como aplicacao independente, sem depender do GeoLimites para abrir arquivo

### O que foi concluido nesta rodada

- foi criada e estabilizada a rota fullscreen `/cad-editor`
- o layout global passou a ocultar `Navbar`, `Sidebar` e chrome normal nessa rota
- o item `Editor CAD` foi integrado ao menu lateral sem abrir documento automaticamente
- o shell visual do editor foi montado com:
  - menubar superior
  - commandbar
  - dock lateral esquerda
  - painel de ferramentas
  - canvas central com reguas
  - painel direito
  - statusbar inferior
- o editor passou a abrir DXF local pelo menu `Arquivo`, sem usar selecao do GeoLimites
- o `ViewerDXF` ganhou modo embutido para ser usado dentro do editor sem sua chrome antiga
- os comandos de viewport foram puxados para a casca do `Editor CAD`
- a menubar virou menu real com acoes em:
  - `Arquivo`
  - `Editar`
  - `Visualizar`
  - `Ferramentas`
  - `Ajuda`

### Capacidades reais ja implementadas no Editor CAD

- abrir DXF local no proprio editor
- fechar arquivo pelo menu
- mostrar dados reais do arquivo e das camadas
- selecionar camada ativa
- selecionar entidade clicando no canvas
- refletir a entidade selecionada no painel `Propriedades`
- usar as ferramentas basicas de canvas:
  - `Selecionar`
  - `Mover (Pan)`
  - `Zoom`
- aplicar a primeira edicao real:
  - `Espelhar` sobre a entidade selecionada
- aplicar a segunda edicao real:
  - mover entidade selecionada por arraste no canvas
- manter historico local com:
  - `Undo`
  - `Redo`

### Estado tecnico exato do editor agora

- o `Editor CAD` ja nao depende do fluxo antigo de arquivos do GeoLimites para funcionar
- o DXF aberto fica em estado local do editor
- o canvas mostra o estado editado atual do DXF, nao apenas o snapshot inicial da abertura
- `Espelhar` e `Mover` entram no historico local corretamente
- o `ViewerDXF` embutido ja serve como motor visual temporario do editor, mas a casca do CAD passou a controlar a experiencia

### Arquivos principais desta frente

#### Frontend

- `Frontend/src/pages/CadEditor.tsx`
- `Frontend/src/components/ViewerDXF.tsx`
- `Frontend/src/styles/App.css`
- `Frontend/src/App.tsx`
- `Frontend/src/components/Sidebar.tsx`
- `Frontend/src/pages/index.ts`

#### Projeto de apoio

- `Backend/project/editor-cad-studio/README.md`
- `Backend/project/editor-cad-studio/ROADMAP.md`
- `Backend/project/editor-cad-studio/BACKLOG.md`

### Validacoes feitas nesta rodada

- diagnosticos limpos em `CadEditor.tsx`
- diagnosticos limpos em `ViewerDXF.tsx`
- diagnosticos limpos em `App.css`
- frontend compilando com `npm run build`

### Estado exato para retomada

- o `Editor CAD` ja esta utilizavel como casca funcional
- o fluxo de abrir arquivo local esta pronto
- o fluxo de selecionar entidade esta pronto
- o fluxo de mover entidade por arraste esta pronto
- o fluxo de espelhar entidade selecionada esta pronto
- `Undo` e `Redo` locais ja funcionam para essas operacoes
- ainda nao existe salvamento/exportacao do DXF editado
- ainda nao existe selecao multipla
- ainda nao existe `Weld` real entre geometrias
- ainda nao existe preview visual de transformacoes mais avancadas

### Risco residual mais importante

- o editor ainda usa o `ViewerDXF` como motor visual embutido, entao a base de renderizacao continua misturando responsabilidades de viewer e CAD
- a edicao local ja existe, mas ainda falta uma camada propria de operacoes CAD mais robustas

## Nova Task Recomendada - 2026-06-26

Abrir uma nova task focada exclusivamente na consolidacao do `Editor CAD` como modulo de edicao real, sem voltar ao fluxo antigo do `Visualizador`.

### Objetivo

Dar o proximo salto funcional no `Editor CAD`, saindo de operacoes isoladas e entrando em edicao de geometria mais consistente.

### Prioridade 1

Implementar selecao multipla no canvas:

- permitir selecionar mais de uma entidade
- refletir a selecao multipla no painel direito
- permitir mover varias entidades juntas

### Prioridade 2

Implementar a primeira operacao topologica real:

- `Unir (Weld)` entre duas geometrias selecionadas
- com foco inicial em `LINE`, `POLYLINE` e `LWPOLYLINE`
- registrar a operacao no historico local

### Prioridade 3

Comecar a preparar persistencia do arquivo editado:

- salvar o estado editado em memoria de forma mais formal
- estudar exportacao DXF do desenho modificado
- evitar ainda qualquer acoplamento com upload/backend antes de a camada local ficar madura

### Escopo seguro para a proxima pessoa

- trabalhar primeiro em `Frontend/src/pages/CadEditor.tsx`
- trabalhar depois em `Frontend/src/components/ViewerDXF.tsx`
- evitar misturar essa task com memorial, creditos, configuracao ou cadastro de imoveis

### Sugestao de inicio imediato para a nova task

1. validar manualmente o fluxo atual:
   - abrir DXF
   - selecionar entidade
   - mover
   - espelhar
   - desfazer
   - refazer
2. implementar selecao multipla sem quebrar a selecao simples existente
3. depois entrar em `Weld` apenas para casos simples e controlados
4. tratar separadamente a limpeza do repo local e da VPS
5. so depois iniciar nova frente funcional

## Atualizacao Mais Recente - 2026-06-27

Desde a ultima atualizacao deste handoff, a frente do `Editor CAD` avancou bastante e deixou de ser apenas uma casca de edicao basica. O foco desta rodada ficou em:

- ferramentas reais de desenho no canvas
- persistencia de contexto operacional da bancada
- evolucao forte da ferramenta `Texto`
- configuracao de unidade de medida
- estabilizacao progressiva do `Novo desenho`

### O que foi concluido nesta rodada

- o `Editor CAD` passou a criar entidades reais no desenho com as ferramentas:
  - `Ponto`
  - `Linha`
  - `Retangulo`
  - `Bezier`
  - `Ponto a Ponto`
  - `Distancia`
  - `Texto`
- a ferramenta `Distancia` passou a gerar anotacoes persistentes, com camada de cotas, linhas auxiliares, setas e preview tecnico
- a ferramenta `Texto` evoluiu para suportar:
  - altura
  - rotacao
  - alinhamento horizontal
  - ancoragem vertical
  - presets tecnicos
  - estado `Personalizado`
  - restauracao de preset
  - persistencia em sessao
- a bancada passou a persistir em `sessionStorage`:
  - dock ativo
  - ferramenta ativa
  - camada geometrica ativa
  - camadas de anotacao
  - grid e snaps
  - contexto de viewport
  - fechamento do `Ponto a Ponto`
- a barra de viewport passou a suportar presets reais de zoom:
  - `1x`
  - `2x`
  - `5x`
  - `10x`
- o preset de zoom ativo agora fica destacado na UI conforme o zoom real do canvas
- foi criado um configurador do editor no menu `Configurar`, depois de `Ajuda`
- a configuracao de unidade de medida passou a usar presets operacionais de:
  - `mm`
  - `cm`
  - `m`
- o `Novo desenho` passou a abrir com `area-base minima` configurada por unidade, reduzindo o salto de escala inicial
- a linha forte da grade passou a representar a unidade configurada, e nao apenas um multiplo arbitrario do passo adaptativo
- o fluxo de selecao/arraste foi endurecido para so iniciar drag de entidade selecionada apos deslocamento real do mouse
- o commit das ferramentas de desenho passou a usar o mesmo ponto do preview mostrado no canvas
- o hover residual do rascunho passou a ser limpo quando a ferramenta muda ou quando o desenho e atualizado

### Arquivos principais desta rodada

#### Frontend

- `Frontend/src/pages/CadEditor.tsx`
- `Frontend/src/components/ViewerDXF.tsx`
- `Frontend/src/components/viewer-dxf/types.ts`
- `Frontend/src/components/viewer-dxf/cadDrawingUtils.ts`
- `Frontend/src/components/viewer-dxf/useCanvasViewport.ts`
- `Frontend/src/components/viewer-dxf/useViewerCanvasRenderer.ts`
- `Frontend/src/components/viewer-dxf/useViewerCanvasInteractions.ts`
- `Frontend/src/components/viewer-dxf/useEmbeddedEntitySelection.ts`
- `Frontend/src/styles/App.css`

### Validacoes feitas nesta rodada

- diagnosticos limpos nos arquivos alterados do editor
- frontend compilando com `npm run build`

### Estado tecnico exato para retomada

- o `Editor CAD` ja consegue abrir DXF local e tambem iniciar `Novo desenho`
- a criacao de entidades no canvas ja funciona de forma persistente no estado local do documento
- a ferramenta `Texto` ja esta em um nivel bem mais maduro e tecnico
- a unidade de medida do editor ja influencia:
  - area-base do desenho novo
  - grid snap padrao
  - linha forte da grade
- o problema de deformacao do tamanho da entidade criada foi corrigido
- o problema de reposicionamento bruto do elemento apos criar tambem foi bastante reduzido

### Problema residual mais importante agora

Ainda existe uma instabilidade residual no fluxo de criacao de desenhos.

Comportamento observado pelo usuario:

- ao desenhar, o editor ainda pode parecer instavel
- se o usuario troca para a ferramenta `Selecionar` e clica no canvas, o sistema volta a aparentar estabilidade

Leitura tecnica mais provavel no momento:

- o problema principal restante nao parece mais estar no tamanho da entidade
- tambem nao parece mais estar no enquadramento bruto do workspace
- o ponto mais suspeito agora e o recálculo de `validPoints` e do snap logo apos cada criacao
- isso pode fazer o cursor prender agressivamente no vertice acabado de criar e dar a sensacao de instabilidade enquanto uma ferramenta de desenho continua ativa

### Arquivos mais suspeitos para a proxima task

- `Frontend/src/components/viewer-dxf/useViewerCanvasInteractions.ts`
- `Frontend/src/components/viewer-dxf/useViewerCanvasRenderer.ts`
- `Frontend/src/components/ViewerDXF.tsx`
- `Frontend/src/components/viewer-dxf/useEmbeddedEntitySelection.ts`

### O que nao esta no escopo desta retomada

- nao misturar esta task com:
  - memorial
  - creditos
  - templates
  - cadastro de imoveis
  - georreferenciamento
- nao partir ainda para exportacao DXF definitiva
- nao abrir nova frente de `Weld` enquanto a criacao basica de desenho nao estiver totalmente estavel

## Nova Task Recomendada - 2026-06-27

Abrir uma nova task focada exclusivamente em fechar a estabilidade do fluxo de desenho no `Editor CAD`.

### Objetivo

Eliminar a instabilidade residual da criacao de entidades, especialmente quando a ferramenta de desenho permanece ativa apos o commit.

### Prioridade 1

Inspecionar o ciclo completo de criacao de entidade apos o commit:

- preview
- clique
- gravacao da entidade
- atualizacao de `dxfData`
- recalculo de `validPoints`
- reacoplamento do snap no cursor

### Prioridade 2

Verificar se o snap ao grid e o snap a objetos devem ser amortecidos logo apos a criacao:

- evitar captura agressiva imediata do vertice recem-criado
- validar se um pequeno atraso logico ou uma regra de exclusao temporaria melhora a estabilidade
- confirmar se a sensacao de instabilidade desaparece mantendo a ferramenta ativa

### Prioridade 3

Rodar uma validacao manual dirigida nas ferramentas:

- `Linha`
- `Retangulo`
- `Ponto a Ponto`
- `Texto`
- `Distancia`

Critero minimo de aceite:

- o preview deve coincidir com o ponto final gravado
- a entidade nao pode mudar de tamanho
- a entidade nao pode parecer reposicionada depois do commit
- o cursor nao pode entrar em comportamento "nervoso" logo apos criar a geometria

### Sugestao de inicio imediato para a nova task

1. reproduzir o problema mantendo a mesma ferramenta ativa apos criar a primeira entidade
2. instrumentar temporariamente o fluxo entre `hoverPoint`, `validPoints` e `getResolvedDrawingPoint`
3. confirmar se o snap esta recapturando imediatamente o vertice acabado de criar
4. aplicar a menor correcao possivel antes de pensar em nova camada de arquitetura

## Atualizacao Mais Recente - 2026-06-28

Desde a ultima atualizacao deste handoff, a frente do `Editor CAD` avancou fortemente em tres eixos ao mesmo tempo:

- consolidacao do editor como modulo independente com UX inspirada no `Studio`
- refatoracao pesada do `CadEditor.tsx` para uma arquitetura modular por hooks e componentes
- otimizacao agressiva de carregamento inicial e bundle do frontend

Ao mesmo tempo, apareceu uma regressao funcional residual no fluxo de:

- clique direito sobre entidade
- menu contextual de entidade
- remocao por `Delete` e `Backspace`

### O que foi concluido nesta rodada

- o `CadEditor.tsx` deixou de concentrar blocos grandes de logica e passou a atuar como coordenador/orquestrador
- responsabilidades foram extraidas para hooks especializados de:
  - layout
  - persistencia
  - atalhos de teclado
  - acoes de UI
  - controle de documento
  - controle de ferramentas
  - sincronizacao de estado
  - controle do viewer
  - view models do chrome e da sidebar direita
- a topbar foi extraida para `Frontend/src/pages/cad-editor/CadEditorTopBar.tsx`
- o mapeamento de icones foi extraido para `Frontend/src/pages/cad-editor/cadEditorIcons.tsx`
- o editor ganhou suporte funcional mais forte para:
  - guias e reguas
  - selecao por caixa
  - copiar, recortar e colar
  - ordem visual
  - preenchimento manual para validar z-order
  - selecao de poligonos pela area interna
- a logica de hit-test passou a respeitar a ordem visual de cima para baixo
- a renderizacao do app foi otimizada com `React.lazy` nas rotas e em partes internas pesadas do editor
- o bundle principal foi reduzido drasticamente ao trocar barrel imports por imports diretos e ao mover dependencias pesadas para chunks especificos

### Correcao importante ja concluida nesta rodada

Foi corrigida uma regressao visual seria no editor:

- sintoma:
  - canvas com faixa vermelha
  - reguas ausentes
  - grade ausente
- causa tecnica:
  - medicao antecipada do `canvasAreaRef` antes da montagem de componente lazy
- correcao aplicada:
  - sincronizacao com `requestAnimationFrame` antes de acoplar `ResizeObserver`
- arquivo central:
  - `Frontend/src/pages/cad-editor/useCadEditorLayoutController.ts`

### Arquivos principais desta rodada

#### Frontend

- `Frontend/src/pages/CadEditor.tsx`
- `Frontend/src/pages/cad-editor/useCadEditorLayoutController.ts`
- `Frontend/src/pages/cad-editor/useCadEditorViewerController.ts`
- `Frontend/src/pages/cad-editor/useCadEditorKeyboardShortcuts.ts`
- `Frontend/src/pages/cad-editor/useCadEditorEntityActions.ts`
- `Frontend/src/pages/cad-editor/useCadEditorGuideController.ts`
- `Frontend/src/pages/cad-editor/useCadEditorUiActionController.ts`
- `Frontend/src/pages/cad-editor/useCadEditorCommandPresentation.ts`
- `Frontend/src/pages/cad-editor/useCadEditorToolController.ts`
- `Frontend/src/pages/cad-editor/useCadEditorRightSidebarViewModel.ts`
- `Frontend/src/pages/cad-editor/useCadEditorStateSync.ts`
- `Frontend/src/pages/cad-editor/useCadEditorTextToolViewModel.ts`
- `Frontend/src/pages/cad-editor/useCadEditorChromeViewModel.ts`
- `Frontend/src/pages/cad-editor/CadEditorTopBar.tsx`
- `Frontend/src/pages/cad-editor/CadEditorWorkspaceCenter.tsx`
- `Frontend/src/components/ViewerDXF.tsx`
- `Frontend/src/components/viewer-dxf/entitySelectionUtils.ts`
- `Frontend/src/components/viewer-dxf/useEmbeddedEntitySelection.ts`
- `Frontend/src/components/viewer-dxf/useViewerCanvasInteractions.ts`
- `Frontend/src/App.tsx`
- `Frontend/vite.config.ts`

### Validacoes ja feitas nesta rodada

- frontend compilando com `npm run build` nas rodadas de refatoracao e otimizacao
- diagnosticos limpos nos arquivos principais apos as extracoes
- reducao relevante do chunk principal do frontend
- restauracao do comportamento visual do workspace apos a correcao da medicao do canvas

### Estado tecnico exato para retomada

- o `CadEditor` esta muito mais modular e legivel do que nas rodadas anteriores
- a base de performance do frontend melhorou bastante
- a parte visual principal do editor voltou a funcionar corretamente
- a regressao residual ainda aberta ficou concentrada em:
  - clique direito em entidade
  - abertura/fechamento do menu contextual
  - remocao de entidade por `Delete`

### Estado da depuracao atualmente em aberto

Foi aberta uma sessao formal de debug guiado por evidencia com:

- sessao: `cad-context-delete`
- arquivo de controle:
  - `Frontend/debug-cad-context-delete.md`

Instrumentacao `pre-fix` foi adicionada em:

- `Frontend/src/pages/cad-editor/useCadEditorGuideController.ts`
- `Frontend/src/pages/cad-editor/useCadEditorViewerController.ts`
- `Frontend/src/pages/cad-editor/useCadEditorKeyboardShortcuts.ts`
- `Frontend/src/pages/cad-editor/useCadEditorEntityActions.ts`
- `Frontend/src/pages/cad-editor/useCadEditorLayoutController.ts`
- `Frontend/src/components/viewer-dxf/useEmbeddedEntitySelection.ts`

### Hipoteses ja trabalhadas nesta sessao

- `A`: o wrapper do canvas nao encontra a entidade no clique direito
- `B`: a selecao do viewer nao permanece sincronizada com `selectedEntities`
- `C`: o menu contextual abre e fecha logo depois por algum efeito de fechamento
- `D`: o atalho `Delete` chega sem selecao coerente
- `E`: algum fluxo do viewer/canvas consome ou embaralha os eventos

### Evidencia tecnica ja coletada

Os logs `pre-fix` ja permitiram concluir parcialmente que:

- o `contextmenu` chega no wrapper do editor
- o hit-test encontra a entidade correta sob o cursor
- o pedido de abertura do menu contextual de entidade esta sendo emitido
- portanto a hipotese `A` perdeu forca e deixou de ser a principal suspeita
- a suspeita mais forte agora migrou para:
  - limpeza indevida da selecao no viewer
  - fechamento reativo do menu quando a selecao oscila para zero

### Arquivos mais suspeitos neste momento

- `Frontend/src/components/viewer-dxf/useEmbeddedEntitySelection.ts`
- `Frontend/src/pages/cad-editor/useCadEditorViewerController.ts`
- `Frontend/src/pages/cad-editor/useCadEditorLayoutController.ts`
- `Frontend/src/pages/cad-editor/useCadEditorKeyboardShortcuts.ts`
- `Frontend/src/pages/cad-editor/useCadEditorGuideController.ts`

### O que nao deve ser misturado nesta retomada

- nao misturar esta task com:
  - memorial
  - creditos
  - templates
  - cadastro de imoveis
  - georreferenciamento
  - novas funcionalidades grandes do editor
- nao retomar `Weld` ou exportacao DXF antes de fechar a regressao de selecao/menu/delete
- nao limpar os artefatos de debug antes de confirmar a correcao com evidencia `post-fix`

## Nova Task Recomendada - 2026-06-28

Abrir uma nova task focada exclusivamente em fechar a regressao do fluxo de selecao contextual no `Editor CAD`.

### Objetivo

Restaurar com seguranca o comportamento esperado de:

- clique direito sobre entidade
- abertura estavel do menu contextual
- remocao da selecao atual com `Delete` e `Backspace`

### Prioridade 1

Concluir a etapa de reproducao limpa da sessao `cad-context-delete`:

- recarregar o frontend com a instrumentacao atual
- reproduzir:
  - selecionar entidade
  - clicar com botao direito
  - tentar usar o menu contextual
  - pressionar `Delete`
- coletar logs `pre-fix` limpos

### Prioridade 2

Determinar por evidencia qual destes pontos esta quebrando primeiro:

- a selecao interna do viewer
- a sincronizacao para `selectedEntities`
- o fechamento reativo do `entityContextMenu`
- o listener de teclado do `Delete`

### Prioridade 3

Aplicar a menor correcao possivel somente depois da confirmacao da causa raiz.

Critero minimo de aceite:

- clicar com botao direito sobre entidade abre o menu contextual correto
- o menu nao fecha imediatamente sem interacao do usuario
- `Delete` remove a selecao atual
- a selecao visual e a selecao do estado do editor permanecem coerentes

### Sugestao de inicio imediato para a nova task

1. abrir `Frontend/debug-cad-context-delete.md`
2. confirmar que os logs da sessao `cad-context-delete` estao sendo recebidos
3. reproduzir o fluxo completo uma vez com logs limpos
4. analisar primeiro:
   - `useEmbeddedEntitySelection.ts`
   - `useCadEditorLayoutController.ts`
   - `useCadEditorViewerController.ts`
5. so depois aplicar o fix minimo e comparar `pre-fix` vs `post-fix`

Pro falta de crédito tive que fazer manualmente.
Estamso trabalhando no CadEditor Undo/Redo e também: Agora vou endurecer o Weld : se a polilinha final ficar menor que a soma dos trechos selecionados, a operação vira inválida e não apaga mais a seleção.
Rever estes pontos. 

## Atualizacao De Continuidade - 2026-07-01

Esta task avancou bastante depois da recomendacao acima. A regressao de clique direito/delete continua relevante para uma new task dedicada, mas o trabalho principal mais recente migrou para a neutralizacao arquitetural do `graphics-engine` para transforma-lo no motor canonico reaproveitavel do `Sigeve Studio`.

### Diretriz consolidada desta etapa

- `Frontend/src/graphics-engine` e a fonte da verdade do motor grafico
- `Frontend/src/graphics-engine/adapters/geolimites` concentra a composicao especifica do host atual
- `CadEditor` e `ViewerDXF` base devem nascer agnosticos e receber host/configuracao por contrato
- o motor nao deve depender de labels, textos, unidades ou wrappers especificos do produto

### O que foi fechado nesta rodada

- o `ViewerDXF` base deixou de importar runtime do `GeoLimites` diretamente; a composicao atual ficou em `Frontend/src/graphics-engine/adapters/geolimites/GeoLimitesViewerDXF.tsx`
- o shell do editor foi dividido entre:
  - `Frontend/src/graphics-engine/pages/cad-editor/CadEditorBase.tsx`
  - `Frontend/src/graphics-engine/adapters/geolimites/GeoLimitesCadEditor.tsx`
- foi criado um contrato explicito de host para o editor em:
  - `Frontend/src/graphics-engine/pages/cad-editor/cadEditorHost.ts`
- o barrel publico de `Frontend/src/graphics-engine/adapters/geolimites/index.ts` foi reduzido para expor somente:
  - `GeoLimitesCadEditor`
  - `GeoLimitesViewerDXF`
- wrappers legados e ambiguos foram removidos:
  - `Frontend/src/components/ViewerDXF.tsx`
  - `Frontend/src/pages/CadEditor.tsx`
- os barrels legados foram reapontados para as entradas explicitas do host:
  - `Frontend/src/components/index.ts`
  - `Frontend/src/pages/index.ts`
- a API publica do viewer foi reorganizada em uma entrada explicita:
  - `Frontend/src/graphics-engine/components/viewer-dxf/index.ts`
- consumidores externos de tipos do viewer deixaram de importar o arquivo de implementacao `components/ViewerDXF.tsx` e passaram a usar `components/viewer-dxf`
- o barrel principal do motor em `Frontend/src/graphics-engine/index.ts` agora expõe:
  - `CadEditorBase`
  - `ViewerDXF`
  - tipos de host do editor
- o mini projeto futuro de desktop Electron foi criado e documentado em:
  - `Frontend/docs/sigeve-electron-desktop/README.md`
  - `Frontend/platforms/electron-shell/*`
- a aplicacao React ganhou a camada:
  - `Frontend/src/services/desktopApi.ts`

### Validacao consolidada

- `npm run lint` ficou verde nas ultimas rodadas apos:
  - extracao do `CadEditorBase`
  - limpeza do barrel de `adapters/geolimites`
  - remocao dos wrappers legados
  - criacao da entrada publica `components/viewer-dxf`
- os diagnosticos ficaram limpos nos arquivos alterados mais recentemente

### Estado atual real para retomar depois do new task

Ao voltar para este contexto, NAO retomar mais da frente antiga de wrappers/barrels do viewer. Essa parte ficou historicamente registrada aqui, mas o foco real da conversa mudou e o ponto correto de retomada agora e o bug abaixo:

1. bug ainda ABERTO no editor CAD:
   - ao alterar a visibilidade de camadas, o desenho continua mudando de lugar e de tamanho
   - o usuario confirmou que o problema persiste mesmo apos duas rodadas de ajuste estatico
   - o indicador `Tamanho` ja foi visto variando, por exemplo, de `144.3 x 132.6` para `120.0 x 319.7`
2. a depuracao entrou em modo por evidencia, com instrumentacao ativa e sem cleanup ainda
3. a retomada correta agora e continuar da sessao `layer-visibility-jump`, nao da frente de API publica do viewer

### Sessao de debug aberta

- arquivo de acompanhamento:
  - `debug-layer-visibility-jump.md`
- env do servidor de debug:
  - `.dbg/layer-visibility-jump.env`
- sessao:
  - `layer-visibility-jump`
- status:
  - `OPEN`

#### Hipoteses atuais

1. algum comando implicito de viewport (`fit` ou `reset`) esta sendo aplicado quando a visibilidade muda
2. o `drawingBounds` ainda esta sendo recalculado a partir de uma fonte derivada do conjunto visivel
3. `pan` ou `zoom` estao sendo sobrescritos por algum `useEffect` lateral apos a troca
4. o `ViewerDXF` ou algum pai esta sendo desmontado/remontado quando a visibilidade muda
5. o status exibido no editor pode estar mostrando um valor diferente do bounds real usado pelo canvas

### Ultimas correcoes ja tentadas antes da depuracao

- separacao entre `data` visivel e `boundsData` completo no viewer
- ajuste para impedir que `detectedPolygons` do conjunto visivel continuassem influenciando o `Tamanho`
- alinhamento do clique direito/contexto com a mesma regra de camada ativa do canvas
- todas essas rodadas compilaram com `npm run build`, mas o usuario ainda confirmou que o salto de posicao/tamanho continua

### Instrumentacao ativa no codigo

Os primeiros diffs desta sessao foram apenas de log, sem alterar regra de negocio adicional. Os pontos instrumentados neste momento sao:

- `Frontend/src/graphics-engine/pages/cad-editor/CadEditorBase.tsx`
  - log da troca de visibilidade da camada
  - envia `hiddenBefore`, `hiddenAfter`, `viewerZoom` e `viewerViewportState`
- `Frontend/src/graphics-engine/pages/cad-editor/useCadEditorViewerController.ts`
  - log quando o viewport e publicado para o editor
- `Frontend/src/graphics-engine/components/ViewerDXF.tsx`
  - log de `mount` e `unmount` do viewer
- `Frontend/src/graphics-engine/components/viewer-dxf/useCanvasViewport.ts`
  - log de aplicacao de `fit`
  - log de aplicacao de `reset`
  - log do estado de viewport publicado (`zoom`, `pan`, `scale`, `centerX`, `centerY`)
- `Frontend/src/graphics-engine/components/viewer-dxf/useViewerCanvasRenderer.ts`
  - log do bounds efetivamente calculado
  - inclui `usePolygonBounds`, quantidade de entidades visiveis, quantidade de entidades do `boundsData` e `detectedPolygonsCount`

### Proximo passo correto ao retomar

1. reproduzir o bug manualmente no editor com a instrumentacao atual:
   - abrir o desenho
   - anotar o `Tamanho`
   - ocultar e reexibir camadas
   - observar o salto visual
2. coletar os logs da sessao `layer-visibility-jump`
3. confrontar os logs para responder:
   - houve `mount/unmount`?
   - houve `fit` ou `reset`?
   - o `bounds` mudou mesmo usando `boundsData`?
   - `pan`/`zoom` foram sobrescritos?
4. so depois aplicar correcao minima baseada nessa evidencia

### Arquivos quentes desta retomada

- `debug-layer-visibility-jump.md`
- `Frontend/src/graphics-engine/pages/cad-editor/CadEditorBase.tsx`
- `Frontend/src/graphics-engine/pages/cad-editor/useCadEditorViewerController.ts`
- `Frontend/src/graphics-engine/components/ViewerDXF.tsx`
- `Frontend/src/graphics-engine/components/viewer-dxf/useCanvasViewport.ts`
- `Frontend/src/graphics-engine/components/viewer-dxf/useViewerCanvasRenderer.ts`
- `Frontend/src/graphics-engine/components/viewer-dxf/types.ts`

### O que NAO fazer agora

- nao limpar a instrumentacao antes de confirmar a causa
- nao encerrar a sessao `layer-visibility-jump` sem comparar logs
- nao voltar para a frente antiga de barrels/wrappers como se fosse o foco principal
- nao tratar o problema novamente por suposicao estatica; o proximo passo depende de evidencia runtime

### Resumo operacional para a proxima pessoa

O contexto correto de retomada nao e mais "organizar a superficie publica do viewer". O bug ativo e a mudanca indevida de posicao/tamanho ao mexer na visibilidade das camadas no editor CAD. A sessao de debug `layer-visibility-jump` ja esta aberta, com `debug-layer-visibility-jump.md` criado e instrumentacao de runtime aplicada. O proximo responsavel deve reproduzir o problema, ler os logs e decidir a correcao com base nessa evidencia antes de qualquer cleanup.

## Contexto adicional registrado em 2026-07-02

### Novo problema funcional observado no CadEditor

- Existe um bloqueio de selecao que impede alcancar segmentos dos lotes em certas situacoes.
- O usuario relata que o grafico dos lotes esta na camada `GEOREFERENCIA`, mas nao consegue tocar/selecionar os segmentos desejados.
- Um "quadrado em volta" parece capturar o clique antes dos segmentos internos, sugerindo colisao de hit-test, ordem de prioridade incorreta, entidade envoltoria interceptando interacao ou comportamento semelhante a agrupamento.
- A sensacao funcional e de que a geometria do lote fica "presa" atras de um contorno/caixa maior, impedindo edicao fina dos segmentos.

### Direcao pedida para a proxima frente

- Entrou no contexto a necessidade de trabalhar suporte explicito para `Agrupar` e `Desagrupar`.
- Antes de implementar, investigar se o bloqueio atual vem de:
  - entidade de contorno com prioridade de selecao acima dos segmentos
  - regra de hit-test por bounding box em vez de entidade mais proxima
  - selecao por lote/estrutura composta sem comando para descer ao nivel do segmento
  - ausencia de conceito formal de grupo e de mecanismo para editar membros internos

### Objetivo funcional esperado

- Permitir selecionar o segmento real do lote quando ele estiver visivel e na camada interativa correta.
- Quando houver estrutura composta, oferecer fluxo claro para:
  - selecionar o conjunto
  - agrupar/desagrupar
  - entrar no nivel interno para editar segmentos individuais sem o contorno externo bloquear o clique

## Atualizacao de contexto em 2026-07-04

### Frente ativa agora

O foco saiu das regressões antigas do `ViewerDXF` e passou para o fluxo documental:

- `Operacao > Configurar Memorial`
- `Configuracao > Normas e Exemplos`
- geracao de `Resumo Tecnico` pelo `Editor CAD`
- geracao do `Memorial` a partir de:
  - `Norma`
  - `Template`
  - `Resumo Tecnico`

### Mudancas ja concluidas nesta rodada

- o painel `Normas e Template do Memorial` foi renomeado para `Configurar Memorial`
- o menu operacional foi ajustado:
  - `Editor CAD` aparece primeiro na fila
  - a aplicacao continua abrindo em `Imoveis`
  - `Visualizador` passou a se chamar `Memorial`
- em `Configurar Memorial`, os 3 combobox ficaram empilhados:
  - `Norma`
  - `Template`
  - `Resumo Tecnico`
- a configuracao de `Resumo Tecnico` deixou de salvar arquivo nessa tela; aqui ela serve apenas para vincular o JSON usado no memorial atual
- `Aplicar Escolhas` agora aplica tambem o `Resumo Tecnico` selecionado por imovel
- `Normas e Exemplos` passou a aceitar `JSONs de Resumo Tecnico` base, persistidos em IndexedDB
- o armazenamento do `Resumo Tecnico` passou a priorizar o que vem do `Editor CAD`; se entrar resumo do fluxo antigo, ele apenas complementa lacunas
- foram corrigidos problemas de persistencia/restauracao:
  - norma aplicada nao encontrada na geracao
  - template limpando ao navegar e voltar
  - `Configurar Memorial` soltando selecao ao entrar em `Memorial`

### Arquivos principais alterados nesta rodada

- `Frontend/src/pages/MemorialStandards.tsx`
- `Frontend/src/pages/ConfigureTemplates.tsx`
- `Frontend/src/pages/Memorial.tsx`
- `Frontend/src/components/Sidebar.tsx`
- `Frontend/src/components/ViewerHeader.tsx`
- `Frontend/src/hooks/useDocumentGenerationActions.ts`
- `Frontend/src/utils/technicalSummaryStorage.ts`
- `Frontend/src/utils/technicalSummaryExamples.ts`
- `Frontend/src/utils/operationContext.ts`

### Diagnostico tecnico importante ja confirmado

Foi comparado:

- `Backend/Memoriais/ResumoTecnico.md`
- `Backend/Memoriais/MemorialComIA_Local.md`

Resultado:

- o memorial gerado **nao esta seguindo o Resumo Tecnico como fonte principal**
- varios lotes do memorial saem com texto generico ou inconsistente
- o resumo tecnico contem dados corretos mais ricos
- a geracao atual ainda depende estruturalmente de `entities` do DXF

Isso foi confirmado no codigo atual:

- no frontend, a geracao de memorial ainda envia `entities: serializeMemorialEntities(...)`
  - arquivo: `Frontend/src/hooks/useDocumentGenerationActions.ts`
- o request ainda e centrado em `List<DxfParser.Entity> entities`
  - arquivo: `Backend/src/main/java/com/momorialPro/CadMemorial/dto/MemorialRequestDTO.java`
- no backend, os `LotTechnicalSummary` usados pelo memorial ainda sao montados a partir das entidades do DXF
  - arquivos:
    - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java`
    - `Backend/src/main/java/com/momorialPro/CadMemorial/service/LotTopologyService.java`

### Decisao funcional mais recente do usuario

O usuario refinou a direcao e definiu isto como regra:

- o que ainda estiver vindo do `DXF` diretamente deve sair do fluxo de geracao do `Memorial`
- essas informacoes devem entrar antes no `Resumo Tecnico`
- quem deve produzir esse `Resumo Tecnico` base e o `Editor CAD`
- o `Memorial` deve depender apenas dos tres pilares:
  - `Norma`
  - `Template`
  - `Resumo Tecnico`

Em outras palavras:

- `DXF` continua sendo insumo do `Editor CAD` e da geracao do `Resumo Tecnico`
- `Memorial` nao deve mais depender do `DXF` bruto nem reconstruir lotes a partir dele

### Estado exato da investigacao antes da proxima task

Ja foi identificado um caminho tecnico plausivel para a refatoracao:

1. ampliar `MemorialRequestDTO` para aceitar explicitamente:
   - `technicalSummaryJson`
   - identificacao do `template` aplicado
2. no frontend, ao gerar memorial:
   - ler o `Resumo Tecnico` aplicado por imovel
   - enviar esse JSON no request
   - parar de depender de `serializeMemorialEntities(...)` para o memorial
3. no backend:
   - parar de exigir `entities` para a rota de geracao do memorial assistido
   - converter o `technicalSummaryJson` em uma estrutura equivalente a `LotTechnicalSummary`
   - alimentar prompt, validacao e alinhamento a partir dessa estrutura
4. manter `entities` apenas na geracao do `Resumo Tecnico`

### Arquivos quentes para a nova task

- `Frontend/src/hooks/useDocumentGenerationActions.ts`
- `Frontend/src/pages/Memorial.tsx`
- `Frontend/src/pages/MemorialStandards.tsx`
- `Frontend/src/utils/technicalSummaryStorage.ts`
- `Frontend/src/utils/technicalSummaryExamples.ts`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/MemorialRequestDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/MemorialApiController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialAiServiceWithCredits.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/TechnicalSummaryService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/LotTopologyService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialTechnicalTypes.java`
- `Backend/Memoriais/ResumoTecnico.md`
- `Backend/Memoriais/MemorialComIA_Local.md`

### O que ainda NAO foi implementado

- o memorial ainda nao foi migrado para consumir `technicalSummaryJson` como fonte soberana
- o backend ainda nao converte `Resumo Tecnico` pronto em `LotTechnicalSummary`
- o `template` aplicado ainda nao participa explicitamente do contrato de geracao do memorial
- o fluxo interativo de lotes ainda monta request com poligono/entidades da selecao

### Proximo passo correto na nova task

1. criar o contrato novo do memorial baseado em:
   - `standardId`
   - `template`
   - `technicalSummaryJson`
2. adaptar primeiro a geracao normal do memorial
3. depois adaptar a geracao interativa por lote
4. validar comparando novamente:
   - `ResumoTecnico.md`
   - `MemorialComIA_Local.md`
5. so depois pensar em remover restos de dependencia do DXF no fluxo do memorial

### O que NAO fazer na retomada

- nao voltar a diagnosticar erro de norma/template como foco principal; isso ja foi bastante endurecido nesta rodada
- nao usar `MemorialComIA_Local.md` como se fosse falha de prompt apenas; a causa e estrutural no contrato de dados
- nao remover `DXF` da geracao do `Resumo Tecnico`; o pedido do usuario foi tirar o `DXF` direto do `Memorial`, nao do pipeline tecnico inteiro
- nao reabrir a frente antiga de bugs do `ViewerDXF` nesta mesma task

### Estado salvo antes de mudar para a frente de Configuracoes

Antes de interromper esta frente, foi feita uma comparacao direta entre:

- `Backend/Memoriais/MemorialComIA_Local.md`
- `Backend/Memoriais/MemorialExemplo.md`
- `Backend/Memoriais/ResumoTecnico.md`

Conclusao objetiva:

- o `MemorialComIA_Local.md` nao esta aderente ao `MemorialExemplo.md`
- o `MemorialComIA_Local.md` tambem nao esta aderente ao `ResumoTecnico.md`
- as divergencias nao sao apenas de redacao; envolvem area, perimetro, vertices, confrontacoes e lotes marcados como inconsistentes mesmo quando o resumo tecnico os aprova
- o ponto mais provavel e que o memorial local ainda esta caindo em uma trilha de fallback generica e nao consumindo fielmente os `LotTechnicalSummary` do resumo tecnico aplicado

Arquivos diretamente usados nessa verificacao:

- `Backend/Memoriais/MemorialComIA_Local.md`
- `Backend/Memoriais/MemorialExemplo.md`
- `Backend/Memoriais/ResumoTecnico.md`

Proximo passo quando esta frente for retomada:

1. rastrear qual caminho exato gerou o `MemorialComIA_Local.md`
2. confirmar se o backend esta recebendo e propagando o mesmo `technicalSummaryJson` representado em `ResumoTecnico.md`
3. identificar onde a geracao do memorial degrada para confrontacoes genericas e lotes inconsistentes

### Nova frente aberta agora por decisao do usuario

O foco imediato foi redirecionado para `Configuracoes` do `Editor CAD`, com os seguintes requisitos:

1. criar uma pagina de configuracao sistêmica acessivel a partir do menu `Configurar` do `Editor CAD`
2. remover a dependencia exclusiva de `localStorage` para essa configuracao
3. persistir a configuracao de forma duravel; se necessario, criar tabela e migration no banco
4. fazer a configuracao de unidade de medida valer para todo o sistema
5. garantir que a unidade configurada tambem seja aplicada na geracao do `Resumo Tecnico`

### Estado atual desta frente de Configuracoes

Esta frente foi implementada e validada por compilacao local.

#### Backend concluido

- criada a persistencia singleton de configuracoes do CAD em:
  - `Backend/src/main/java/com/momorialPro/CadMemorial/model/CadSystemSettings.java`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/repository/CadSystemSettingsRepository.java`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/service/CadSystemSettingsService.java`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/controller/CadSystemSettingsController.java`
  - `Backend/src/main/resources/db/migration/V18__cad_system_settings.sql`
- contrato HTTP criado:
  - `GET /api/cad/settings` para leitura autenticada
  - `PATCH /api/cad/settings` para atualizacao por `ADMIN`
- a unidade sistemica passou a ser consumida pelo `TechnicalSummaryService`
- o `Resumo Tecnico` textual e o JSON agora saem com unidade derivada da configuracao do sistema, e nao mais fixa em `m` / `m2`

#### Frontend concluido

- criada a tela `Frontend/src/graphics-engine/pages/cad-editor/CadEditorSystemSettingsPage.tsx`
- criado o service `Frontend/src/services/cadSystemSettings.ts`
- o host `GeoLimitesCadEditor` agora:
  - carrega a configuracao sistemica do backend antes de abrir o editor
  - injeta a configuracao inicial no boot do editor
  - expõe salvamento sistemico apenas para administradores
- o menu `Configurar` agora abre a tela de configuracao sistemica
- foi cortado o ultimo atalho remanescente de troca local de unidade via `config-unit-*`
- a tela nova recebe os presets completos de unidade e aplica a configuracao salva ao estado do editor
- a gravacao recorrente da configuracao sistemica em `localStorage` foi removida do fluxo normal; o armazenamento local ficou apenas como fallback de leitura quando o backend nao responder
- o boot GeoLimites nao consulta mais `cad-editor:settings`; quando o backend ainda nao respondeu ou falha, o editor usa apenas o default estatico do frontend como fallback tecnico

#### Validacoes concluidas

- frontend compilando com `npm run build`
- backend compilando com `.\mvnw.cmd -DskipTests compile`
- teste automatizado de regressao cobrindo unidade sistemica no `Resumo Tecnico` em `Backend/src/test/java/com/momorialPro/CadMemorial/service/TechnicalSummaryServiceTest.java`
- validado com `.\mvnw.cmd -Dtest=TechnicalSummaryServiceTest test`
- teste automatizado da camada de servico das configuracoes sistemicas em `Backend/src/test/java/com/momorialPro/CadMemorial/service/CadSystemSettingsServiceTest.java`
- validado com `.\mvnw.cmd -Dtest=CadSystemSettingsServiceTest test`
- validacao manual no navegador com login admin local (`admin@sigeve.com.br`)
- fluxo `Configurar -> Configuracoes do Sistema...` validado com unidade `m` e area-base `25`
- persistencia visual confirmada apos salvar e recarregar o `Editor CAD`
- validacao real do `Resumo Tecnico` no `Editor CAD` com upload do arquivo `Frontend/arquivos_dxf/TESTE AGENTE_DBL TERRA NOBRE_1.dxf`
- o navegador registrou `POST /api/memorial/generate-summary` com resposta `200`
- a resposta capturada do backend veio com:
  - `technicalSummaryJson.measurementUnit = "m"`
  - `technicalSummaryJson.areaUnit = "m2"`
  - texto contendo:
    - `AREA TOTAL DOS LOTES: 17704.46 m2`
    - `- Area apurada: 13252.36 m2`
    - `- Perimetro apurado: 336.57 m`
- endurecimento adicional do frontend:
  - `Frontend/src/graphics-engine/adapters/geolimites/cadEditorContentConfig.ts` deixou de ler `localStorage` para a configuracao sistemica
  - `Frontend/src/graphics-engine/adapters/geolimites/GeoLimitesCadEditor.tsx` passou a registrar fallback como `default padrao do frontend`, e nao mais `fallback local`
- limpeza adicional do core do editor:
  - `Frontend/src/graphics-engine/pages/cad-editor/useCadEditorPersistence.ts` deixou de aceitar/persistir `settingsPayload`
  - `Frontend/src/graphics-engine/pages/cad-editor/cadEditorHost.ts` deixou de expor `settingsPayload` no contrato de persistencia
  - `Frontend/src/graphics-engine/pages/cad-editor/CadEditorBase.tsx` deixou de montar `cadEditorSettingsPayload`
  - `Frontend/src/graphics-engine/pages/cad-editor/cadEditorConfig.ts` removeu `CAD_EDITOR_SETTINGS_STORAGE_KEY`, `loadCadEditorSettings(...)` e o fallback legado de workspace por unidade
- verificacao de superficie do motor:
  - o unico host concreto atual do editor continua sendo `Frontend/src/graphics-engine/adapters/geolimites/GeoLimitesCadEditor.tsx`
  - nao foi encontrada outra adaptacao concreta do `graphics-engine` consumindo `CadEditorBase` com boot proprio ou esperando persistencia local de `CadEditorSettings`
  - `Frontend/src/graphics-engine/index.ts` permanece expondo apenas contratos genericos do motor, sem outro host concreto adicional
- revalidado com `npm run build`

#### Retomada da frente do memorial soberano

- foi iniciado o endurecimento da fronteira do frontend para o memorial soberano por `technicalSummaryJson`
- `Frontend/src/utils/memorialPayload.ts` passou a separar:
  - `buildBaseMemorialRequest(...)` para metadados puros do memorial
  - `buildTechnicalSummaryRequest(...)` para requests que realmente precisam de `entities`
- `Frontend/src/hooks/useDocumentGenerationActions.ts` deixou de montar `entities` no payload-base do memorial normal e nao precisa mais fazer `delete memorialRequest.entities`
- os fluxos de geracao de `Resumo Tecnico` continuam enviando `entities`, agora de forma explicita via `buildTechnicalSummaryRequest(...)`
- `Frontend/src/graphics-engine/adapters/geolimites/GeoLimitesCadEditor.tsx` foi alinhado ao mesmo helper novo
- endurecimento correspondente no backend:
  - `Backend/src/main/java/com/momorialPro/CadMemorial/controller/MemorialApiController.java` agora prioriza o fluxo soberano por `technicalSummaryJson` ao montar o `compareResult`, mesmo se o request ainda trouxer `entities` por compatibilidade
  - o `comparisonSummary` do `generate-gpt` tambem passou a refletir o fluxo efetivo usado, sem depender da presenca residual de `entities`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialAiServiceWithCredits.java` extraiu a decisao de despacho para `dispatchMemorialGeneration(...)`, reduzindo a bifurcacao inline entre fluxo legado e fluxo soberano
- endurecimento adicional em `MemorialApiService`:
  - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java` deixou de usar `cacheService.generateCacheKey(compareResult)` no fluxo soberano por `technicalSummaryJson`
  - o memorial soberano passou a gerar chave de cache propria com base em `standardId`, `propertyId`, `lotCountOverride`, `selectedLayers`, `template` aplicado e no proprio `technicalSummaryJson`
  - impacto pratico: evita colisao de cache entre resumos tecnicos diferentes que antes podiam compartilhar o mesmo `compareResult` sintetico
  - no particionamento do fluxo legado, `generateWithPartitioning(...)` passou a calcular `LotTechnicalSummary` uma unica vez para o escopo inteiro e reutilizar fatias por chunk nos fallbacks
  - impacto pratico: os fallbacks por chunk deixam de reconstruir contexto tecnico novamente a partir de `entities` em cada erro de chunk, reaproveitando o resumo tecnico ja derivado para aquele escopo
  - o refactor estrutural do fluxo legado em `generate(...)` foi concluido com um `LegacyGenerationContext` explicito dentro de `MemorialApiService.java`
  - esse contexto agora concentra: `property`, `allEntities`, `extractedPoints`, `realCoordinates`, `streetNames`, `confrontations`, `individualAreas`, `estimatedLotCount`, `coordenadaBase`, `georeferencingTransform` e `memorialBaseJson`
  - impacto pratico: `generateSingleCall(...)` e `generateWithPartitioning(...)` deixaram de depender de uma cadeia longa de variaveis soltas, e a preparacao tecnica do fluxo legado ficou encapsulada em um unico ponto (`buildLegacyGenerationContext(...)`)
  - endurecimento adicional entre `MemorialApiService` e `MemorialPromptContextService`:
    - `generateSingleCall(...)` passou a calcular `expectedSummaries` antes do prompt e a repassa-los explicitamente para `buildPrompt(...)`
    - `generateLotChunk(...)` passou a repassar `fallbackChunkSummaries` diretamente para `buildChunkPrompt(...)`
    - `MemorialPromptContextService` deixou de recalcular `LotTechnicalSummary` a partir de `allEntities` quando esses resumos ja vierem prontos do service chamador
  - impacto pratico: reduz recomputacao de topologia dentro dos prompts legados e diminui mais um ponto onde `allEntities` ainda influenciava o memorial fora da derivacao inicial do resumo tecnico
  - limpeza adicional do prompt legado:
    - `MemorialPromptContextService.buildPrompt(...)` e `buildChunkPrompt(...)` deixaram de receber `allEntities` e tambem deixaram de usar fallbacks geométricos/textuais por topologia bruta dentro do proprio prompt builder
    - os blocos `RESUMO TECNICO VALIDADO DOS LOTES` e `POLIGONOS EFETIVAMENTE ENVIADOS` agora dependem apenas de `expectedSummaries`/`expectedChunkSummaries` entregues pelo `MemorialApiService`
    - o prompt service tambem deixou de anexar analise manual bruta de frentes/esquinas quando o resumo tecnico validado ja esta presente
  - impacto pratico: o texto do memorial legado passa a depender menos da geometria DXF crua dentro da camada de prompt e fica mais aderente ao contexto tecnico previamente consolidado no backend
  - limpeza adicional no proprio `MemorialApiService`:
    - `LegacyGenerationContext` deixou de carregar `allEntities` para as fases posteriores de geracao
    - o contexto agora ja sai de `buildLegacyGenerationContext(...)` com `expectedSummaries` calculados para o escopo legado
    - `generateSingleCall(...)` passou a usar `resolveScopedExpectedSummaries(...)` em cima desse resumo pronto, com ajuste defensivo de numeracao quando o escopo for um unico lote selecionado
    - `generateWithPartitioning(...)` passou a fatiar diretamente `context.expectedSummaries()` em vez de recalcular topologia por `allEntities`
    - o helper interno `selectLotTechnicalSummaries(...)` foi renomeado para `deriveLotTechnicalSummariesFromEntities(...)` para deixar explicito que essa etapa ainda pertence a derivacao tecnica do contexto, nao a montagem do memorial
    - a preparacao tecnica compartilhada entre `generateTechnicalSummaryPayload(...)` e `buildLegacyGenerationContext(...)` foi extraida para `prepareTechnicalSummaryDerivationContext(...)`, com um `TechnicalSummaryDerivationContext` interno contendo `property`, `allEntities`, `georeferencingTransform`, `confrontations`, `estimatedLotCount` e `expectedSummaries`
    - a resolucao espacial remanescente de `buildLegacyGenerationContext(...)` foi extraida para `prepareLegacySpatialContext(...)`, com um `LegacySpatialContext` interno contendo `extractedPoints`, `realCoordinates` e `coordenadaBase`
    - a derivacao de `streetNames` e `individualAreas` do fluxo legado foi extraida para `prepareLegacyTextContext(...)`, com um `LegacyTextContext` interno
    - `prepareTechnicalSummaryDerivationContext(...)` passou a aceitar um flag (`includeExpectedSummaries`) para evitar derivar `expectedSummaries` quando o objetivo for apenas gerar o Resumo Tecnico (economiza computacao)
    - a regra de escopo de lote (`selectedLayers` -> `startLotNumber/maxLots`) foi centralizada em `resolveLotScope(...)` para reutilizar tanto no resumo tecnico quanto no ajuste de `expectedSummaries` no fluxo legado
    - o `scopeLabel` textual do contexto de derivacao tecnica foi substituido por um `enum` interno (`DerivationScope`) para evitar strings soltas e manter nomes consistentes
  - impacto pratico: apos a derivacao inicial do contexto, o fluxo legado deixa de trafegar a geometria bruta do DXF dentro do `MemorialApiService`; o uso remanescente de `allEntities` ficou restrito a preparacao tecnica inicial e ao caminho de derivacao do resumo tecnico
  - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialPromptContextService.java` passou a priorizar `expectedChunkSummaries` para montar:
    - o bloco `RESUMO TECNICO VALIDADO DOS LOTES`
    - o bloco `POLIGONOS EFETIVAMENTE ENVIADOS PARA ESTE MEMORIAL`
  - impacto pratico: o texto-base do `chunkPrompt` deixa de reconstruir esse contexto via `allEntities` quando o resumo tecnico do chunk ja esta disponivel
  - o `buildPrompt(...)` legado geral do mesmo service passou a calcular `expectedSummaries` uma unica vez e reutiliza-las para:
    - o bloco `RESUMO TECNICO VALIDADO DOS LOTES`
    - o bloco `POLIGONOS EFETIVAMENTE ENVIADOS`
  - impacto pratico: o prompt-base do memorial legado tambem deixa de reconstruir esse contexto textual via `allEntities` quando o resumo tecnico ja foi derivado
  - ajuste adicional no `MemorialPromptContextService`:
    - `buildPrompt(...)` e `buildChunkPrompt(...)` mantem os textos manuais visiveis, mas deixam de anexar `ANALISE GEOMETRICA DE FRENTES E ESQUINAS` quando `expectedSummaries`/`expectedChunkSummaries` ja existem
    - nesses casos, o prompt passa a registrar explicitamente que as selecoes manuais ja foram consolidadas no resumo tecnico validado do backend
  - impacto pratico: reduz conflito entre evidencia manual bruta e o resumo tecnico soberano dentro dos prompts legados
- impacto pratico:
  - requests hibridos (`technicalSummaryJson` + `entities`) deixam de montar contexto DXF no controller quando o memorial efetivo sera gerado pelo resumo tecnico
- revalidado com `npm run build`
- revalidado com `.\mvnw.cmd -q -DskipTests compile`
- revalidado com `.\mvnw.cmd -q test`

#### Ponto de retomada se esta frente continuar

1. continuar a retirada de residuos de `entities` do fluxo de memorial no frontend/backend, mantendo `entities` apenas na geracao do `Resumo Tecnico`
2. revisar `MemorialApiService` para localizar os proximos ramos legado onde `entities` ainda influenciam o memorial fora da geracao do `Resumo Tecnico`, agora principalmente em construcao de prompt e particionamento antigos
3. ampliar a validacao manual para outros DXFs/cenarios com confrontacoes mais ricas e pontos georreferenciados

#### Atualizacao de investigacao - 2026-07-06

- foi confirmado que a perda de lotes entre `ResumoTecnico.md` e `MemorialComIA_Local.md` nao nasce apenas da montagem final interativa no frontend; o memorial final ja aparecia com sequencia quebrada ao sair do backend
- o suspeito principal foi endurecido em:
  - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialLlmSupportService.java`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialAlignmentService.java`
- o parser de blocos de lote deixou de aceitar apenas `LOTE N:` e passou a reconhecer variantes reais de cabecalho como:
  - `LOTE Nº 04 - ...`
  - `LOTE 5`
  - `LOTE 7:`
- alem de reconhecer essas variantes, o backend agora normaliza o primeiro cabecalho do bloco para `LOTE N:` antes das validacoes seguintes
- impacto esperado:
  - reduzir descarte silencioso de lotes validos em `normalizeChunkOutput(...)`
  - manter `extractLotBlocks(...)` e `validateMemorialAlignment(...)` coerentes com a mesma regra de parser
- foi criado teste dirigido em:
  - `Backend/src/test/java/com/momorialPro/CadMemorial/service/MemorialLotBlockParsingTest.java`
- validacoes locais desta micro-rodada:
  - `.\mvnw.cmd -q -Dtest=MemorialLotBlockParsingTest test`
  - `.\mvnw.cmd -q -DskipTests compile`
- pendencia objetiva:
  - ainda falta validar com um caso real de geracao do memorial se os lotes `4` e `5` passam a sobreviver ao chunking/normalizacao; o patch atual corrige o ponto mais provavel de perda, mas ainda nao houve nova geracao real apos essa mudanca

#### Atualizacao soberana do memorial - 2026-07-06

- a decisao de produto foi finalmente aplicada no backend: quando o memorial entra pelo fluxo `technicalSummaryJson`, a IA deixa de ser etapa principal de geracao
- o metodo `generateFromTechnicalSummary(...)` em `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java` agora monta o memorial diretamente pelo caminho deterministico soberano, usando:
  - `Norma`
  - `Template` aplicado
  - `LotTechnicalSummary` parseado do `technicalSummaryJson`
- impacto pratico:
  - o fluxo soberano nao depende mais de `requestClaudeSingleCall(...)` nem de `generateWithOpenAi(...)`
  - o memorial deixa de aceitar que a IA invente, omita ou degrade confrontacoes/lotes quando o resumo tecnico ja esta validado
- para refletir isso sem log enganoso de fallback, foi criado um caminho explicito em `Backend/src/main/java/com/momorialPro/CadMemorial/service/DeterministicMemorialService.java`:
  - `buildSovereignMemorialFromTechnicalSummary(...)`
- o helper privado novo em `MemorialApiService.java`:
  - `buildSovereignTechnicalSummaryMemorial(...)`
  monta preambulo, conclusao, metadata e delega a composicao textual para o service deterministico
- o teste `Backend/src/test/java/com/momorialPro/CadMemorial/service/DeterministicMemorialServiceTest.java` foi ajustado para cobrir essa nova entrada soberana
- validacoes locais desta micro-rodada:
  - `.\mvnw.cmd -q "-Dtest=DeterministicMemorialServiceTest,MemorialLotBlockParsingTest" test`
  - `.\mvnw.cmd -q -DskipTests compile`
- proximo passo correto:
  - gerar novamente um memorial real para confirmar se:
    - os lotes aprovados no resumo passam a aparecer todos
    - as confrontacoes reais deixam de colapsar para `divisa interna do loteamento`
    - o texto final agora respeita de fato o resumo tecnico como fonte soberana

#### Atualizacao de consistencia do resumo aplicado - 2026-07-06

- durante a investigacao do memorial ainda faltando lotes, foi encontrada uma segunda causa plausivel no frontend:
  - `Frontend/src/utils/technicalSummaryStorage.ts` podia manter um registro hibrido com `summaryText` vindo de uma fonte e `summaryJson` vindo de outra
  - isso explica o sintoma observado pelo usuario: o resumo exibido/inspecionado indicar `25 lotes`, enquanto o memorial era montado com um `technicalSummaryJson` diferente e menor
- a regra de merge foi simplificada para preservar coerencia do registro:
  - `summaryJson` passa a vir integralmente da fonte primaria escolhida
  - `summaryText` tambem passa a vir da mesma fonte primaria, caindo no fallback apenas se estiver vazio
  - a mistura profunda de objetos/arrays do JSON foi removida
- impacto pratico esperado:
  - evita memorial ser gerado com um JSON diferente do texto de resumo tecnico que o usuario esta vendo
  - reduz conflito entre resumos gerados pelo `Viewer` e pelo `CadEditor`
- validacao local desta micro-rodada:
  - `Frontend: npm run build`
- observacao operacional importante:
  - como um registro hibrido antigo pode continuar salvo no navegador, o teste seguinte deve regenerar o `Resumo Tecnico` da fonte desejada (preferencialmente o `CadEditor`) antes de gerar um novo memorial

#### Fechamento da rodada atual - 2026-07-06

- o usuario validou visualmente que o `Resumo Tecnico` em PDF parece correto e tambem apontou o JSON salvo em:
  - `Backend/Memoriais/ResumoTecnico.md`
- a conferencia manual desse JSON confirmou que o resumo soberano esta coerente para o arquivo:
  - `TESTE AGENTE_DBL TERRA NOBRE_2.dxf`
  - escopo `arquivo completo`
  - `25` lotes
- a inspeção do `ResumoTecnico.md` confirmou explicitamente que lotes antes ausentes no memorial seguem presentes e aprovados no resumo, incluindo:
  - `4`
  - `5`
  - `6`
  - `10`
  - `11`
  - `25`
- conclusao tecnica desta rodada:
  - o problema remanescente do memorial nao esta no `Resumo Tecnico` soberano
  - qualquer divergencia restante precisa ser rastreada na selecao do JSON aplicado, no cache/estado do frontend ou na montagem final do memorial a partir desse JSON

- o fluxo visivel do frontend foi simplificado para refletir a decisao de produto:
  - o `Resumo Tecnico` e gerado no `Editor Tecnico`
  - `Normas e Exemplos` guarda/seleciona JSONs de resumo
  - `Configurar Memorial` aplica o resumo selecionado ao memorial
- por isso, a pagina intermediaria `Arquivos DXF do Resumo Tecnico` deixou de existir no fluxo:
  - o item correspondente foi removido de `Frontend/src/components/Sidebar.tsx`
  - a rota `/files` em `Frontend/src/App.tsx` foi mantida apenas como redirecionamento de compatibilidade para o `Editor Tecnico`
  - o arquivo `Frontend/src/pages/Files.tsx` foi removido
  - a exportacao em `Frontend/src/pages/index.ts` foi removida
- impacto pratico:
  - o frontend deixa de sugerir um passo operacional paralelo/redundante
  - o caminho oficial fica mais aderente ao fluxo soberano `DXF -> Editor Tecnico -> Resumo Tecnico -> Configurar Memorial -> Memorial`

- tambem ficou esclarecido o comportamento do nome mostrado para o resumo aplicado:
  - o nome exibido corresponde ao arquivo de origem analisado pelo resumo tecnico
  - o usuario preferiu manter a identificacao apenas pelo nome do arquivo, sem adicionar identificador tecnico extra do DXF

- uma frente paralela surgiu por regressao percebida no login:
  - erro reportado no backend: `IllegalArgumentException: Credenciais invalidas`
- a investigacao confirmou que o erro nao veio das mudancas do memorial:
  - o backend continua autenticando por `tenant + usuario/email + senha`
  - o problema pratico identificado foi de escopo de tenant
- diagnostico objetivo obtido no banco local `geo_limites_db`:
  - existem usuarios ativos em mais de um tenant
  - o email `hhudsonpc@gmail.com` existe nos tenants `TESTE` e `HORACIOHUDSON`
  - a senha `123456` bate para o usuario desse email apenas no tenant `TESTE`
  - o admin `admin@sigeve.com.br` existe no tenant `SIGEVE`, mas nao usa `123456`
- conclusao tecnica do login:
  - a tela de login reaproveita o ultimo `tenantCode` salvo em `localStorage`
  - se o tenant lembrado estiver errado, o backend responde `Credenciais invalidas` mesmo com email correto
- orientacao registrada para retomada:
  - testar login com:
    - tenant `TESTE`
    - email `hhudsonpc@gmail.com`
    - senha `123456`
  - se a UX do login continuar causando confusao, a proxima task deve endurecer a tela para deixar o tenant lembrado mais explicito e menos propenso a erro

#### Ponto de retomada recomendado para a nova task

1. instrumentar a geracao do memorial para registrar qual `technicalSummaryJson` real esta sendo aplicado no request final:
   - nome/origem do arquivo
   - `lotCount`
   - lista de `lotNumber`
   - selecao aplicada (`current:<fileId>` / exemplo / fallback)
2. confirmar se o memorial ainda esta consumindo um resumo antigo/parcial apesar de `ResumoTecnico.md` estar correto com `25` lotes
3. so depois dessa prova objetiva, atacar o proximo ponto estrutural do memorial

#### Atualizacao de retomada - 2026-07-07

- o aviso visual antigo na tela `Frontend/src/pages/Memorial.tsx` sobre `JSON BASE` foi removido, porque estava confundindo a leitura do estado real e permanecia aparecendo mesmo quando ja nao representava corretamente a geracao efetiva
- o usuario confirmou que, apos essa limpeza visual, a pagina `Memorial` deixou de exibir o aviso indevido ao abrir
- durante os testes reais de geracao do memorial em `2026-07-07`, ficou comprovado no backend que:
  - o request entra no fluxo soberano com `technicalSummaryJson`, `documentSummaryJson` e `Template` aplicado
  - o backend le o template persistido do memorial
  - porem a geracao real ainda estava caindo no ramo `DOCUMENT_SUMMARY`, e nao no ramo `TEMPLATE`
- evidencias objetivas registradas:
  - `Backend/logs/geolimites.log`
  - `Backend/Memoriais/MemorialComIA_Local.md`
- leitura tecnica consolidada deste ponto:
  - o problema remanescente ja nao e mais o desaparecimento de lotes no `Resumo Tecnico`
  - o problema atual esta na montagem final do memorial pelo backend
  - o resultado real ainda sai com cara de dump do resumo tecnico, incluindo cabecalho antigo como `Arquivo: ResumoTecnicoBase.json`, em vez de assumir plenamente a forma `Norma + Template`
- achado importante desta rodada:
  - foi identificado que a validacao de cobertura do ramo `TEMPLATE` estava sensivel demais ao formato do cabecalho dos lotes
  - houve ajuste em `Backend/src/main/java/com/momorialPro/CadMemorial/service/DeterministicMemorialService.java` para normalizar cabecalhos como `LOTE 01:` e `LOTE 1:` antes da checagem
  - os testes dirigidos do service passaram para os cenarios de template do projeto, mas isso ainda precisa ser confirmado novamente na geracao real com o backend reiniciado
- estado funcional no momento desta anotacao:
  - a diretriz arquitetural consolidada com o usuario ficou assim:
    - `Norma`: define as regras e exigencias do pais/Brasil
    - `Template`: define a estrutura, ordem dos blocos e redacao-base compativel com a norma da prefeitura
    - `Resumo Tecnico`: fornece os dados soberanos e reais do imovel/lotes
  - portanto, a forma final do memorial deve ser conduzida por `Norma + Template`, e nao pelo `Resumo Tecnico`
- interrupcao planejada da frente atual:
  - a depuracao fina do memorial foi pausada neste ponto porque a proxima mudanca de produto sera na configuracao das IAs
  - a nova frente vai incluir tambem o conceito de `modelo configuravel`, e nao apenas o provedor/configuracao atual
- proximo passo ao retomar desta anotacao:
  1. ajustar a area de configuracao das IAs para incluir a selecao/configuracao do modelo
  2. manter registrado qual modelo esta ativo por contexto de uso relevante
  3. depois retomar a geracao real do memorial para confirmar se o ramo `TEMPLATE` passa a vencer com o backend reiniciado e a nova configuracao estabilizada

#### Atualizacao de retomada - 2026-07-07 - AREA TOTAL / MEMORIAL CONTEXT

- a frente mais recente do projeto saiu da depuracao pura do memorial e avancou para a modelagem operacional da `Area Total` no fluxo soberano
- a motivacao veio da discussao com o usuario sobre a diferenca entre:
  - `Area Total` do processamento
  - lotes resultantes
  - eventual area util / remanescente
  - contorno que deve orientar o terreno original no memorial
- a decisao de produto adotada nesta rodada foi:
  - manter na UI o nome `Area Total`
  - no backend, tratar isso como contexto transitio de processamento, sem quebrar o contrato atual do `Resumo Tecnico`

- fase 1 no `Editor CAD` ja havia sido implantada no frontend antes desta anotacao:
  - novo bloco `Area Total` na lateral esquerda
  - botoes:
    - `Selecionar Area Total`
    - `Salvar Area Total`
    - `Limpar Area Total`
  - o fluxo reutiliza a selecao de uma `polilinha fechada` existente no desenho
  - os vertices dessa polilinha sao enviados como `referencePoints` reservados com labels `AREA_TOTAL_Pxx`

- o backend agora reconhece tecnicamente esses pontos de `Area Total` e separa essa semantica dos landmarks georreferenciados comuns
- implementacoes realizadas:
  - criacao do contexto transitio minimo em:
    - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialProcessingContext.java`
  - filtragem de `AREA_TOTAL_Pxx` para nao contaminar landmarks comuns em:
    - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialPreparationService.java`
  - extracao do `processingContext.baseArea` a partir dos `selectedReferencePoints`
  - propagacao desse contexto para a geracao do `Resumo Tecnico` e do `documentSummaryJson` em:
    - `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java`
    - `Backend/src/main/java/com/momorialPro/CadMemorial/service/TechnicalSummaryService.java`

- comportamento novo consolidado do `Resumo Tecnico`:
  - o `technicalSummaryJson` agora pode carregar:
    - `processingContext`
    - `processingContext.baseArea`
    - lista ordenada de vertices do contorno salvo
  - o `documentSummaryJson` tambem recebe esse mesmo `processingContext`
  - o texto do resumo tecnico passou a registrar quando existe `Area Total` salva:
    - `AREA TOTAL SALVA: N ponto(s) de contorno`

- depois disso, a integracao avancou para a camada do memorial propriamente dita
- no ramo deterministico/template:
  - `DeterministicMemorialService` agora le o `processingContext.baseArea` a partir do `documentSummaryJson`
  - quando esse contexto existe, ele passa a ser a fonte preferencial para placeholders do terreno original
  - isso evita que o terreno original seja montado apenas pela agregacao implicita dos vertices dos lotes
- placeholders novos/suportados nessa rodada:
  - `vertices_area_total`
  - `vertices_contorno_area_total`
  - `pontos_area_total`
  - `coordenadas_area_total`
  - `quantidade_pontos_area_total`
- alem disso, placeholders ja usados para o terreno original passam a aproveitar a `Area Total` quando presente:
  - `vertices_terreno_original`
  - `pontos_terreno_original`

- no ramo de IA soberana:
  - `MemorialPromptContextService` passou a incluir um bloco explicito no prompt:
    - `CONTEXTO OPERACIONAL DA AREA TOTAL`
  - esse bloco informa:
    - rotulo do contorno base
    - quantidade de pontos
    - sequencia dos vertices
    - coordenadas do contorno
  - o prompt tambem deixa claro que esse contorno serve apenas como contexto do terreno base/original e nao substitui os vertices soberanos de cada lote

- a integracao foi levada tambem ao fluxo de `chunking` da IA:
  - `MemorialApiService` agora propaga o `technicalSummaryJson` ate os prompts por chunk
  - assim, os chunks tambem enxergam o `processingContext.baseArea`

- testes adicionados/atualizados nesta rodada:
  - `Backend/src/test/java/com/momorialPro/CadMemorial/service/MemorialPreparationServiceTest.java`
    - garante que `AREA_TOTAL_Pxx` vira `processingContext` e nao landmark comum
  - `Backend/src/test/java/com/momorialPro/CadMemorial/service/TechnicalSummaryServiceTest.java`
    - garante serializacao e parse do `processingContext.baseArea`
  - `Backend/src/test/java/com/momorialPro/CadMemorial/service/DeterministicMemorialServiceTest.java`
    - garante uso preferencial da `Area Total` nos placeholders do terreno original
  - `Backend/src/test/java/com/momorialPro/CadMemorial/service/MemorialPromptContextServiceTest.java`
    - garante que o prompt soberano e o prompt por chunk recebem o contexto da `Area Total`

- validacao objetiva desta rodada:
  - diagnsticos limpos nos arquivos alterados
  - execucao Maven bem-sucedida com os testes focados:
    - `DeterministicMemorialServiceTest`
    - `MemorialPromptContextServiceTest`
    - `TechnicalSummaryServiceTest`
    - `MemorialPreparationServiceTest`

- conclusao tecnica desta rodada:
  - a `Area Total` deixou de ser apenas um detalhe de UI
  - ela agora entra de forma soberana no backend como `processingContext`

#### Atualizacao de retomada - 2026-07-08 - LIMPEZA DA UI ANTIGA E `SALVAR PRIMARIAS`

- a frente do `Editor CAD` foi redirecionada para o fluxo operacional pedido pelo usuario:
  - remover o foco de `Selecionar Area`
  - remover o foco de `Salvar Area Total`
  - remover o foco de `Selecionar Area Remanescente`
  - remover o foco de `Salvar Area Remanescente`
  - concentrar o essencial em `Operacoes`
  - usar a selecao ja conhecida com `Ctrl + Shift`
  - substituir o salvamento antigo por `Salvar Primarias`

- mudancas estruturais ja consolidadas no frontend:
  - o dock visivel antigo de `Area Total` foi removido da configuracao do editor
  - o botao `Salvar Primarias` foi adicionado em `Operacoes`
  - o `CadEditorBase.tsx` deixou de depender de polilinha fechada unica para esse fluxo
  - a captura das primarias passou a tentar reconstruir a perimetral a partir de `segmentAnnotations` marcadas com `Ctrl + Shift`
  - o modal de resumo tecnico do editor foi simplificado para refletir `Primarias ausentes` / `Primarias salvas`

- limpeza residual concluida nesta etapa:
  - o tipo `CadDockSection` em `Frontend/src/graphics-engine/pages/cad-editor/cadEditorConfig.ts` nao inclui mais `area-total`
  - os estados padrao do painel esquerdo tambem nao incluem mais esse dock legado
  - foi mantida compatibilidade de sessao antiga:
    - se existir `activeDock: 'area-total'` salvo em storage legado, ele migra silenciosamente para `costura-medidas`
    - se existir `leftPanelState['area-total']`, esse valor antigo e reaproveitado para `costura-medidas`
  - icones antigos de `area-total`, `remaining-area` e `boundary-clear-all` foram removidos de `Frontend/src/graphics-engine/pages/cad-editor/cadEditorIcons.tsx`

- validacao objetiva da limpeza estrutural:
  - `GetDiagnostics` ficou limpo nos arquivos-base alterados
  - `Frontend/package.json` -> `npm run lint` (`tsc --noEmit`) executou com sucesso

- uma depuracao guiada por evidencia foi aberta para a regressao percebida em `Salvar Primarias`
  - arquivo de trilha criado:
    - `debug-primary-save-clear.md`
  - objetivo:
    - entender por que o usuario percebia que o botao nao fazia nada
    - entender por que a selecao roxa nao era limpa

- hipoteses testadas nessa depuracao:
  - o clique nao entrava no handler
  - o aviso de sucesso estava sendo sobrescrito
  - o gatilho de limpeza nao chegava ao `ViewerDXF`
  - o viewer limpava apenas parte do estado visual
  - o destaque percebido pelo usuario vinha de mais de um conjunto de selecao

- instrumentacao runtime adicionada temporariamente:
  - `CadEditorBase.tsx`
    - entrada do `handleSavePrimaryBoundaryInEditor()`
    - erro de validacao
    - sucesso de salvamento
  - `ViewerDXF.tsx`
    - recepcao do nonce de limpeza
    - execucao do `handleClearSelection()`
  - os logs foram enviados para o servidor de debug da skill e registrados em:
    - `.dbg/trae-debug-log-primary-save-clear.ndjson`

- evidencia objetiva confirmada pela instrumentacao:
  - o clique em `Salvar Primarias` entra sim no handler
  - o botao tem acao
  - o caso testado pelo usuario estava sendo rejeitado internamente por validacao
  - a mensagem registrada foi:
    - `Os trechos primarios precisam formar um contorno fechado continuo antes de salvar.`
  - conclusao importante:
    - parte da percepcao de `botao sem acao` vinha do fato de o contorno marcado ainda nao fechar corretamente a perimetral

- o usuario esclareceu tambem a semantica visual das selecoes roxas:
  - `Shift` gera a selecao roxa clara dos logradouros/textos
  - `Shift + Ctrl` gera a selecao roxa escura dos trechos/anotacoes de segmento
  - as duas selecoes juntas determinam o fluxo de confrontacoes

- leitura tecnica do renderer confirmou essa explicacao:
  - `selectedConfrontationTexts` desenha a selecao roxa clara
  - `segmentAnnotations` desenha a selecao roxa escura
  - `selectedSegmentIds` / `selectedSegments` sustentam destaque adicional de segmentos no canvas

- ajustes implementados durante a depuracao:
  - foi adicionado um gatilho opcional `clearConfrontationSelectionNonce` ao `ViewerDXF`
  - `handleClearSelection()` do `ViewerDXF` passou a limpar tambem:
    - `selectedConfrontationTexts`
    - `segmentAnnotations`
    - `selectedSegmentIds`
    - `segmentInspectorMessage`
    - `hoverSegmentTargetPoint`
  - o `CadEditorBase.tsx` passou a disparar esse gatilho no caminho de sucesso do `Salvar Primarias`
  - o aviso de sucesso passou a mencionar explicitamente que a selecao foi limpa

- outro ajuste de UX importante foi implantado:
  - o botao `Salvar Primarias` agora usa a mesma validacao de `buildBoundaryVerticesFromAnnotations(editorSegmentAnnotations)` para refletir o estado real antes do clique
  - isso significa:
    - se nao houver trechos, continua desabilitado com a orientacao de marcar a perimetral
    - se houver trechos mas o contorno ainda for invalido, o proprio status/disabledReason do botao passa a refletir o erro real
    - se o contorno estiver consistente, o botao fica apto a salvar
  - o objetivo foi eliminar a percepcao de que o botao estava `sem acao`

- estado funcional ao encerrar esta rodada:
  - o usuario concluiu que o caso testado provavelmente era mesmo de `contorno invalido`
  - foi observado em uso real que o `snap` aparece mais claramente onde ha lotes validos / textos aproveitaveis
  - isso levantou uma limitacao operacional relevante:
    - a perimetral completa do terreno pode depender tambem de trechos externos visiveis no desenho que nao estao apoiados por lotes nomeados
  - leitura consolidada com o usuario:
    - `Primarias` devem representar a perimetral completa do terreno
    - nao apenas os trechos ligados aos lotes validos com texto interno

- conclusao tecnica desta etapa:
  - houve progresso forte na limpeza do fluxo antigo e na clareza do estado do botao
  - porem ainda existe uma limitacao estrutural do fluxo atual:
    - `Salvar Primarias` continua dependente de conseguir montar um contorno fechado a partir dos trechos marcados / selecionaveis
    - quando partes da borda externa do terreno nao entram bem nesse fluxo, o usuario fica impedido de capturar a perimetral completa

- ponto de retomada recomendado para a nova task:
  1. desacoplar `Salvar Primarias` da dependencia exclusiva dos lotes validos / confrontacoes nomeadas
  2. permitir capturar a perimetral completa do terreno tambem nos trechos externos que existem no DXF, mesmo quando nao ha lote nomeado associado
  3. revisar o suporte de `snap` / captura desses trechos externos para que a perimetral total possa ser fechada com previsibilidade
  4. so depois dessa melhoria estrutural, retestar:
     - salvar primarias
     - limpar selecoes roxas
     - mudar camada
     - selecionar confrontacoes
     - gerar resumo tecnico
  - esse contexto ja sobrevive do `Editor CAD` ate:
    - `Resumo Tecnico`
    - `documentSummaryJson`
    - ramo deterministico/template do memorial
    - prompts da IA soberana
  - porem, nesta fase, a `Area Total` ainda esta sendo usada principalmente como contexto de contorno / vertices do terreno original
  - ainda nao existe semantica completa para:
    - area remanescente
    - area util
    - decisao cartorial final entre contorno base total x contorno apenas da area objeto

#### Ponto de retomada recomendado para a nova task

1. usar o `processingContext.baseArea` para enriquecer a secao `situacao_antes` com semantica mais forte do terreno original:
   - forma do contorno
   - narrativa do terreno base
   - possivel diferenciacao futura entre contorno base e remanescente
2. definir a proxima camada conceitual do `MemorialContext`, seguindo a ideia registrada em `Backend/project/ideia_gpt.md`, sem quebrar o `Resumo Tecnico`
3. decidir com o usuario a regra de negocio mais delicada:
   - se o memorial do terreno original deve refletir a `Area Total` salva
   - ou a area objeto efetiva do desmembramento
4. so depois disso, avancar para modelar explicitamente:
   - `Area Remanescente`
   - diferenca entre `Area Total`, `Area Util` e `Area Objeto`

## Nova Task Recomendada - 2026-07-13

### Tema

Voltar ao fluxo do `Resumo Tecnico` antes de continuar o `Memorial`, implementando uma forma persistente e intuitiva de substituir lotes defeituosos pelos lotes refeitos dentro do proprio editor.

### Motivo funcional

- o usuario consolidou uma necessidade clara:
  - selecionar os lotes com defeito como ja faz em `Total + Parciais`
  - acionar um botao de substituicao
  - salvar o desenho corrigido
  - ao reabrir, nao precisar repetir a selecao para emitir o `Resumo Tecnico`
- isso facilita muito a compreensao do fluxo para o usuario, porque o conserto passa a ficar visivel e persistente no proprio arquivo/projeto, em vez de depender sempre de uma operacao temporaria de geracao

### Regra de negocio desejada

- manter duas formas de resolver lotes defeituosos:
  1. `Total + Parciais` como substituicao tecnica temporaria para gerar o resumo
  2. `Refazer no sistema` como substituicao persistente no editor
- na forma persistente:
  - o lote original com defeito deixa de ser a geometria oficial do desenho
  - o lote refeito passa a ser o oficial
  - o usuario salva e, ao reabrir, o estado correto continua valendo
- o objetivo e que o proximo `Resumo Tecnico` ja saia normal sem exigir nova selecao manual desses mesmos lotes

### Estado tecnico ja mapeado

- ja existe base forte no frontend para essa implementacao:
  - `Frontend/src/graphics-engine/pages/cad-editor/CadEditorBase.tsx`
    - ja salva `savedPartialSelections`
    - ja salva `savedPartialSelectionLotNumbers`
    - ja remove lotes do desenho com `handleRemoveSelectedLotsFromDrawing`
  - `Frontend/src/graphics-engine/pages/cad-editor/cadEditorEntityUtils.ts`
    - ja remonta o desenho com `buildUpdatedDxfData(...)`
  - `Frontend/src/graphics-engine/components/viewer-dxf/cadDrawingUtils.ts`
    - ja cria polylines com `buildPolylineEntity(...)`
  - `Frontend/src/hooks/useCorrectiveSnapshots.ts`
    - ja possui persistencia e reabertura de snapshot corretivo por arquivo/imovel
  - `Frontend/src/components/ViewerHeader.tsx`
  - `Frontend/src/components/CorrectivePanel.tsx`
    - ja possuem UX de reabrir snapshot salvo

### Estrategia recomendada

1. criar em `CadEditorBase.tsx` uma acao explicita do tipo `Aplicar Substituicao dos Parciais`
2. essa acao deve:
   - pegar os lotes salvos em `savedPartialSelections`
   - remover do `DXFData` as geometrias originais correspondentes
   - injetar no desenho novos contornos `LWPOLYLINE` com base nos poligonos refeitos
   - reconstruir o desenho com `buildUpdatedDxfData(...)`
3. expor a acao na UI do editor em `CadEditorLeftSidebar.tsx`
4. integrar isso com o fluxo de salvar/reabrir estado corretivo para que a correcao sobreviva ao reabrir o arquivo
5. depois validar que o `Resumo Tecnico` gerado sobre esse desenho corrigido nao depende mais de `Total + Parciais` para os mesmos lotes

### Arquivos mais provaveis de trabalho

- `Frontend/src/graphics-engine/pages/cad-editor/CadEditorBase.tsx`
- `Frontend/src/graphics-engine/pages/cad-editor/CadEditorLeftSidebar.tsx`
- `Frontend/src/graphics-engine/pages/cad-editor/cadEditorEntityUtils.ts`
- `Frontend/src/graphics-engine/components/viewer-dxf/cadDrawingUtils.ts`
- `Frontend/src/hooks/useCorrectiveSnapshots.ts`
- `Frontend/src/graphics-engine/adapters/geolimites/useGeoLimitesViewerIntegration.ts`
- `Frontend/src/components/ViewerHeader.tsx`
- `Frontend/src/components/CorrectivePanel.tsx`

### Criterios de validacao

- o usuario consegue selecionar/refazer os lotes defeituosos e aplicar a substituicao no editor
- apos salvar e reabrir, os lotes antigos nao voltam a ser usados
- o `Resumo Tecnico` passa a refletir o desenho corrigido diretamente
- o usuario nao precisa repetir a mesma selecao toda vez para emitir um novo resumo

### Ponto de retomada recomendado

1. implementar `handleApplySavedPartialReplacementsInEditor` em `CadEditorBase.tsx`
2. criar o botao correspondente na sidebar
3. salvar o estado corrigido
4. reabrir o arquivo e validar visualmente o desenho
5. gerar novo `Resumo Tecnico` sem usar novamente a selecao temporaria

## Nova Task Recomendada - 2026-07-14

### Tema

Fechar a frente de distribuicao do `GeoLimites Desktop`, consolidando o pacote portatil para Windows, validando o executavel gerado e preparando o artefato final para entrega ao usuario.

### Motivo funcional

- a frente desktop ja avancou do bootstrap Electron para um estado distribuivel:
  - o app abre
  - o `Editor CAD` funciona
  - `Resumo Tecnico` e `Memorial` ja foram exercitados no modo desktop
- o usuario sinalizou claramente a proxima necessidade pratica:
  - "botar o Executavel para desktop para o usuario baixar"
- a IDE esta cobrando uma nova task e, neste momento, o ponto real de continuidade nao e mais a abertura do shell, mas sim o fechamento do empacotamento e da validacao do artefato

### Estado tecnico atual

- o empacotamento do desktop foi estruturado a partir do `Frontend`:
  - `npm run build:desktop`
  - `npm run desktop:dist`
- os scripts principais desta frente estao em:
  - `Frontend/platforms/electron-shell/package.json`
  - `Frontend/platforms/electron-shell/scripts/package-portable.cjs`
  - `Frontend/platforms/electron-shell/scripts/run-electron-builder.cjs`
- o fluxo validado no momento usa `electron-packager` para gerar pacote portatil
- a trilha de `installer` com `electron-builder` continua experimental
- houve um ajuste importante no empacotamento:
  - o script `package-portable.cjs` passou a empacotar primeiro em diretorio temporario unico
  - depois copia o app pronto para `release/.portable-stage`
  - isso eliminou o erro `dest already exists` e tornou o `dist:win` repetivel

### Artefato gerado

- pacote portatil atual:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-0.1.0-win-x64-portable.zip`
- app desempacotado para inspecao:
  - `Frontend/platforms/electron-shell/release/.portable-stage/GeoLimites Desktop-win32-x64`
- validacoes ja executadas nesta retomada:
  - `npm run lint` em `Frontend`
  - `npm run check` em `Frontend/platforms/electron-shell`
  - `npm run dist:win` em `Frontend/platforms/electron-shell`
  - abertura do processo `GeoLimites Desktop.exe`

### Observacoes tecnicas importantes

- o executavel subiu com sucesso no teste automatizado
- durante essa verificacao, o sandbox do ambiente reclamou de acessos a arquivos de perfil do Electron em `AppData`
- isso apareceu como limitacao do ambiente de execucao automatica e nao como falha objetiva do pacote gerado
- o backend padrao do desktop empacotado ja foi ajustado anteriormente para apontar para a URL publica do projeto, evitando dependencia de `localhost`

### Estrategia recomendada

1. validar manualmente o `GeoLimites Desktop.exe` a partir do pacote gerado
2. confirmar o fluxo real do usuario final:
   - abrir o executavel
   - entrar no app
   - abrir arquivo
   - gerar `Resumo Tecnico`
   - gerar `Memorial`
3. decidir se o pacote `.zip` portatil ja atende a distribuicao inicial
4. se necessario, retomar separadamente a trilha de `installer` NSIS
5. depois preparar a publicacao/download do artefato final

### Arquivos mais provaveis de trabalho

- `Frontend/package.json`
- `Frontend/platforms/electron-shell/package.json`
- `Frontend/platforms/electron-shell/main/index.ts`
- `Frontend/platforms/electron-shell/README.md`
- `Frontend/platforms/electron-shell/scripts/package-portable.cjs`
- `Frontend/platforms/electron-shell/scripts/run-electron-builder.cjs`
- `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-0.1.0-win-x64-portable.zip`

### Criterios de validacao

- `npm run desktop:dist` volta a gerar o artefato sem erro
- o `.zip` contem um app executavel utilizavel
- o `GeoLimites Desktop.exe` abre fora do ambiente de desenvolvimento
- o usuario consegue usar o fluxo principal sem depender do shell em modo dev
- existe um artefato claro para disponibilizar ao usuario final

### Ponto de retomada recomendado

1. abrir manualmente `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-0.1.0-win-x64-portable.zip`
2. executar `GeoLimites Desktop.exe`
3. validar o fluxo principal no modo empacotado
4. decidir `zip portatil agora` vs `installer depois`
5. preparar a etapa de entrega/publicacao do executavel

## Atualizacao Mais Recente - 2026-07-14 - DESKTOP VALIDADO

### O que foi fechado nesta rodada

- o usuario testou manualmente com sucesso:
  - o instalador Windows
  - o executavel portatil
- isso fecha a duvida principal desta frente:
  - o `GeoLimites Desktop` esta funcional fora do modo dev
- a trilha `installer:win` deixou de ser apenas teorica nesta rodada:
  - o build foi executado de verdade
  - os artefatos foram gerados em `release/`

### Ajuste tecnico importante concluido

- havia colisao de nome entre os alvos `nsis` e `portable` do `electron-builder`
- os dois estavam escrevendo no mesmo nome final de `.exe`
- o `Frontend/platforms/electron-shell/package.json` foi ajustado para separar os nomes:
  - `GeoLimites-Desktop-Setup-${version}-${arch}.${ext}`
  - `GeoLimites-Desktop-Portable-${version}-${arch}.${ext}`
- com isso, a pasta `release/` passou a refletir corretamente os dois formatos de distribuicao

### Artefatos finais desta rodada

- instalador principal:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Setup-0.1.0-x64.exe`
- executavel portatil:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Portable-0.1.0-x64.exe`
- zip portatil:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-0.1.0-win-x64-portable.zip`

### Documento operacional criado

- foi criado um guia de entrega em:
  - `Frontend/docs/sigeve-electron-desktop/ENTREGA_WINDOWS_0.1.0.md`
- foi criado tambem um guia curto de publicacao em:
  - `Frontend/docs/sigeve-electron-desktop/PUBLICACAO_WINDOWS_0.1.0.md`
- foi criado tambem um guia de stage/commit focado nesta frente em:
  - `Frontend/docs/sigeve-electron-desktop/STAGE_DESKTOP_0.1.0.md`
- esse arquivo registra:
  - artefatos
  - hashes SHA-256
  - comandos usados
  - recomendacao de entrega

### Estado real para a proxima pessoa

- a validacao tecnica e manual do desktop esta encerrada com sucesso
- a proxima acao desta frente ja nao e mais empacotar nem testar
- a proxima acao passa a ser operacional:
  - disponibilizar o `Setup` no canal de download escolhido
  - manter o `Portable` como fallback tecnico

### Proximo passo recomendado

1. usar `GeoLimites-Desktop-Setup-0.1.0-x64.exe` como artefato principal de entrega
2. anexar tambem `GeoLimites-Desktop-Portable-0.1.0-x64.exe` como alternativa
3. se a entrega/publicacao estiver concluida, voltar para a frente funcional anterior:
   - substituicao persistente de lotes refeitos no editor para o `Resumo Tecnico`
