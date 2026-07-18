# Backlog Inicial

## P0 - Produto e Arquitetura

- mapear quais erros atuais do `Resumo Tecnico` podem ser corrigidos dentro do sistema
- usar o DXF real de `25 lotes com 5 lotes abertos` como caso piloto de delimitacao
- preencher a `TABELA_CLASSIFICACAO_CASO_PILOTO.md` assim que os 5 lotes forem identificados pelo resumo tecnico
- definir o que sera editado: DXF derivado, snapshot interno ou modelo tecnico proprio
- definir a diferenca entre `visualizador`, `modo corretivo` e `editor avancado`
- escolher a estrategia de persistencia da versao corrigida

## P0 - Reaproveitamento do Studio

- portar utilitarios geometricos relevantes do Studio para um modulo neutro do GeoLimites
- adaptar a logica de selecao por conectividade para lotes e segmentos do DXF
- adaptar a ideia de camada semantica para confrontacoes, vias, vertices e referencias
- revisar como representar texto tecnico como entidade selecionavel no frontend

## P1 - Viewer e UX

- adicionar CTA `Corrigir arquivo` quando houver bloqueantes ou avisos fortes
- destacar no visualizador o lote, lado ou confrontacao relacionado ao erro
- exibir o motivo tecnico da correcao de forma operacional
- permitir retorno simples para o resumo tecnico

## P1 - Ferramentas Minimas

- mover texto
- reassociar texto a segmento
- marcar frente viaria
- editar vertice
- corrigir camada semantica

## P1 - Revalidacao

- reprocessar o resumo tecnico apos salvar correcao
- mostrar diferenca entre resultado anterior e atual
- registrar quais bloqueantes foram resolvidos
- impedir que a correcao fique invisivel para o usuario

## P2 - Persistencia e Historico

- guardar snapshot corrigido vinculado ao arquivo original
- permitir descartar correcao e retornar ao original
- manter historico de operacoes corretivas
- registrar quem corrigiu e quando corrigiu

## P2 - Memorial

- escolher explicitamente qual versao do arquivo alimenta o memorial
- permitir gerar memorial a partir do snapshot corrigido
- manter rastreabilidade entre memorial e versao tecnica usada

## Riscos

- escopo crescer demais e virar um CAD generico
- gastar tempo em ferramentas pouco usadas
- corrigir sintoma visual sem resolver a origem tecnica
- criar um fluxo mais lento que o uso externo do AutoCAD

## Criterio de Priorizacao

Cada item novo deve responder positivamente a pelo menos duas perguntas:

- reduz a necessidade de sair do GeoLimites?
- resolve um erro real do resumo tecnico?
- e mais rapido que corrigir fora do sistema?
- melhora a confianca do memorial final?
