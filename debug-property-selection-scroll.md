[# OPEN] Debug: property-selection-scroll

## Sintomas (relato)
- Ao gerar o Resumo Tecnico (abre /viewer-document em nova aba), o combobox "Imovel Ativo da Operacao" na pagina 🏠 Apresentacao de Imoveis fica limpo.
- Ao gerar o Resumo Tecnico, a pagina do Resumo abre com 2 scrolls (e idealmente nao deveria ter scroll interno).

## Hipoteses (falsificaveis)
- **A**: `beforeunload` em alguma aba ainda executa `clearAppData()` e remove `selectedPropertyForMemorial`, limpando o imovel ativo.
- **B**: `PropertiesPresentation` esta limpando a selecao porque `fetchPropertiesList(...)` nao encontra o `activePropertyId` na lista e chama `clearSelectedProperty()`.
- **C**: Existe outra rotina (além de `beforeunload`) removendo `selectedPropertyForMemorial` (ex.: logout, algum handler de erro, storage event).
- **D**: O "segundo scroll" vem do `main-content` (overflow interno) no layout do documento, mesmo na rota `/viewer-document`.
- **E**: O "segundo scroll" vem de um container interno do documento (ex.: `.memorial-content`/`.viewer-page`) ainda com overflow/altura fixa.

## Plano de evidencia
1. Instrumentar eventos no frontend para reportar para o Debug Server:
   - beforeunload + clearAppData: caminho, chaves removidas, status de `selectedPropertyForMemorial`.
   - mount em `/viewer-document`: overflow/scrollHeight/clientHeight de `documentElement`, `body`, `main.main-content`.
   - fluxo `fetchPropertiesList(...)`: motivo do clear, ids, lista contem id.
2. Reproduzir:
   - Selecionar imovel na 🏠 Apresentacao de Imoveis
   - Abrir Visualizador e clicar em "Resumo Tecnico"
   - Fechar a aba do Resumo
   - Voltar na 🏠 Apresentacao de Imoveis e checar se limpou
3. Coletar logs (`GET /logs`) e confirmar/rejeitar hipoteses.

## Status
- Aguardando instrumentacao + reproducao para coletar logs.

