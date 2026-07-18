# Projeto Editor Corretivo Memorial

## Objetivo

Criar uma frente de evolucao para o GeoLimites que permita:

- abrir um DXF no visualizador atual
- detectar com clareza quando o arquivo nao e suficiente para gerar um memorial confiavel
- oferecer um modo de correcao orientado ao memorial
- revalidar rapidamente o arquivo corrigido antes da geracao final

Este projeto nao pretende criar um CAD generico nem substituir AutoCAD.

O objetivo e entregar um editor corretivo especializado, pequeno, objetivo e acoplado ao fluxo de validacao tecnica do GeoLimites.

## Problema de Produto

Hoje o sistema consegue:

- abrir o arquivo no visualizador
- montar um resumo tecnico
- apontar inconsistencias importantes

Mas quando o DXF real apresenta ambiguidade, texto mal posicionado, confrontacao pouco especifica ou geometria insuficiente, o operador precisa sair do GeoLimites, corrigir em software externo e tentar novamente.

Isso cria:

- quebra de fluxo operacional
- retrabalho
- dificuldade de repetir correcoes pequenas
- baixa rastreabilidade do que foi corrigido para viabilizar o memorial

## Tese do Projeto

O GeoLimites precisa de um editor de correcao, nao de um CAD completo.

Esse editor deve resolver apenas o que impacta diretamente a cadeia:

`DXF -> Resumo Tecnico -> Memorial`

## Escopo Inicial

O escopo inicial desta frente e:

- destacar no visualizador os problemas detectados pelo resumo tecnico
- permitir abrir um modo de correcao a partir do proprio visualizador
- habilitar correcoes minimas e de alto valor
- salvar uma versao corrigida do arquivo para novo processamento
- comparar resultado antes e depois da correcao

## O Que Este Projeto Nao E

- nao e um novo AutoCAD
- nao e um editor vetorial generico para qualquer uso
- nao e uma substituicao do fluxo profissional de desenho externo
- nao e uma tentativa de reproduzir todas as ferramentas do Studio

## Valor Esperado

Se esta frente funcionar, o GeoLimites passa a ter um diferencial operacional:

- o operador ve o erro tecnico no proprio sistema
- corrige apenas o necessario
- revalida sem sair do fluxo
- gera o memorial com mais confianca e menos iteracao externa

## Reaproveitamento do Studio

O Studio nao entra como dependencia de produto, mas serviu para identificar blocos conceituais e tecnicos que podem ser adaptados ao GeoLimites:

- utilitarios geometricos de projecao, distancia e ponto mais proximo em segmentos e poligonos
- selecao de caminho conectado por tolerancia
- extracao de contorno e organizacao de segmentos
- modelo de camadas com semantica de negocio
- tratamento de texto como entidade geometrica relevante
- serializacao de geometria com metadados

## Hipotese de Uso

Fluxo desejado:

1. usuario abre o DXF no visualizador
2. resumo tecnico indica falhas ou baixa confianca
3. usuario clica em `Corrigir arquivo`
4. sistema abre o modo corretivo
5. usuario faz ajuste minimo orientado pelo problema
6. sistema salva snapshot corrigido
7. resumo tecnico roda novamente
8. memorial usa a versao tecnicamente confiavel

## Principios

1. O visualizador continua leve
   A parte principal do viewer nao deve virar um CAD completo.

2. Correcao guiada pelo erro
   Cada ferramenta deve existir para resolver um problema real do resumo tecnico.

3. Menor esforco que abrir AutoCAD
   Se a tarefa for mais demorada que corrigir fora, o recurso falhou.

4. Geometria com rastreabilidade
   Toda correcao precisa poder ser auditada: o que mudou, onde mudou e por que mudou.

5. Escopo pequeno e incremental
   O projeto deve nascer com poucas ferramentas e ampliar apenas se provar valor.

## Funcionalidades Candidatas de Primeira Onda

- mover ou reassociar texto de confrontacao
- marcar frente viaria
- editar vertices de polilinha do lote
- unir ou ajustar segmentos simples
- corrigir classificacao de camada semantica
- destacar lados e confrontacoes suspeitas
- reprocessar resumo tecnico apos salvar

## Decisao de Produto Inicial

A equipe conhece AutoCAD, portanto o objetivo nao e competir com ele.

O objetivo do editor corretivo e resolver rapidamente os casos em que:

- o arquivo esta quase pronto
- o erro e localizado
- a validacao tecnica ja mostrou o que precisa ser ajustado

## Estrutura Deste Projeto

- `README.md`: visao geral, escopo e principios
- `ROADMAP.md`: fases recomendadas
- `BACKLOG.md`: backlog inicial priorizado
- `CASO_PILOTO_25_LOTES_5_ABERTOS.md`: primeiro caso real para validar o editor corretivo
- `TABELA_CLASSIFICACAO_CASO_PILOTO.md`: matriz de decisao para separar correcao interna e uso de AutoCAD

## Definicao Inicial de Sucesso

Esta frente estara bem encaminhada quando:

- existir um fluxo `Visualizador -> Corrigir -> Revalidar`
- houver um conjunto minimo de ferramentas corretivas
- o operador conseguir resolver erros pequenos sem sair do GeoLimites
- o resumo tecnico refletir claramente o efeito da correcao
