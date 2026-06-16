# Criterios de Aceite

## 1. Fluxo Oficial

O backend atende este criterio quando:

- existe um unico endpoint oficial para geracao de memorial
- o contrato de entrada e saida esta documentado
- o frontend nao depende de endpoints inexistentes ou codigo paralelo

## 2. Seguranca de Configuracao

O backend atende este criterio quando:

- nenhum segredo sensivel esta versionado em arquivo fonte
- a aplicacao sobe com configuracao documentada por ambiente
- falhas de configuracao retornam mensagem clara

## 3. Extracao Geometrica

O backend atende este criterio quando:

- vertices e segmentos sao extraidos de forma consistente
- area e perimetro usados no memorial nao dependem de valor fixo
- o pipeline identifica quando a geometria e insuficiente

## 4. Georreferenciamento

O backend atende este criterio quando:

- a coordenada base e obtida de DXF real ou declarada como nao confiavel
- nao ha uso de coordenadas ficticias no fluxo principal
- a saida final informa apenas coordenadas validadas

## 5. Genericidade do Memorial

O backend atende este criterio quando:

- a quantidade de lotes e derivada dos dados ou informada explicitamente
- nao existem pressupostos fixos de area, largura, profundidade ou confrontacao
- o tipo de operacao influencia a geracao do texto final

## 6. Integracao com Propriedade

O backend atende este criterio quando:

- a propriedade associada ao memorial e resolvida de forma consistente
- os arquivos DXF relacionados aparecem nos dados da propriedade
- `propertyId` e `standardId` chegam ao backend sem ambiguidade

## 7. Observabilidade

O backend atende este criterio quando:

- cada etapa relevante do pipeline gera log tecnico util
- erros sao rastreaveis por request ou sessao
- e possivel diferenciar erro de geometria, erro de configuracao e erro de IA

## 8. Homologacao Tecnica

O backend atende este criterio quando:

- passa em teste com pelo menos um DXF georreferenciado real
- passa em teste com pelo menos um caso de desmembramento
- passa em teste com pelo menos um caso de unificacao
- as evidencias de teste ficam registradas

## Definicao de Pronto

Este projeto sera considerado pronto para a proxima fase quando:

- os itens P0 estiverem concluídos
- houver evidencia de processamento real de DXF georreferenciado
- o memorial final nao depender de fallback ficticio
- a equipe conseguir apontar sem duvida qual e o fluxo oficial do sistema
