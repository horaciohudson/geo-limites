# Caso Piloto - 25 Lotes com 5 Lotes Abertos

## Objetivo

Usar um DXF real de 25 lotes, no qual 5 lotes estao abertos, como primeiro caso piloto do projeto `editor-corretivo-memorial`.

Este caso e importante porque testa ao mesmo tempo:

- leitura real de loteamento maior
- consistencia geometrica de poligonos
- limites do resumo tecnico atual
- utilidade real de um modo corretivo interno

## Por Que Este Caso E Valioso

Historicamente o sistema ja teve forte acoplamento ao numero `25 lotes`, inclusive com hardcodes e inferencias artificiais.

Esse caso piloto e melhor que os cenarios antigos porque:

- continua sendo um arquivo de 25 lotes, entao preserva uma referencia operacional conhecida da equipe
- mas introduz um problema real de geometria: 5 lotes abertos
- obriga o sistema a sair da logica "gerar todos os lotes" e entrar na logica "confiar apenas no que esta tecnicamente valido"

## O Que Este Caso Deve Responder

Este arquivo deve nos ajudar a responder:

1. o resumo tecnico detecta corretamente quais lotes estao abertos?
2. o visualizador consegue destacar quais segmentos ou vertices estao causando a abertura?
3. esse problema e corrigivel com um editor corretivo pequeno?
4. a correcao interna e mais rapida que sair para AutoCAD?
5. depois da correcao, o resumo tecnico melhora de forma objetiva?

## Hipotese de Produto

Se os 5 lotes abertos puderem ser identificados, corrigidos e revalidados dentro do GeoLimites com baixo atrito, este caso prova que o editor corretivo tem valor real.

Se a correcao exigir operacoes amplas, demoradas ou ambiguas demais, o caso indica que essa categoria deve continuar no CAD externo.

## Classe do Problema

Este caso se encaixa principalmente na classe:

- geometria incompleta ou poligono nao fechado

Possiveis causas tecnicas:

- vertices finais nao coincidem dentro da tolerancia
- segmento faltante
- linha deslocada
- erro de snap no desenho original
- lote visualmente quase fechado, mas tecnicamente aberto

## O Que O GeoLimites Deve Fazer Neste Caso

### No Visualizador

- apontar claramente quais lotes estao abertos
- destacar os lados ou vertices suspeitos
- mostrar por que aquele lote nao esta apto ao memorial

### No Resumo Tecnico

- classificar o lote como `PENDENTE` quando a abertura impedir confianca geometrica
- evitar qualquer suavizacao que esconda o problema
- diferenciar lote aberto de lote apenas com confrontacao incompleta

### No Editor Corretivo

Ferramentas candidatas para este caso:

- editar vertice
- unir segmentos proximos
- fechar poligono quando a intencao geometrica estiver clara
- mostrar distancia entre pontas abertas

## O Que Nao Fazer

- nao usar o numero esperado de lotes como prova de integridade
- nao completar lote aberto com fallback ficticio
- nao mascarar erro geometrico com texto mais bonito
- nao considerar memorial apto so porque existem 25 lotes numerados

## Criterio de Sucesso Deste Caso Piloto

O caso sera considerado bem sucedido quando for possivel:

- detectar os 5 lotes abertos sem intervencao manual no backend
- evidenciar visualmente onde esta a abertura
- corrigir ao menos um lote aberto em fluxo controlado
- rodar novamente o resumo tecnico e observar melhora objetiva

## Criterio de Rejeicao

O caso deve ser tratado como fora do escopo inicial do editor corretivo se:

- a correcao exigir redesenho amplo do loteamento
- a intencao geometrica do lote nao puder ser inferida com seguranca
- o ajuste interno ficar mais lento que uma correcao direta em AutoCAD

## Uso Como Caso de Priorizacao

Cada ferramenta do editor corretivo deve ser comparada contra este caso piloto.

Perguntas obrigatorias:

- ajuda a resolver um dos 5 lotes abertos?
- reduz o tempo de iteracao?
- melhora a confianca do resumo tecnico?
- evita sair do sistema sem virar um CAD completo?

## Proxima Acao Recomendada

Transformar este DXF em caso de homologacao da `Fase 0`, com uma tabela simples:

- lote
- tipo de abertura
- causa provavel
- corrigivel no GeoLimites?
- ferramenta necessaria
- deve continuar no AutoCAD?
