# Testes DXF Georreferenciado

## Objetivo

Validar de forma pratica se o backend consegue processar um arquivo DXF real georreferenciado sem depender de:

- coordenadas ficticias
- area fixa
- confrontacoes padrao hardcoded
- notas de debug no memorial final

## Arquivos de Teste

Separar pelo menos um arquivo por categoria:

- desmembramento georreferenciado real
- unificacao georreferenciada real
- caso limite com metadados incompletos

## Pre-condicoes

- backend sobe sem segredos hardcoded
- usuario autenticado disponivel para testes
- propriedade de teste cadastrada
- normas e template definidos
- logs habilitados para diagnostico tecnico

## Roteiro de Teste

### T1 - Extracao da Coordenada Base

- enviar o arquivo para endpoint de debug ou pipeline tecnico
- verificar se existe coordenada base
- registrar a fonte da coordenada

Esperado:

- coordenada valida retornada com origem identificada

### T2 - Extracao Vetorial

- listar entidades relevantes do DXF
- validar vertices, segmentos e textos
- confirmar que area e perimetro nao estao vindo de valor fixo

Esperado:

- geometria suficiente para memorial

### T3 - Associacao com Propriedade

- garantir que o `propertyId` correto chega ao backend
- confirmar uso dos dados da propriedade no pipeline

Esperado:

- memorial referencia a propriedade correta

### T4 - Geracao do Memorial

- executar o fluxo oficial
- inspecionar o memorial final

Esperado:

- sem coordenadas ficticias
- sem notas de debug
- sem area fixa indevida
- sem quantidade de lotes presumida

### T5 - Falha Controlada

- repetir com arquivo que nao possua base georreferenciada confiavel

Esperado:

- backend nao inventa coordenadas
- sistema retorna erro tecnico claro ou baixa confianca documentada

## Evidencias a Registrar

- nome do arquivo testado
- data e hora
- endpoint utilizado
- coordenada base encontrada ou motivo da falha
- quantidade de entidades processadas
- area e perimetro obtidos
- memorial final gerado
- logs tecnicos relevantes

## Regra de Aprovacao

O teste sera considerado aprovado quando:

- a coordenada usada no memorial puder ser rastreada ao DXF
- os valores tecnicos forem coerentes com o desenho
- nao houver fallback ficticio no fluxo oficial
- a saida final refletir o tipo real da operacao
