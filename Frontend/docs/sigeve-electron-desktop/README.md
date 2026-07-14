# Sigeve Electron Desktop

## Visao

Espaco reservado para a futura arquitetura desktop do ecossistema Sigeve, com foco em separar claramente:

- `Sigeve Graphics Engine`
- `Sigeve Electron Shell`
- `Spring Boot Base`
- `React Base`

## Objetivo

Estruturar uma base para evoluir o GeoLimites para um aplicativo desktop com tecnologia Electron, preservando o reaproveitamento do motor grafico e organizando melhor as responsabilidades entre shell, frontend e backend.

## Blocos Pensados

### Sigeve Graphics Engine

Camada reutilizavel de motor grafico, viewer, editor CAD, contratos compartilhados e adaptadores de produto.

### Sigeve Electron Shell

Camada desktop responsavel por:

- bootstrap da aplicacao
- janelas e navegacao nativa
- integracao com sistema de arquivos
- menus desktop
- seguranca entre processos
- comunicacao entre shell e frontend

### Spring Boot Base

Camada de servicos e regras de negocio compartilhadas, com possibilidade de operar como backend local, remoto ou hibrido conforme a estrategia futura do produto.

### React Base

Camada de interface e fluxos de negocio do frontend, desacoplada do shell sempre que possivel, para permitir reuso em cenarios web e desktop.

## Direcao Inicial

O caminho imaginado hoje e algo proximo de:

1. `Sigeve Graphics Engine` como nucleo reutilizavel.
2. `React Base` como aplicacao de interface.
3. `Sigeve Electron Shell` como casca desktop.
4. `Spring Boot Base` como servico/base de dominio.

## Fluxo Entre Camadas

Fluxo conceitual proposto:

1. O usuario interage na `React Base`.
2. A `React Base` consome o `Sigeve Graphics Engine` para viewer, editor CAD e recursos graficos.
3. Quando precisar de recursos nativos, a `React Base` conversa com o `Sigeve Electron Shell` via APIs controladas.
4. O `Sigeve Electron Shell` intermedia acesso a arquivos locais, janelas, menus nativos e integracoes de desktop.
5. A `React Base` e/ou o `Electron Shell` se conectam ao `Spring Boot Base` para regras de negocio, autenticacao, persistencia e servicos de dominio.

## Regra de Ouro

Para essa arquitetura funcionar bem no futuro:

- o `Graphics Engine` nao pode depender de Electron
- a `React Base` nao deve conhecer APIs nativas diretamente
- o `Electron Shell` deve expor apenas contratos pequenos e seguros
- o `Spring Boot Base` deve continuar util tanto para web quanto para desktop

## Estrutura Sugerida

Uma estrutura futura possivel:

```text
platforms/
  electron-shell/
    main/
    preload/
    renderer-bridge/
docs/
  sigeve-electron-desktop/
src/
  graphics-engine/
  app/
  adapters/
backend/
  spring-boot-base/
```

## Papel De Cada Pasta

### `platforms/electron-shell`

Concentraria tudo que for exclusivo do desktop:

- processo principal do Electron
- criacao de janelas
- menu nativo
- preload scripts
- bridge segura entre renderer e recursos nativos
- empacotamento desktop

### `src/app`

Aplicacao React base, com:

- roteamento
- telas
- estado de aplicacao
- orquestracao entre frontend e servicos

### `src/graphics-engine`

Motor grafico reutilizavel:

- viewer DXF
- CAD editor
- contratos compartilhados
- geometria
- adaptadores por produto

### `src/adapters`

Camada para encaixar a aplicacao em diferentes produtos ou shells:

- `geolimites`
- futuro `studio`
- futuro adapter para integracao com shell desktop

### `backend/spring-boot-base`

Base de backend e dominio:

- autenticacao
- servicos
- persistencia
- integracoes
- regras de negocio compartilhadas

## Modos De Operacao Possiveis

### Modo Web

- `React Base` no navegador
- `Spring Boot Base` remoto
- sem Electron

### Modo Desktop Hibrido

- `React Base` dentro do Electron
- `Electron Shell` cuidando de arquivos e desktop
- `Spring Boot Base` remoto ou parcialmente local

### Modo Desktop Completo

- `React Base` dentro do Electron
- `Electron Shell` como casca principal
- `Spring Boot Base` embarcado/local quando fizer sentido

## Responsabilidades Tecnicas

### O que deve ficar no Electron Shell

- abrir e salvar arquivos locais
- escolher pastas
- atalhos nativos
- menu de aplicacao
- atualizacao desktop
- integrações com sistema operacional

### O que deve ficar na React Base

- interface
- fluxo de uso
- estados de tela
- consumo dos contratos expostos pelo shell
- composicao dos modulos do produto

### O que deve ficar no Graphics Engine

- renderizacao
- ferramentas CAD
- geometria
- undo/redo do motor
- contratos de extensao

### O que deve ficar no Spring Boot Base

- autenticacao/autorizacao
- dominio de negocio
- dados persistidos
- processamento de documentos
- APIs e integracoes corporativas

## Contratos Importantes

No futuro, vale criar contratos explicitos para:

- `file-system`
- `window-management`
- `desktop-menu`
- `native-shortcuts`
- `app-config`
- `backend-connection`

Esses contratos podem nascer primeiro como interfaces TypeScript para evitar acoplamento direto da UI ao Electron.

## Sequencia Recomendada

Uma evolucao segura seria:

1. consolidar o `Graphics Engine` como modulo totalmente reutilizavel
2. separar melhor a `React Base` das regras especificas do GeoLimites
3. criar um contrato de shell desktop neutro
4. implementar um `Electron Shell` minimo
5. testar abertura de arquivos, salvar, menu e atalhos
6. depois integrar recursos mais profundos de desktop

## MVP Desktop

Um MVP coerente para a primeira versao desktop poderia incluir:

- abrir o GeoLimites dentro do Electron
- abrir DXF local
- salvar/exportar arquivos
- menu nativo basico
- bridge segura via preload
- configuracao de ambiente local/remoto para backend

## Riscos E Cuidados

- nao acoplar `window`/Electron APIs dentro do `Graphics Engine`
- evitar logica de negocio no shell desktop
- manter preload minimo e seguro
- planejar bem instalacao, update e logs
- decidir cedo a estrategia offline vs online

## Decisoes Em Aberto

- o `Spring Boot Base` rodara embarcado, remoto ou hibrido?
- o desktop tera modo offline?
- o shell tera multiplas janelas ou janela unica?
- o `GeoLimites` e o `Studio` compartilharao o mesmo shell?
- quais recursos serao exclusivos do desktop?

## Pontos Para Evoluir Depois

- definir se o Electron consumira backend embarcado, remoto ou modo hibrido
- definir contratos de comunicacao entre `Electron Shell` e `React Base`
- definir estrategia de empacotamento e atualizacao desktop
- definir o que sera compartilhado entre `GeoLimites` e `Sigeve Studio`
- detalhar responsabilidades exatas do `Graphics Engine`

## Status

Documento inicial expandido com proposta de camadas, estrutura, fluxo e roadmap tecnico inicial.

## Entrega Validada

Nesta etapa, a distribuicao Windows do `GeoLimites Desktop` foi validada manualmente.

Documento operacional desta entrega:

- `Frontend/docs/sigeve-electron-desktop/ENTREGA_WINDOWS_0.1.0.md`
- `Frontend/docs/sigeve-electron-desktop/PUBLICACAO_WINDOWS_0.1.0.md`
- `Frontend/docs/sigeve-electron-desktop/STAGE_DESKTOP_0.1.0.md`
- `Frontend/docs/sigeve-electron-desktop/RELEASE_GITHUB_WINDOWS_0.1.0.md`
