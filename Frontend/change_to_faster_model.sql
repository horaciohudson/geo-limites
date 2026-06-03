-- Script para trocar temporariamente para modelo mais rápido
-- Execute no banco PostgreSQL para teste

-- Verificar configuração atual
SELECT 
    name,
    prompt_template,
    created_at,
    updated_at
FROM tab_memorial_standards 
WHERE standard_id = '12fb339a-89ce-457c-8292-b0109de2a1f1';

-- Atualizar para prompt ainda mais simples para teste
UPDATE tab_memorial_standards 
SET prompt_template = 'Gere memorial descritivo NBR-17047:

MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA
Terreno: Urbano | Proprietário: [NOME] | Localização: [RUA] | Município: [CIDADE]
Objetivo: Desmembramento de área urbana.

SITUAÇÃO ANTES: TERRENO 1 - [DESCRIÇÃO_SIMPLES]
__________________________________________
SITUAÇÃO DEPOIS:

LOTE 1: Imóvel urbano, [RUA], [CIDADE], pontos P01 (E XXX.XXm N XXX.XXm), P02 (E XXX.XXm N XXX.XXm), perímetro XX,XXm, área XX,XXm², confrontações: NORTE [DESC], SUL [DESC], LESTE [DESC], OESTE [DESC].

Repita para todos os lotes.

DECLARAÇÃO: Levantamento conforme NBR-17047.
[CIDADE], [DATA]
[RESPONSÁVEL]',
    updated_at = CURRENT_TIMESTAMP
WHERE standard_id = '12fb339a-89ce-457c-8292-b0109de2a1f1';

-- Verificar se foi atualizado
SELECT 
    standard_id,
    name,
    LEFT(prompt_template, 200) as prompt_preview,
    updated_at
FROM tab_memorial_standards 
WHERE standard_id = '12fb339a-89ce-457c-8292-b0109de2a1f1';