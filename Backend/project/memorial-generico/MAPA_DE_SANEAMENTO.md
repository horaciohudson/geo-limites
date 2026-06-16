# Mapa de Saneamento

## Pontos Obscuros e Acao Proposta

| ID | Ponto obscuro | Impacto | Acao proposta |
|---|---|---|---|
| PS-01 | Segredos em arquivo versionado | Alto | Migrar para ambiente e revisar bootstrap |
| PS-02 | Fluxos paralelos de geracao | Alto | Escolher um fluxo oficial e descontinuar o restante |
| PS-03 | Hardcodes de lotes, area e confrontacao | Alto | Mover inferencia tecnica para codigo e zerar valores fixos |
| PS-04 | Georreferenciamento nao validado com DXF real | Alto | Executar plano de testes com evidencias |
| PS-05 | Fallback com coordenadas ficticias | Alto | Converter em erro tecnico controlado |
| PS-06 | Associacao fraca entre propriedade e arquivo DXF | Medio | Implementar relacao persistida e refletir na API |
| PS-07 | Endpoint chamado no frontend nao existe no backend | Medio | Corrigir contrato de integracao |
| PS-08 | Documentacao dispersa e desatualizada | Medio | Centralizar neste projeto |
| PS-09 | Tela de memorial com fluxo parcial/comentado | Medio | Decidir se sera recuperada ou removida |
| PS-10 | Responsabilidade excessiva da IA sobre fatos tecnicos | Medio | Entregar estrutura tecnica pronta antes da redacao |

## Status Atual

- `PS-01` concluido na base principal: segredos sairam dos arquivos versionados centrais e o backend passou a depender de ambiente
- `PS-03` parcialmente saneado: o backend deixou de instruir a IA com lote padrao fixo `130 m2 / 5,20 x 25,00 / 60,40 m`
- `PS-05` parcialmente saneado: os prompts principais nao injetam mais coordenadas de memorial antigo nem notas de debug no texto gerado
- `PS-10` parcialmente saneado: o fluxo principal passou a orientar a IA a nao inventar medidas, confrontantes e coordenadas sem base tecnica

## O que entrou nesta fase

- `MemorialApiService` agora usa area e perimetro de referencia derivados da propriedade e do DXF quando disponiveis
- `MemorialApiService` deixou de usar a estimativa default de `25 lotes` como ancora do fluxo
- `MemorialApiService` deixou de gerar offsets artificiais de coordenadas por lote a partir de uma base SIRGAS unica
- `LegalTemplateService` deixou de carregar logradouros, confrontantes, area e perimetro do caso antigo como fallback fixo

## Pendencias da proxima passada

- fechar `PS-02` com a definicao formal de um unico fluxo oficial de geracao
- fechar `PS-05` transformando ausencia de coordenada confiavel em retorno tecnico estruturado, nao apenas orientacao de prompt
- atacar `PS-06` vinculando DXF e propriedade de forma persistida
- revisar `DxfTextExtractorService`, que ainda possui heuristicas e defaults legados do caso antigo

## Sequencia Recomendada

1. Seguranca e fluxo oficial
2. Remocao de hardcodes
3. Dominio tecnico generico
4. Teste com DXF real
5. Integracao final com frontend

## Meta de Curto Prazo

Entregar uma primeira versao que:

- use um fluxo unico
- nao invente coordenadas
- gere memorial apenas quando houver base tecnica suficiente
- permita evolucao segura para desmembramento e unificacao
