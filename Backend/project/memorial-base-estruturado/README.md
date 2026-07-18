# Projeto Memorial Base Estruturado

## Objetivo

Criar uma base tecnica estruturada para a geracao de memoriais no GeoLimites, de forma que:

- o backend consolide os fatos geometricos antes da redacao
- a IA fique responsavel apenas pela dissertacao
- o sistema consiga validar o texto final contra os dados tecnicos
- o memorial final continue salvo em arquivo
- o banco armazene apenas a estrutura tecnica intermediaria e os metadados da geracao

## Problema que este projeto resolve

Hoje o sistema ja conhece muitos dados tecnicos do lote:

- area
- perimetro
- vertices
- segmentos
- rumos
- confrontacoes

Mesmo assim, o memorial final ainda pode:

- trocar lados
- narrar segmentos de forma inconsistente
- divergir do perimetro total
- variar demais de estilo entre lotes
- depender da IA para descobrir fatos que o backend ja conhece

## Resultado esperado

Ao final deste projeto, a geracao deve seguir este fluxo:

1. o backend extrai e organiza os fatos tecnicos do lote
2. o backend gera um `memorial_base_json`
3. a IA recebe apenas essa base estruturada para redigir
4. o sistema valida a saida da IA contra os dados tecnicos
5. o sistema salva o memorial final em arquivo

## Principios

### 1. Geometria antes de redacao

A geometria deve ser calculada em codigo, nao inferida pela IA.

### 2. IA como redatora

A IA nao deve inventar:

- confrontante
- medida
- rumo
- ordem de vertices
- area
- perimetro

### 3. Banco para rastreabilidade tecnica

O banco deve guardar a estrutura tecnica inicial, nao necessariamente o texto intermediario da IA.

### 4. Memorial final como artefato entregue

O texto final continua salvo em arquivo, como ja ocorre hoje.

## Escopo da primeira versao

### Entra nesta primeira versao

- definicao do formato `memorial_base_json`
- geracao deterministica por lote
- persistencia da base tecnica no banco
- envio da base tecnica para a IA
- validacoes minimas da saida final

### Nao entra nesta primeira versao

- reescrita completa do georreferenciamento
- nova tela rica de operacao
- substituicao total do fluxo atual de uma vez
- gravacao do texto intermediario da IA no banco

## Estrutura inicial sugerida

O `memorial_base_json` deve guardar pelo menos:

- identificacao do projeto
- identificacao do arquivo
- data da geracao
- lote
- area
- perimetro
- lista de vertices
- lista de segmentos
- confrontacoes consolidadas por direcao
- observacoes tecnicas
- flags de confianca

Exemplo resumido:

```json
{
  "projeto": "12345",
  "arquivo": "teste.dxf",
  "lote": "16",
  "area_m2": 162.46,
  "perimetro_m": 37.13,
  "vertices": ["V01", "V02", "V03", "V04"],
  "segmentos": [
    {
      "de": "V01",
      "para": "V02",
      "distancia_m": 5.20,
      "rumo": "N 47°11' W",
      "confrontante": "RUA MARIA IVANI DA SILVA"
    }
  ],
  "confrontacoes": {
    "norte": ["RUA TEREZINHA ONOFRE LIMA"],
    "sul": ["RUA MARIA IVANI DA SILVA"],
    "leste": ["RUA SDO 31"],
    "oeste": ["DIVISA INTERNA DO LOTEAMENTO"]
  }
}
```

## Persistencia recomendada

Persistir no banco:

- `project_id`
- `file_id`
- `lote`
- `memorial_base_json`
- `status_geracao`
- `versao_pipeline`
- `created_at`

Nao persistir no banco:

- texto intermediario da IA

Persistir em arquivo:

- memorial final entregue ao usuario

## Fases de execucao

## Fase 1 - Modelagem

- mapear os dados tecnicos que o backend ja produz
- definir o contrato do `memorial_base_json`
- decidir onde isso sera persistido

Entregavel:

- DTO ou modelo Java da base tecnica

## Fase 2 - Geracao deterministica

- montar a base tecnica por lote sem IA
- separar claramente fatos tecnicos de texto final
- garantir consistencia de vertices, lados e perimetro

Entregavel:

- gerador tecnico interno confiavel

## Fase 3 - Integracao com IA

- enviar a base estruturada para a IA
- restringir o prompt para redacao
- impedir invencao de dados

Entregavel:

- prompt orientado por fatos tecnicos

## Fase 4 - Validacao

- conferir se os numeros do texto final batem com a base
- bloquear memorial com divergencia critica
- registrar erros tecnicos de forma auditavel

Entregavel:

- validacao minima automatica da saida

## Fase 5 - Adocao gradual

- aplicar primeiro em um fluxo controlado
- comparar memorial atual versus memorial baseado em estrutura
- liberar por configuracao ou feature flag

Entregavel:

- entrada segura em producao

## Backlog inicial

### MBE-001 - Inventariar fatos tecnicos atuais

- localizar onde area, perimetro, vertices e confrontacoes nascem
- listar o que ja e confiavel
- listar o que ainda vem misturado com texto

### MBE-002 - Criar contrato do memorial base

- definir DTO ou modelo interno
- padronizar nomes de campos
- prever lotes com segmentos compostos

### MBE-003 - Persistir base tecnica

- criar entidade ou tabela para armazenar `memorial_base_json`
- vincular ao projeto e ao arquivo
- registrar versao do pipeline

### MBE-004 - Separar redacao da geometria

- impedir que a IA calcule geometria
- enviar apenas fatos consolidados
- manter o memorial final salvo em arquivo

### MBE-005 - Validar consistencia do resultado

- comparar perimetro total com segmentos narrados
- comparar confrontacoes narradas com confrontacoes tecnicas
- sinalizar lotes com confianca baixa

## Criterios de aceite

- o backend consegue gerar `memorial_base_json` sem IA
- a IA recebe apenas a base estruturada para redigir
- o sistema nao grava o texto intermediario da IA no banco
- o memorial final continua salvo em arquivo
- pelo menos um caso real passa com texto coerente e sem divergencia numerica critica

## Primeira sprint recomendada

- `MBE-001`
- `MBE-002`
- `MBE-003`

## Observacao final

Este projeto nao elimina a IA.

Ele muda o papel dela:

- antes: tentava descobrir a estrutura do memorial
- depois: apenas redige com base em fatos tecnicos consolidados
