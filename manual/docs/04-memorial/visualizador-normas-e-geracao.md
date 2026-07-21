# Memorial, Revisao e Geracao

## Visao geral do fluxo atual

No produto atual, o fluxo principal do memorial passa por tres pontos:

1. **Imoveis e arquivos tecnicos preparados**
2. **Norma e modelo selecionados em Configurar Memorial**
3. **Geracao, revisao e exportacao dentro de Memorial**

Na navegacao atual, a referencia operacional para o usuario deve ser lida como **Memorial**, mesmo que parte da base tecnica interna ainda venha de fluxos mais antigos.

## Diferenca entre as telas de normas

No manual, os dois nomes abaixo precisam ser lidos de forma diferente:

- **Configurar Memorial**: tela operacional onde o usuario escolhe a norma e o modelo da sessao atual
- **Normas e Exemplos**: tela administrativa onde a equipe mantem a base de normas e modelos disponiveis para uso

## Dependencias do fluxo

Antes de gerar o memorial, o usuario deve garantir que estes dados estejam prontos:

1. **Imovel selecionado**
2. **Arquivo tecnico DXF selecionado**
3. **Norma do memorial definida**
4. **Modelo base disponivel para a geracao**

Quando houver pontos ou estacas de referencia cadastrados no imovel, eles tambem podem contribuir para aproximar o desenho de coordenadas reais no backend.

Na pratica, a selecao operacional de norma e modelo acontece em **Configurar Memorial**, enquanto a geracao e a revisao acontecem em **Memorial**.

## Configurar Memorial

A tela **Configurar Memorial** e o ponto de preparacao do memorial. Nela o usuario define a base documental que sera usada no processamento:

- escolhe a norma tecnica aplicavel ao trabalho atual
- escolhe o modelo base que orienta a estrutura do texto
- deixa a sessao pronta para que o Visualizador gere o memorial com os parametros corretos

Essa tela nao substitui a manutencao administrativa feita em **Normas e Exemplos**. Ela usa os itens que ja foram preparados e disponibilizados anteriormente.

## Memorial

A tela **Memorial** e hoje a etapa operacional mais importante para a fase final do documento. Ela e usada para:

- abrir o arquivo tecnico selecionado
- carregar a geometria do DXF
- inspecionar visualmente o desenho
- acionar a geracao do memorial
- revisar o texto retornado
- copiar o memorial em texto
- exportar o memorial em PDF

O componente de visualizacao do DXF continua sendo parte importante dessa etapa, mas o foco do usuario deve ser entendido como geracao e revisao do memorial.

Quando a geracao termina, o proprio Visualizador exibe a area **Memorial Descritivo Gerado**, com botoes de **Exportar PDF** e **Copiar Texto**.

## Comportamento atual da geracao

No fluxo mais recente:

- o backend sustenta a geometria e a ordem tecnica dos lotes
- a IA atua como redatora quando disponivel
- se houver falha de provedor ou `429 Too Many Requests`, o sistema pode cair em fallback tecnico deterministico

Isso ajuda a reduzir mistura de lotes, blocos hibridos e variacoes indevidas no fechamento do memorial.

## Cabecalho e exportacao em PDF

Uma correcao importante desta etapa foi aplicada na exportacao PDF.

Agora, quando o memorial ja inicia com `Memorial Descritivo`, a exportacao nao deve desenhar um segundo cabecalho por cima.

Na validacao operacional esperada, o topo deve permanecer com um unico bloco, contendo por exemplo:

- `Memorial Descritivo`
- `Projeto: ...`
- `Arquivo: ...`
- `Data: ...`

## Fechamento do memorial

O memorial consolidado tambem foi ajustado para:

- evitar repeticao de `DECLARACAO` por lote
- concentrar a declaracao final uma unica vez no fechamento
- manter a estrutura geral mais previsivel entre texto e PDF

## Ordem recomendada de operacao

1. **Selecionar o imovel** na area de trabalho.
2. **Selecionar um ou mais arquivos DXF**.
3. **Definir norma e modelo** em **Configurar Memorial**.
4. **Abrir Memorial** para carregar, gerar e revisar.
5. **Gerar o memorial**, revisar o texto e exportar o resultado.

## Observacao sobre a rota Memorial

O sistema pode manter nomenclaturas internas herdadas em parte do fluxo tecnico, mas para treinamento e uso diario a referencia correta deve ser **Memorial**.
