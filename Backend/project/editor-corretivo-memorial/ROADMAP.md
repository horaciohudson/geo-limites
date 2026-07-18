# Roadmap

## Fase 0 - Delimitacao do Problema

Objetivo: fechar o recorte do editor corretivo e impedir que ele vire um CAD generico.

- listar os erros do resumo tecnico que realmente justificam correcao dentro do sistema
- separar erro de extracao, erro de desenho e erro de classificacao semantica
- definir o que continua sendo responsabilidade de software CAD externo
- documentar a fronteira entre visualizador e modo corretivo

Entregaveis:

- lista de problemas alvo
- lista de nao objetivos
- fluxo inicial de navegacao

## Fase 1 - Modelo de Correcao

Objetivo: definir como o GeoLimites representa uma correcao tecnica.

- decidir se a correcao recai sobre snapshot interno, DXF derivado ou modelo vetorial proprio
- modelar lote, segmento, vertice, texto, camada semantica e associacoes
- prever trilha de auditoria da correcao
- definir o contrato de reprocessamento do resumo tecnico

Entregaveis:

- modelo interno minimo de edicao
- contrato de persistencia de correcao
- regra de revalidacao

## Fase 2 - Integracao com o Visualizador

Objetivo: ativar o fluxo de entrada no modo corretivo.

- destacar no viewer os pontos que o resumo tecnico marcou como problematicos
- adicionar acao explicita para abrir o modo corretivo
- carregar entidades relevantes do arquivo no contexto de correcao
- preservar retorno simples ao visualizador

Entregaveis:

- fluxo `Visualizador -> Corrigir`
- destacacao visual de erros
- contexto basico de selecao de lote, lado e texto

## Fase 3 - Ferramentas Corretivas Minimas

Objetivo: entregar as primeiras acoes que resolvem maior parte dos casos reais.

- mover ou reassociar texto de confrontacao
- marcar frente viaria
- editar vertice de polilinha
- ajustar camada semantica de entidade
- unir ou corrigir segmento simples

Entregaveis:

- pacote minimo de ferramentas
- salvamento de snapshot corrigido
- reabertura do arquivo corrigido

## Fase 4 - Revalidacao Tecnica

Objetivo: fechar o ciclo de confianca.

- regenerar o resumo tecnico a partir do snapshot corrigido
- comparar antes e depois
- indicar se a correcao removeu bloqueantes ou apenas avisos
- registrar quais itens continuam pendentes

Entregaveis:

- painel comparativo antes/depois
- resumo tecnico reprocessado
- criterio claro de melhora tecnica

## Fase 5 - Integracao com Memorial

Objetivo: permitir que o memorial use a versao corrigida como base preferencial.

- escolher a versao ativa do arquivo para geracao
- distinguir arquivo original, snapshot corrigido e artefatos temporarios
- garantir rastreabilidade da fonte usada na geracao
- manter a possibilidade de descartar a correcao e voltar ao original

Entregaveis:

- selecao da base ativa de geracao
- historico de correcoes
- pipeline pronto para memorial com snapshot validado

## Ordem Recomendada

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
