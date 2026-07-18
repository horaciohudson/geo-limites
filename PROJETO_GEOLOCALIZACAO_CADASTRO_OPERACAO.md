# Projeto Enxuto: Geolocalizacao no Cadastro e Uso em Operacao

## Objetivo

Reorganizar o fluxo do sistema para que o arquivo tecnico do imovel seja cadastrado uma unica vez no contexto correto, com extracao e persistencia dos pontos de referencia no cadastro do imovel, deixando a area de operacao apenas como consumidora desses dados.

## Problema Atual

- O upload de DXF foi misturado entre `Cadastro de Imoveis` e `Operacao > Arquivos DXF`.
- A extracao dos pontos `P1`, `P55`, etc. foi deslocada para a area operacional, que nao representa o cadastro estrutural do imovel.
- O usuario pode acabar subindo o mesmo arquivo duas vezes, uma no cadastro e outra na operacao.
- O georreferenciamento e o memorial ficam dependentes de um fluxo confuso e pouco confiavel.

## Fluxo Desejado

### 1. Cadastro de Imoveis

- O usuario abre `Cadastro de Imoveis`.
- Na aba `Arquivos`, envia o DXF tecnico do imovel.
- O sistema:
  - salva o arquivo tecnico vinculado ao imovel;
  - extrai os pontos nomeados do DXF;
  - preenche a grade de landmarks/pontos de referencia;
  - persiste esses pontos junto do cadastro do imovel.

### 2. Operacao

- O usuario abre `Operacao`.
- O sistema lista apenas os arquivos tecnicos ja vinculados ao imovel selecionado.
- O usuario apenas escolhe qual arquivo usar.
- A operacao nao faz novo upload do DXF.
- O viewer, o georreferenciamento e o memorial usam o arquivo e os landmarks ja cadastrados.

## Regra Central

O DXF tecnico deve nascer no cadastro do imovel e ser reutilizado na operacao. A operacao nao deve criar um segundo cadastro tecnico do mesmo arquivo.

## Escopo da Mudanca

### Frente 1. Cadastro

- Manter o upload do DXF apenas em `Cadastro de Imoveis > Arquivos`.
- Garantir extracao automatica dos landmarks no upload.
- Garantir persistencia dos landmarks no imovel.
- Garantir vinculo claro entre imovel e arquivo tecnico principal.

### Frente 2. Operacao

- Remover a necessidade de novo upload em `Operacao > Arquivos DXF`.
- Exibir apenas arquivos ja cadastrados para o imovel.
- Permitir selecao do arquivo para visualizacao e processamento.
- Reaproveitar landmarks ja salvos no cadastro.

### Frente 3. Geolocalizacao

- Usar os landmarks persistidos do imovel como base unica do georreferenciamento.
- Aplicar o transform no fluxo de viewer e memorial sem depender de nova digitacao.
- Garantir minimo de 2 pontos validos para georreferenciamento.

## Entregas

### Entrega A. Separacao de Fluxos

- `Cadastro` responsavel por upload tecnico e pontos.
- `Operacao` responsavel por selecao e uso.

### Entrega B. Fonte de Verdade

- O imovel passa a ser a fonte de verdade de:
  - arquivo DXF tecnico;
  - landmarks;
  - coordenadas usadas na geolocalizacao.

### Entrega C. Reuso no Viewer e Memorial

- O viewer usa o arquivo do cadastro.
- O memorial usa os landmarks e o transform derivados do cadastro.

## Sequencia de Implementacao

### Etapa 1. Limpeza do Frontend

- Retirar da tela `Operacao > Arquivos DXF` o comportamento de importar pontos para cadastro.
- Ajustar os textos e a interface para deixar claro que a tela e operacional.
- Reforcar `Cadastro de Imoveis > Arquivos` como ponto de entrada do DXF do imovel.

### Etapa 2. Vinculo do Arquivo ao Imovel

- Garantir que o arquivo enviado no cadastro fique associado ao imovel.
- Expor esse vinculo para a tela de operacao.

### Etapa 3. Landmarks no Cadastro

- Fechar o fluxo `upload DXF -> extracao -> grade -> persistencia`.
- Validar que os pontos reaparecem ao reabrir o cadastro.

### Etapa 4. Selecao em Operacao

- Listar os arquivos do imovel sem novo upload.
- Permitir apenas selecao do arquivo a ser usado.

### Etapa 5. Geolocalizacao e Memorial

- Usar exclusivamente os landmarks persistidos no imovel.
- Verificar criacao do transform.
- Validar que o memorial deixa de cair para `verticesGeorreferenciados=false` quando houver matches validos.

## Criterios de Aceite

- O usuario sobe o DXF apenas no cadastro do imovel.
- Os pontos `P1`, `P55` e demais landmarks sao extraidos no cadastro.
- Os pontos ficam salvos e reaparecem ao editar o imovel.
- Em operacao, o usuario apenas seleciona um arquivo ja cadastrado.
- O viewer usa o mesmo arquivo do cadastro.
- O memorial usa o mesmo conjunto de landmarks do cadastro.
- Nao existe duplicidade de upload do mesmo DXF entre cadastro e operacao.

## Riscos Conhecidos

- O DXF pode nao expor os textos `P1`, `P55`, etc. da forma esperada pelo backend.
- Pode ser necessario um segundo ajuste no extrator para reconhecer a origem correta das ancoras.
- O vinculo entre `landmarks`, `transform` e `memorial_base_json` ainda precisa ser fechado ponta a ponta.

## Proximo Passo Imediato

Executar primeiro a `Etapa 1. Limpeza do Frontend`, removendo da area de operacao tudo que hoje tenta cumprir papel de cadastro do imovel.
