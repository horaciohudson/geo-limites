-- Script para processamento em lotes menores
-- Gera apenas 5 lotes por vez para evitar timeout

UPDATE tab_memorial_standards 
SET prompt_template = 'Gere memorial NBR-17047 APENAS para os primeiros 5 lotes:

MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA
Terreno: Urbano | Proprietário: [NOME] | Localização: [RUA] | Município: [CIDADE]

SITUAÇÃO ANTES: TERRENO 1 - área total [ÁREA]m², perímetro [PERÍMETRO]m

__________________________________________
SITUAÇÃO DEPOIS (APENAS LOTES 1-5):

LOTE 1: Imóvel urbano, [RUA], [CIDADE], pontos P01 (coordenadas E XXX.XXm e N XXX.XXm), P02 (coordenadas E XXX.XXm e N XXX.XXm), perímetro XX,XXm, área XX,XXm², confrontações: AO NORTE [DESC], AO SUL [DESC], AO LESTE [DESC], AO OESTE [DESC].

LOTE 2: [MESMO FORMATO]
LOTE 3: [MESMO FORMATO]  
LOTE 4: [MESMO FORMATO]
LOTE 5: [MESMO FORMATO]

[CONTINUAR APENAS ATÉ LOTE 5]

OBSERVAÇÃO: Memorial parcial - primeiros 5 lotes de [TOTAL] lotes detectados.',
    updated_at = CURRENT_TIMESTAMP
WHERE standard_id = '12fb339a-89ce-457c-8292-b0109de2a1f1';

-- Verificar
SELECT 
    standard_id,
    name,
    LEFT(prompt_template, 300) as prompt_preview,
    updated_at
FROM tab_memorial_standards 
WHERE standard_id = '12fb339a-89ce-457c-8292-b0109de2a1f1';