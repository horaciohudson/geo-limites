# Visualizador, Normas e Geracao

## Dependencias do fluxo

Pelo comportamento atual do sistema, a geracao do memorial depende de quatro condicoes principais:

1. haver arquivos selecionados
2. haver dados tecnicos carregados
3. haver pelo menos uma norma aplicada
4. haver um modelo documental selecionado

## Normas Aplicadas

A tela `Normas Aplicadas` e usada para escolher as normas que participarao da geracao do resultado.

## Visualizador

O `Visualizador` serve para abrir os arquivos selecionados e carregar os dados necessarios para o fluxo tecnico.

## Gerar Memorial

O botao `Gerar Memorial` fica no menu lateral. Quando algum requisito nao foi cumprido, o sistema bloqueia a acao e informa o que falta.

## Ordem recomendada

1. Selecionar o imovel.
2. Selecionar os arquivos tecnicos.
3. Escolher as normas aplicadas.
4. Abrir o visualizador.
5. Confirmar o modelo documental.
6. Acionar `Gerar Memorial`.

## Se o sistema impedir a geracao

Os motivos mais provaveis sao:

- nenhum arquivo selecionado
- dados tecnicos ainda nao carregados
- normas nao escolhidas
- modelo documental nao definido

## Resultado esperado

Quando o fluxo esta completo, o usuario chega a pagina de memorial com os dados necessarios para continuar a elaboracao e revisao do documento.
