-- Script para atualizar o prompt_template da norma NBR-17047
-- Execute este script no banco de dados PostgreSQL

UPDATE tab_memorial_standards 
SET prompt_template = 'Gere memorial NBR-17047 formato cartorial:

MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA
Terreno: Urbano | Proprietário: [NOME] | Localização: [RUA] | Bairro: [BAIRRO] | Município: [CIDADE]/[UF]
Objetivo: Levantamento Topográfico Planimétrico georreferenciado Datum Sirgas 2000 para desmembramento.

SITUAÇÃO ANTES DESTE DESMEMBRAMENTO DE ÁREA
TERRENO 1
Um imóvel urbano, localizado na [RUA], bairro [BAIRRO], [CIDADE]/[UF], formato poligonal irregular, pontos [COORDENADAS], perímetro [PERÍMETRO]m ([EXTENSO]), área [ÁREA]m² ([EXTENSO]), confrontações:
AO NORTE: [DESC] AO SUL: [DESC] AO LESTE: [DESC] AO OESTE: [DESC]

__________________________________________
SITUAÇÃO DEPOIS DESTE DESMEMBRAMENTO DE ÁREA

Para cada lote use:
LOTE X:
Um imóvel urbano, localizado na [RUA], bairro [BAIRRO], [CIDADE]/[UF], formato poligonal, pontos P01 (coordenadas E XXX.XXm e N XXX.XXm), P02 (coordenadas E XXX.XXm e N XXX.XXm), perímetro XX,XXm ([extenso]), área XX,XXm² ([extenso]), confrontações:
AO NORTE: (fundos), sentido Oeste-Leste, distância X,XXm ([extenso]), ponto PX ao PX, limita [VIZINHO].
AO SUL: (frente), sentido Oeste-Leste, distância X,XXm ([extenso]), ponto PX ao PX, limita [RUA].
AO LESTE: (lateral esquerda), sentido Sul-Norte, distância X,XXm ([extenso]), ponto PX ao PX, limita [VIZINHO].
AO OESTE: (lateral direita), sentido Sul-Norte, distância X,XXm ([extenso]), ponto PX ao PX, limita [VIZINHO].
------------------------------------------------------------------------------------------------------------------------------

TERMINE COM:
__________________________________________
DECLARAÇÃO
Declaro que o levantamento respeitou divisas e alinhamento público, sujeitando-se ao § 14, art. 213, LRP. Se não verdadeiros os fatos, responderão requerente e profissional pelos prejuízos.
[CIDADE], [DATA].
_________________________________________________
[RESPONSÁVEL] | [REGISTRO]',
    updated_at = CURRENT_TIMESTAMP
WHERE standard_id = '12fb339a-89ce-457c-8292-b0109de2a1f1'
  AND name = 'NBR ABNT-NBR-17047';

-- Verificar se a atualização foi bem-sucedida
SELECT 
    standard_id,
    name,
    LEFT(prompt_template, 100) as prompt_preview,
    updated_at
FROM tab_memorial_standards 
WHERE standard_id = '12fb339a-89ce-457c-8292-b0109de2a1f1';