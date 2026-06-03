# Roadmap

## Fase 0 - Contencao Tecnica

Objetivo: eliminar riscos imediatos e criar base segura para evolucao.

- remover segredos versionados de arquivos de configuracao
 - introduzir fundacao inicial de tenant para a evolucao SAAS
- migrar configuracoes sensiveis para variaveis de ambiente
- revisar documentacao existente e apontar o fluxo oficial
- congelar o uso de fallbacks ficticios no fluxo principal

Entregaveis:

- configuracao segura documentada
 - fundacao inicial multi-tenant sem quebra de compatibilidade
- inventario dos fluxos existentes
- lista dos hardcodes a remover

## Fase 1 - Consolidacao do Fluxo Oficial

Objetivo: definir um unico pipeline de backend para geracao de memorial.

- mapear endpoints reais e endpoints paralelos
- escolher o fluxo oficial de geracao sincrona ou assincrona
- descontinuar ou isolar codigo experimental fora do backend principal
- alinhar contrato de request e response entre frontend e backend

Entregaveis:

- diagrama do fluxo oficial
- contrato unico de API
- lista de endpoints depreciados

## Fase 2 - Dominio Tecnico Generico

Objetivo: criar uma camada de interpretacao tecnica antes da IA.

- definir modelo intermediario de dominio tecnico do imovel
- representar vertices, segmentos, poligonos, confrontacoes e metadados
- separar operacoes: desmembramento, unificacao, retificacao e remembramento
- criar criterios de confianca tecnica por extracao

Entregaveis:

- modelo de dominio tecnico
- mapeamento de tipos de operacao
- politica de confianca e falha

## Fase 3 - Extracao Vetorial e Georreferenciamento

Objetivo: garantir leitura robusta de DXF real e geolocalizado.

- revisar parser e normalizacao de entidades
- consolidar extracao de vertices e segmentos
- validar extracao SIRGAS 2000 por multiplas estrategias
- remover coordenadas e notas de debug hardcoded do fluxo final
- registrar claramente quando o arquivo nao possui base georreferenciada confiavel

Entregaveis:

- pipeline tecnico de extracao
- relatorio de confianca de coordenadas
- suporte validado para DXF georreferenciado real

## Fase 4 - Memorial Generico

Objetivo: gerar memorial conforme o tipo de operacao e dados reais.

- remover pressupostos fixos de 25 lotes e area 130 m2
- gerar memorial a partir de dados tecnicos consolidados
- ajustar prompts para operacao, geometria e contexto juridico
- separar texto tecnico obrigatorio de variacao redacional da IA

Entregaveis:

- gerador de memorial sem hardcodes criticos
- prompts por tipo de operacao
- saida tecnicamente consistente

## Fase 5 - Integracao com Propriedade e Frontend

Objetivo: fechar o ciclo de uso do sistema.

- concluir associacao propriedade x arquivos DXF
- garantir selecao e rastreabilidade de propertyId e standardId
- alinhar sidebar, viewer e tela de memorial com um unico fluxo
- remover chamadas a endpoints inexistentes

Entregaveis:

- integracao ponta a ponta consistente
- fluxo unico de navegacao no frontend
- payloads sem ambiguidade

## Fase 5.1 - Ativacao do Modo SAAS

Objetivo: sair da fundacao multi-tenant para enforcement real por tenant.

- resolver tenant atual a partir do contexto autenticado
- filtrar consultas por tenant
- introduzir administracao de tenant
- separar operacao de super admin e tenant admin

Entregaveis:

- contexto de tenant ativo
- enforcement por tenant
- base pronta para onboarding comercial

## Fase 5.2 - Operacao SAAS e Area Admin

Objetivo: transformar a fundacao multi-tenant em uma operacao administravel e pronta para homologacao externa.

- implementar cadastro tenant-aware com e-mail
- exigir confirmacao de e-mail ou habilitar auto-verificacao por ambiente
- implementar recuperacao e redefinicao de senha
- criar area admin minima para usuarios e tenants
- adicionar configuracao SMTP no admin global
- preparar publicacao inicial para escritorio piloto

Entregaveis:

- onboarding minimo de usuario
- verificacao de e-mail funcional
- SMTP configuravel
- area admin minima operante
- checklist de publicacao para homologacao externa

## Fase 6 - Validacao Real e Pronto para Evolucao

Objetivo: estabelecer confianca operacional.

- executar testes com DXF georreferenciado real
- validar casos de desmembramento e unificacao
- capturar evidencias de sucesso e falha
- registrar decisoes tecnicas e proximos incrementos

Entregaveis:

- checklist de homologacao
- conjunto de evidencias
- backlog da proxima iteracao

## Ordem Recomendada

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
7. Fase 5.1
8. Fase 5.2
9. Fase 6
