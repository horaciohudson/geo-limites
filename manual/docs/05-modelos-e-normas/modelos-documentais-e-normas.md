# Normas e Modelos Base

## Onde ficam essas configuracoes

Na secao **Configuracao** do menu lateral, a tela visivel hoje e **Normas e Exemplos**. Essa area concentra a manutencao da base documental reutilizada pela plataforma.

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

O GeoLimites nao depende mais de uma configuracao de **Pasta de Templates** no servidor para esse fluxo.

Quando um modelo base e gerado:

- o navegador tenta abrir a janela nativa para o usuario escolher onde salvar o arquivo `.json`
- se o navegador nao suportar essa integracao, o sistema faz o download classico do arquivo
- alem disso, o modelo pode permanecer no navegador para uso imediato na sessao atual

Isso evita depender de um caminho fisico configurado manualmente no backend para a geracao do modelo base.

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

A configuracao correta dessa area influencia diretamente a qualidade do memorial gerado em **Normas e Templates** e processado no **Visualizador**. Se a base documental estiver incompleta ou inadequada, o resultado final tambem perde consistencia.
