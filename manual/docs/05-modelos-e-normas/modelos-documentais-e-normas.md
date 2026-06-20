# Normas e Modelos Base

## Onde ficam essas configuracoes

Na secao **Configuracao** do menu lateral, a tela visivel hoje e **Normas e Exemplos**. Em alguns contextos administrativos, a area de **Pasta de Templates** tambem pode aparecer por compatibilidade operacional. O centro do fluxo documental, porem, continua em **Normas e Exemplos**.

Essa nomenclatura e diferente da tela operacional **Normas e Templates**:

- **Normas e Exemplos**: cria, importa e mantem a base documental
- **Normas e Templates**: seleciona a norma e o modelo que serao usados na operacao atual

## O que e feito em Normas e Exemplos

Essa tela e usada por perfis responsaveis pela padronizacao do trabalho. Nela a equipe pode:

- carregar normas em PDF para formar a base textual da plataforma
- gerar modelos base com apoio de IA a partir de arquivos PDF ou TXT
- importar modelos base prontos em JSON
- excluir normas e modelos que nao devem mais ser usados

## Normas base

As normas base servem como referencia tecnica para a geracao dos memoriais. Em termos praticos, essa area prepara o texto normativo e o prompt estrutural que o sistema usa depois no fluxo operacional.

Uma norma bem cadastrada ajuda a manter:

- terminologia correta
- estrutura coerente
- aderencia ao padrao tecnico esperado

## Modelos base

Um **modelo base** representa a estrutura documental que a equipe deseja entregar. Ele pode refletir exigencias de cartorio, prefeitura, municipio ou um padrao interno da empresa.

No fluxo atual, os modelos podem nascer de tres formas:

- **Importacao de JSON**: quando a equipe ja possui um modelo estruturado
- **Geracao por IA a partir de PDF**: quando existe um memorial de exemplo em PDF
- **Geracao por IA a partir de TXT**: quando existe um exemplo textual simples

## Como o salvamento funciona hoje

O GeoLimites nao depende da **Pasta de Templates** como fluxo principal para gerar modelos base.

Quando um modelo base e gerado:

- o navegador tenta abrir a janela nativa para o usuario escolher onde salvar o arquivo `.json`
- se o navegador nao suportar essa integracao, o sistema faz o download classico do arquivo
- alem disso, o modelo pode permanecer no navegador para uso imediato na sessao atual

Isso evita depender de um caminho fisico configurado manualmente no backend para a geracao do modelo base, mesmo que a area de `Pasta de Templates` continue visivel por compatibilidade ou organizacao administrativa.

## Quando usar um modelo diferente

- quando a prefeitura ou cartorio exige um formato especifico
- quando o municipio possui ordem propria de informacoes
- quando a empresa quer manter um padrao interno de apresentacao

## Recomendacoes de governanca

- padronizar nomes de normas e modelos
- evitar duplicidade de modelos com pequenas variacoes sem controle
- revisar periodicamente as normas ativas
- testar o modelo antes de liberar para uso operacional amplo
- explicitar versao, municipio ou orgao no nome quando houver variacoes

## Relacao com a geracao do memorial

A configuracao correta dessa area influencia diretamente a qualidade do memorial gerado no fluxo operacional, que passa por **Normas e Templates** e depois pelo **Visualizador**. Se a base documental estiver incompleta ou inadequada, o resultado final tambem perde consistencia.

No fluxo mais recente, vale lembrar:

- a base documental orienta a redacao
- a geometria e a ordem tecnica ficam sustentadas pelo backend
- quando a IA falha temporariamente, o sistema pode recorrer ao fallback tecnico para manter a operacao
