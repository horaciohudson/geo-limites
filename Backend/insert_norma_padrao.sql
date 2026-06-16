-- ========================================
-- 📋 INSERIR NORMA PADRÃO NO BANCO
-- ========================================

-- Inserir norma padrao para testes
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
    '12fb339a-89ce-457c-8292-b0109de2a1f1',
    'NBR ABNT-NBR-17047',
    'Norma extraída do arquivo ABNT-NBR-17047.pdf',
    '📄 NORMA: ABNT-NBR-17047

🔹 INSTRUÇÕES PARA PREENCHIMENTO:

Esta norma estabelece os procedimentos para elaboração de memoriais descritivos de propriedades urbanas e rurais, incluindo:

✅ Título completo da norma
✅ Escopo e objetivo  
✅ Definições técnicas importantes
✅ Procedimentos obrigatórios
✅ Requisitos para memorial descritivo
✅ Formatos e estruturas exigidas
✅ Referências cartográficas
✅ Precisão de medidas

ABNT NBR 17047:2024 - Memorial Descritivo de Propriedades

1. ESCOPO
Esta norma estabelece os critérios para elaboração de memoriais descritivos de propriedades, definindo estrutura, conteúdo mínimo e precisão das informações técnicas.

2. REFERÊNCIAS NORMATIVAS
- NBR 13133 - Execução de levantamento topográfico
- NBR 14166 - Rede de referência cadastral municipal

3. TERMOS E DEFINIÇÕES
- Memorial descritivo: documento técnico que descreve as características de uma propriedade
- Coordenadas georreferenciadas: coordenadas vinculadas ao Sistema Geodésico Brasileiro
- Confrontações: limites da propriedade com propriedades adjacentes

4. REQUISITOS GERAIS
O memorial descritivo deve conter:
- Identificação completa da propriedade
- Localização georreferenciada
- Descrição dos limites e confrontações
- Área total e perímetro
- Sistema de coordenadas utilizado',
    '🤖 PROMPT PARA GERACAO ASSISTIDA - NORMA ABNT-NBR-17047

Elabore um memorial descritivo seguindo rigorosamente a norma ABNT-NBR-17047, com base no texto da norma fornecido acima.

📋 ESTRUTURA OBRIGATÓRIA:
✅ Identificação completa do projeto
✅ Localização e descrição do terreno
✅ Coordenadas georreferenciadas (sistema especificado na norma)
✅ Cálculos de perímetros e áreas
✅ Confrontações detalhadas por direção
✅ Referências técnicas e cartográficas

🎯 REQUISITOS CRÍTICOS:
✅ Seguir EXATAMENTE a estrutura da norma
✅ Usar terminologia técnica correta
✅ Incluir todos os elementos obrigatórios
✅ Manter precisão nas medidas
✅ Referenciar adequadamente o sistema de coordenadas

⚠️ INSTRUÇÕES CRÍTICAS:
🔴 Use EXCLUSIVAMENTE as coordenadas reais dos arquivos DXF
🔴 NÃO invente coordenadas fictícias (ex: 123456.78, 7654321.09)
🔴 Calcule medidas com base nos dados reais fornecidos
🔴 Mantenha consistência com a norma ABNT-NBR-17047
🔴 Inclua todas as seções obrigatórias da norma

📝 PERSONALIZAÇÃO:
Ajuste este prompt conforme necessário para incluir requisitos específicos da norma ABNT-NBR-17047 após revisar o texto completo da norma acima.',
    true,
    true,
    (SELECT user_id FROM tab_users WHERE email = 'admin@geolimites.com' LIMIT 1),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (standard_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    standard_text = EXCLUDED.standard_text,
    prompt_template = EXCLUDED.prompt_template,
    active = EXCLUDED.active,
    is_default = EXCLUDED.is_default,
    updated_at = CURRENT_TIMESTAMP;

-- Verificar se foi inserida
SELECT 
    standard_id,
    name,
    description,
    active,
    is_default,
    created_at
FROM tab_memorial_standards 
WHERE standard_id = '12fb339a-89ce-457c-8292-b0109de2a1f1';

-- Listar todas as normas
SELECT 
    standard_id,
    name,
    active,
    is_default
FROM tab_memorial_standards 
ORDER BY created_at DESC;
