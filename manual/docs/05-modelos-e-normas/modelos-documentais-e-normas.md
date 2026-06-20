# Normas e Modelos Base

## Onde ficam essas configuracoes

Na secao **Configuracao** do menu lateral, a tela visivel hoje e **Normas e Exemplos**. Na interface atual, ela se apresenta como uma area de **Normas e Templates Base**, reunindo duas frentes na mesma pagina:

- cadastro e manutencao de **Normas Base**
- geracao, importacao e exclusao de **Modelos Base**

Essa nomenclatura e diferente da tela operacional **Normas e Templates**:

- **Normas e Exemplos**: cria, importa e mantem a base documental
- **Normas e Templates**: seleciona a norma e o modelo que serao usados na operacao atual

## Relacao com Pasta de Templates

Ao contrario do que um fluxo futuro mais simplificado poderia sugerir, a **Pasta de Templates** ainda participa do comportamento real da configuracao atual.

Hoje, para importar ou gerar modelos base pela tela administrativa, o sistema ainda depende de uma pasta configurada no frontend para enviar o caminho ao backend e gravar os arquivos em disco.

Na pratica:

- sem `Pasta de Templates` configurada, a tela bloqueia a importacao e a geracao de modelos base
- com a pasta configurada, o sistema tenta salvar o resultado no banco e em disco
- o navegador e o `localStorage` funcionam mais como apoio temporario ou fallback, nao como fluxo principal idealizado

## O que e feito em Normas e Exemplos

Essa tela e usada por perfis responsaveis pela padronizacao do trabalho. Nela a equipe pode:

- carregar normas em PDF para formar a base textual da plataforma
- gerar modelos base com apoio de IA a partir de arquivos PDF ou TXT
- importar modelos base prontos em JSON
- excluir normas e modelos que nao devem mais ser usados

No estado atual da interface:

- o cadastro manual completo de norma nao e a entrada principal da tela
- o caminho mais visivel para normas e o botao `Carregar Norma PDF`
- o caminho mais visivel para modelos e o botao `Gerar/Importar Modelo (JSON/PDF/TXT)`

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

Antes de usar esses fluxos, confirme se a `Pasta de Templates` esta configurada, porque a tela atual exige esse caminho para enviar o destino de gravacao ao backend.

## Como o salvamento funciona hoje

Quando um modelo base e gerado:

- o frontend envia o arquivo de exemplo e o `targetFolderPath` para o backend
- o backend tenta salvar o resultado no banco de dados e gravar em disco no caminho configurado
- se houver falha parcial, o navegador ainda pode manter copia temporaria em `localStorage`
- a tela recarrega a lista combinando itens persistidos e eventuais apoios locais

Por isso, a documentacao operacional atual deve considerar a `Pasta de Templates` como parte ativa do processo, e nao apenas como detalhe legado de compatibilidade.

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
- a geracao de modelos base ainda depende de `Pasta de Templates` configurada para gravacao em disco
