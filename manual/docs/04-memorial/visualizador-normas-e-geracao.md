# Normas, Visualizador e Geracao

## Visao geral do fluxo atual

No produto atual, o fluxo principal do memorial passa por tres pontos:

1. **Imoveis e arquivos tecnicos preparados**
2. **Norma e modelo selecionados em Normas e Templates**
3. **Geracao, revisao e exportacao dentro do Visualizador**

A antiga ideia de usar uma pagina separada chamada **Memorial** como etapa final nao representa mais o uso principal mostrado na navegacao atual.

## Dependencias do fluxo

Antes de gerar o memorial, o usuario deve garantir que estes dados estejam prontos:

1. **Imovel selecionado**
2. **Arquivo tecnico DXF selecionado**
3. **Norma do memorial definida**
4. **Modelo base disponivel para a geracao**

Na pratica, a selecao operacional de norma e modelo acontece na area **Normas e Templates**, enquanto a geracao e a revisao acontecem no **Visualizador**.

## Normas e Templates

A tela **Normas e Templates** e o ponto de preparacao do memorial. Nela o usuario define a base documental que sera usada no processamento:

- escolhe a norma tecnica aplicavel ao trabalho atual
- escolhe o modelo base que orienta a estrutura do texto
- deixa a sessao pronta para que o Visualizador gere o memorial com os parametros corretos

## Visualizador

O **Visualizador** e hoje a tela operacional mais importante para a etapa final do documento. Ele e usado para:

- abrir o arquivo tecnico selecionado
- carregar a geometria do DXF
- inspecionar visualmente o desenho
- acionar a geracao do memorial
- revisar o texto retornado
- copiar o memorial em texto
- exportar o memorial em PDF

Quando a geracao termina, o proprio Visualizador exibe a area **Memorial Descritivo Gerado**, com botoes de **Exportar PDF** e **Copiar Texto**.

## Ordem recomendada de operacao

1. **Selecionar o imovel** na area de trabalho.
2. **Selecionar um ou mais arquivos DXF**.
3. **Definir norma e modelo** em **Normas e Templates**.
4. **Abrir o Visualizador** para carregar o desenho.
5. **Gerar o memorial**, revisar o texto e exportar o resultado.

## Observacao sobre a rota Memorial

O sistema ainda pode manter a rota `/memorial` por compatibilidade interna, mas ela nao e a referencia principal de operacao no menu atual. Para treinamento e uso diario, considere o **Visualizador** como a tela correta para gerar, revisar e exportar o memorial.
