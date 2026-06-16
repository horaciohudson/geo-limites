-- View simplificada para resumo das propriedades com dados principais
-- MemorialPro - Sistema de Cadastro de Terrenos
-- Versão simplificada usando apenas tab_properties

CREATE OR REPLACE VIEW vw_properties_summary AS
SELECT 
    -- Identificação
    p.property_id,
    p.registration_number,
    p.name,
    p.property_type,
    
    -- Endereço completo
    p.street,
    p.number,
    p.complement,
    p.neighborhood,
    p.city,
    p.state,
    p.zip_code,
    
    -- Proprietário principal (dados já na tabela principal)
    p.owner_name,
    p.owner_document,
    p.owner_email,
    p.owner_phone,
    
    -- Dados técnicos
    COALESCE(p.total_area, 0) as total_area,
    COALESCE(p.total_perimeter, 0) as total_perimeter,
    COALESCE(p.datum, 'SIRGAS 2000') as datum,
    COALESCE(p.coordinate_system, 'SIRGAS 2000 / UTM zone 23S') as coordinate_system,
    
    -- Contadores simulados (será implementado quando as tabelas relacionadas existirem)
    1 as total_owners,
    0 as total_documents,
    0 as total_files,
    0 as total_dxf_files,
    
    -- Lista de arquivos DXF simulada (será implementado futuramente)
    '' as dxf_files_list,
    
    -- Status e datas
    p.active,
    p.created_at,
    p.updated_at,
    p.user_id,
    
    -- Endereço formatado para exibição
    CONCAT(
        COALESCE(p.street, ''),
        CASE WHEN p.number IS NOT NULL AND p.number != '' THEN ', ' || p.number ELSE '' END,
        CASE WHEN p.complement IS NOT NULL AND p.complement != '' THEN ', ' || p.complement ELSE '' END,
        CASE WHEN p.neighborhood IS NOT NULL AND p.neighborhood != '' THEN ' - ' || p.neighborhood ELSE '' END,
        CASE WHEN p.city IS NOT NULL AND p.city != '' THEN ', ' || p.city ELSE '' END,
        CASE WHEN p.state IS NOT NULL AND p.state != '' THEN ' - ' || p.state ELSE '' END,
        CASE WHEN p.zip_code IS NOT NULL AND p.zip_code != '' THEN ' - ' || p.zip_code ELSE '' END
    ) as full_address,
    
    -- Indicador de completude
    CASE 
        WHEN p.registration_number IS NOT NULL AND p.registration_number != ''
        AND p.street IS NOT NULL AND p.street != ''
        AND p.neighborhood IS NOT NULL AND p.neighborhood != ''
        AND p.city IS NOT NULL AND p.city != ''
        AND p.state IS NOT NULL AND p.state != ''
        AND p.owner_name IS NOT NULL AND p.owner_name != ''
        AND p.owner_document IS NOT NULL AND p.owner_document != ''
        THEN 'COMPLETO'
        ELSE 'INCOMPLETO'
    END as completeness_status

FROM tab_properties p
WHERE p.active = true
ORDER BY p.updated_at DESC, p.created_at DESC;

-- Comentários da view
COMMENT ON VIEW vw_properties_summary IS 'View consolidada com dados principais das propriedades para pesquisa e seleção no frontend';

-- Índices recomendados para performance (se não existirem)
-- CREATE INDEX IF NOT EXISTS idx_properties_active ON tab_properties(active);
-- CREATE INDEX IF NOT EXISTS idx_properties_user_id ON tab_properties(user_id);
-- CREATE INDEX IF NOT EXISTS idx_properties_city_state ON tab_properties(city, state);
-- CREATE INDEX IF NOT EXISTS idx_properties_registration ON tab_properties(registration_number);