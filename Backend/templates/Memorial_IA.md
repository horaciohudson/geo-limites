# Memorial IA Canonico

Este arquivo substitui as tentativas misturadas anteriores e serve como referencia legivel para o formato esperado da IA.

## Regra Principal

A IA deve produzir um unico formato coerente por vez, de acordo com o tipo de memorial:

- `desmembramento`: usa `cabecalho`, `situacao_antes`, `situacao_depois` e `declaracao_final`
- `lote individual`: usa `cabecalho`, `situacao_depois` e `declaracao_final`, sem bloco de situacao antes

A IA nunca deve:

- misturar varias versoes do mesmo memorial no mesmo arquivo
- incluir `\n` literais, comentarios HTML ou avisos de geracao incompleta
- copiar links de validacao, manifesto de assinaturas ou textos de PDF assinado
- deixar placeholders vagos como `[BAIRRO]`, `[especificada]`, `[Data da elaboracao]`

## Estrutura Canonica Para Desmembramento

### Cabecalho

```text
MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE AREA
Terreno: {{tipo_imovel}}
Proprietario: {{proprietario}}
Localizacao: {{logradouro_principal}} | Bairro: {{bairro}} | Municipio: {{municipio_uf}}
Objetivo: {{objetivo_tecnico}}
```

### Situacao Antes

```text
SITUACAO ANTES DESTE DESMEMBRAMENTO DE AREA
TERRENO 1
Um imovel {{tipo_imovel_minusculo}}, localizado na {{logradouro_principal_maiusculo}}, bairro {{bairro}}, {{municipio_uf}}, possuindo formato poligonal e {{forma_terreno}}, conforme seus pontos {{vertices_terreno_original}}, perfazendo assim, um perimetro de {{perimetro_terreno_original}} ({{perimetro_terreno_original_extenso}}), com uma area territorial total de {{area_terreno_original}} ({{area_terreno_original_extenso}}), com as seguintes medidas e confrontacoes:
AO NORTE: {{confrontacao_norte_terreno_original}}
AO SUL: {{confrontacao_sul_terreno_original}}
AO LESTE: {{confrontacao_leste_terreno_original}}
AO OESTE: {{confrontacao_oeste_terreno_original}}
```

### Situacao Depois

```text
SITUACAO DEPOIS DESTE DESMEMBRAMENTO DE AREA
{{lotes_resultantes}}
```

### Declaracao Final

```text
DECLARACAO
Declaro para todos os fins e efeitos de direito que o levantamento topografico respeitou as divisas consolidadas e o alinhamento do logradouro publico, importando sujeitar-se ao que dispoe o paragrafo 14 do artigo 213 da LRP.
{{cidade_assinatura}}, {{data_assinatura}}.
_________________________________________________
{{responsavel_tecnico}} | CREA/{{uf_crea}}: {{numero_crea}} | RNP: {{numero_rnp}}
```

## Estrutura Canonica Para Lote Individual

### Cabecalho

```text
MEMORIAL DESCRITIVO DE LOTE INDIVIDUAL
Identificacao do imovel: {{identificacao_imovel}}
Proprietario: {{proprietario}}
CPF/CNPJ: {{cpf_cnpj}}
Localizacao: {{logradouro}} | Bairro: {{bairro}} | Municipio: {{municipio_uf}}
Matricula: {{matricula}}
Finalidade: {{finalidade_memorial}}
```

### Corpo

```text
LOTE {{numero_lote}}
Um imovel {{tipo_imovel_minusculo}}, localizado na {{logradouro}}, bairro {{bairro}}, {{municipio_uf}}, possuindo formato poligonal, conforme seus pontos {{vertices_lote}}, perfazendo assim, um perimetro de {{perimetro_lote}} ({{perimetro_lote_extenso}}), com uma area territorial de {{area_lote}} ({{area_lote_extenso}}), com as seguintes medidas e confrontacoes:
AO NORTE: {{confrontacao_norte_lote}}
AO SUL: {{confrontacao_sul_lote}}
AO LESTE: {{confrontacao_leste_lote}}
AO OESTE: {{confrontacao_oeste_lote}}
```

### Fechamento

```text
DECLARACAO FINAL
Este memorial descritivo foi elaborado em conformidade com {{norma_referencia}}, utilizando o sistema de referencia {{sistema_referencia}}. {{observacao_tecnica_final}}
{{cidade_assinatura}}, {{data_assinatura}}.
_________________________________________________
{{responsavel_tecnico}} | CREA/{{uf_crea}}: {{numero_crea}} | RNP: {{numero_rnp}}
```

## Arquivos Canonicos Relacionados

- `Backend/templates/Memorial_Canonico_Desmembramento.json`
- `Backend/templates/Memorial_Canonico_Lote_Individual.json`
- `Backend/templates/Memorial_Original.md`

## Uso Recomendado

- usar `Memorial_Original.md` como referencia de linguagem cartorial
- usar os arquivos canonicos `.json` como referencia estrutural
- recriar templates salvos da IA a partir desses dois modelos, e nao do conteudo misturado antigo