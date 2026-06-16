# Imoveis, Cadastro e Arquivos DXF

## Onde esse fluxo aparece no menu

No menu lateral atual, esse fluxo esta distribuido entre **Operacao** e **Preparacao**:

- **Imoveis**: entrada principal para consultar e selecionar os imoveis do trabalho atual.
- **Arquivos DXF**: area para envio e selecao dos arquivos tecnicos do projeto.
- **Cadastrar Imovel**: entrada complementar para criar ou concluir o cadastro de um novo imovel.

## Etapa 1: Imoveis

A area **Imoveis** e o ponto de partida para selecionar o trabalho que sera processado e validar se o cadastro da propriedade esta pronto.

### Cadastro em Etapas e Rascunho
A preparacao detalhada do imovel acontece no fluxo de cadastro, feito de forma assistida em abas:
- **Dados Basicos**, **Proprietarios** (soma de participacao deve ser 100%), **Documentos** e **Arquivos**.
- Enquanto o usuario preenche os campos, o sistema realiza **salvamento automatico** a cada segundo de inatividade.
- **Salvar Rascunho**: O usuario pode clicar a qualquer momento no botao **📝 Salvar Rascunho** (na barra inferior ou na aba de Resumo) para forcar a gravacao do rascunho localmente no navegador (basta preencher o campo Numero de Registro).
- **Salvar Imovel na Base**: O botao **💾 Salvar Imovel** envia os dados para o banco de dados principal. Ele so fica ativo quando todas as abas obrigatorias estiverem preenchidas (100% de progresso).

## Etapa 2: Arquivos DXF

Em **Arquivos DXF**, o usuario seleciona e organiza os arquivos DXF ou DWG que serao processados pela ferramenta.

## Relacao entre as etapas

Essas duas telas andam juntas:
- O imovel preparado fornece o contexto juridico (proprietarios, matricula, etc.).
- Os arquivos tecnicos fornecem os dados geometricos e graficos.

Depois disso, o usuario segue para **Normas e Templates** e entao para o **Visualizador**, onde a geracao do memorial acontece de fato.

## Boa pratica operacional

Antes de seguir para a operacao, confirme em **Resumo**:
1. Se todos os dados basicos e proprietarios estao preenchidos corretamente.
2. Se o imovel foi salvo no banco via botao **Salvar Imovel**.
3. Se os arquivos tecnicos necessarios foram selecionados em **Arquivos DXF**.
4. Se o imovel correto esta selecionado para a sessao atual.

## Sinal importante do sistema

O menu mostra contagem de arquivos selecionados em **Arquivos DXF**, o que ajuda a validar rapidamente se ha material suficiente para continuar.
