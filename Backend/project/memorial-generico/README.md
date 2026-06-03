# Projeto Memorial Generico

## Objetivo

Estruturar a evolucao do backend do GeoLimites para que a geracao de memoriais descritivos funcione de forma generica, previsivel, auditavel e aderente a casos reais de:

- desmembramento
- unificacao
- retificacao
- remembramento
- cadastros tecnicos com base vetorial DXF georreferenciada

Este projeto nasce para eliminar pontos obscuros ja identificados no sistema atual, reduzir hardcodes, fechar lacunas de integracao e preparar uma base profissional para continuidade do desenvolvimento.

## Estado Atual Resumido

O sistema ja possui uma base funcional importante:

- autenticacao e autorizacao
- cadastro de propriedades
- upload e download de arquivos DXF
- visualizacao DXF no frontend
- geracao de memorial com IA
- tentativa de extracao de coordenadas SIRGAS 2000

Os principais problemas atuais sao:

- fluxo principal e fluxo alternativo de memorial coexistem sem consolidacao
- ainda existem hardcodes de lote, area, confrontacao e coordenadas de fallback
- associacao entre propriedade e arquivos DXF nao esta concluida
- o comportamento com DXF georreferenciado real ainda nao esta validado de ponta a ponta
- ha documentacao espalhada, parcial e com desatualizacao
- existem segredos sensiveis versionados em arquivo de configuracao
- o produto deve evoluir para SAAS, mas ainda estava sem base explicita de tenant

## Resultado Esperado

Ao final deste projeto, o backend deve:

- receber dados DXF e classificar corretamente o tipo de operacao
- extrair geometria e georreferenciamento sem depender de cenarios fixos
- gerar um modelo de dominio tecnico confiavel antes de chamar a IA
- produzir memoriais variando conforme tipo de operacao e dados reais
- falhar de forma explicita quando nao houver confianca tecnica suficiente
- expor endpoints coerentes e unificados para consumo do frontend
- oferecer trilha de depuracao e criterios objetivos de validacao

## Estrutura Deste Projeto

- `README.md`: visao geral, escopo e principios
- `ROADMAP.md`: fases de execucao
- `BACKLOG.md`: backlog inicial priorizado
- `CRITERIOS_DE_ACEITE.md`: definicao objetiva de pronto
- `TESTES_DXF_GEOREFERENCIADO.md`: plano de testes com DXF real
- `SAAS_MULTITENANCY.md`: direcao de preparacao para SAAS multi-tenant
- `SAAS_OPERACAO_E_ADMIN.md`: continuidade operacional do SAAS com cadastro, e-mail, SMTP e area admin
- `DATABASE_MIGRATIONS.md`: estrategia de evolucao do banco com Flyway

## Principios de Implementacao

1. Geometria antes de IA
   O backend deve primeiro consolidar fatos tecnicos do DXF antes de pedir redacao ao modelo.

2. Zero hardcode de caso especifico
   Nenhuma regra de area, quantidade de lotes, confrontacao ou coordenada deve permanecer fixa no fluxo principal.

3. Falha explicita e auditavel
   Se o sistema nao conseguir inferir dados tecnicos minimos, deve retornar erro tecnico claro e rastreavel.

4. Um fluxo principal
   A geracao de memorial deve ter um unico fluxo oficial no backend.

5. DXF georreferenciado como criterio de verdade
   A validacao final depende de arquivo real, nao apenas de mocks ou logs.

## Frentes de Trabalho

- saneamento de seguranca e configuracao
- preparacao da fundacao multi-tenant para SAAS
- operacao SAAS com onboarding, confirmacao de e-mail e administracao
- consolidacao do fluxo de geracao
- modelagem generica do dominio tecnico
- extracao vetorial e georreferenciamento
- classificacao do tipo de memorial
- integracao propriedade x arquivos x memorial
- observabilidade, debug e testes reais

## Definicao Inicial de Sucesso

O projeto sera considerado bem encaminhado quando:

- existir um pipeline tecnico unificado para geracao
- os hardcodes criticos tiverem sido removidos
- o backend conseguir processar um DXF georreferenciado real sem fallback ficticio
- o memorial refletir dados reais de geometria, confrontacao e coordenadas
- o frontend consumir o fluxo consolidado sem caminhos paralelos quebrados
