-- Script SQL para inserir a norma ABNT NBR 17047:2024
-- Memorial Descritivo Cartorial de Parcelamento do Solo Urbano
-- Execute este script no pgAdmin para cadastrar a nova norma

INSERT INTO tab_memorial_standards (
    standard_id,
    name,
    description,
    standard_text,
    prompt_template,
    active,
    is_default,
    owner_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'ABNT NBR 17047:2024',
    'Memorial Descritivo Cartorial de Parcelamento do Solo Urbano - Estabelece os requisitos para elaboração de memorial descritivo cartorial destinado ao parcelamento do solo urbano, incluindo loteamentos e desmembramentos.',
    'MEMORIAL DESCRITIVO CARTORIAL DE PARCELAMENTO DO SOLO URBANO

NORMA TÉCNICA: ABNT NBR 17047:2024

OBJETIVO:
Este memorial descritivo atende aos requisitos estabelecidos pela ABNT NBR 17047:2024 para parcelamento do solo urbano, contemplando as especificações técnicas necessárias para registro cartorial.

ESPECIFICAÇÕES TÉCNICAS:
- Sistema de Referência: SIRGAS 2000
- Projeção Cartográfica: UTM (Universal Transversa de Mercator)
- Precisão das Coordenadas: Conforme especificações da norma
- Formato de Apresentação: Memorial descritivo cartorial

ESTRUTURA DO MEMORIAL:
1. Identificação do empreendimento
2. Localização e confrontações
3. Descrição técnica dos lotes
4. Coordenadas georreferenciadas
5. Áreas e perímetros
6. Vias de circulação e áreas públicas
7. Infraestrutura urbana
8. Responsabilidade técnica

CONFORMIDADE NORMATIVA:
- ABNT NBR 17047:2024 - Memorial Descritivo Cartorial de Parcelamento do Solo Urbano
- ABNT NBR 13133:1994 - Execução de levantamento topográfico
- Lei Federal 6.766/1979 - Parcelamento do Solo Urbano
- Legislação municipal aplicável

RESPONSABILIDADE TÉCNICA:
O presente memorial foi elaborado em conformidade com as normas técnicas vigentes e legislação aplicável, sendo de responsabilidade do profissional habilitado que o subscreve.',
    'Você é um engenheiro cartógrafo especialista em parcelamento do solo urbano e elaboração de memoriais descritivos cartoriais.

INSTRUÇÕES ESPECÍFICAS PARA ABNT NBR 17047:2024:

1. ESTRUTURA OBRIGATÓRIA DO MEMORIAL:
   - Identificação completa do empreendimento
   - Localização precisa com coordenadas SIRGAS 2000
   - Descrição detalhada de todos os lotes
   - Especificação das vias de circulação
   - Áreas destinadas ao uso público
   - Infraestrutura urbana prevista

2. DADOS TÉCNICOS OBRIGATÓRIOS:
   - Coordenadas UTM de todos os vértices
   - Áreas individuais de cada lote em m²
   - Perímetros de cada lote em metros
   - Dimensões das vias de circulação
   - Percentual de áreas públicas
   - Coeficientes urbanísticos

3. CONFRONTAÇÕES DETALHADAS:
   - Descrição precisa de todas as confrontações
   - Identificação dos proprietários confrontantes
   - Medidas lineares de cada divisa
   - Azimutes e rumos quando aplicável

4. ASPECTOS CARTORIAIS:
   - Matrícula do imóvel original
   - Registro de incorporação (se aplicável)
   - Certidões negativas necessárias
   - Aprovações municipais

5. RESPONSABILIDADE TÉCNICA:
   - ART/RRT do responsável técnico
   - Assinatura e carimbo profissional
   - Data de elaboração do memorial

IMPORTANTE: O memorial deve ser elaborado de forma a atender integralmente aos requisitos da ABNT NBR 17047:2024 e permitir o registro cartorial sem pendências.',
    true,
    false,
    NULL, -- owner_id NULL para norma global (disponível para todos os usuários)
    NOW(),
    NOW()
);

-- Comentário explicativo:
-- Esta norma será disponível para todos os usuários (owner_id = NULL)
-- Caso queira associar a um usuário específico, substitua NULL pelo UUID do usuário
-- Exemplo: owner_id = 'uuid-do-usuario-aqui'

-- Para verificar se a inserção foi bem-sucedida, execute:
-- SELECT * FROM tab_memorial_standards WHERE name = 'ABNT NBR 17047:2024';