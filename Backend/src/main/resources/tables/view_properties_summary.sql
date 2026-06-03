-- View super simplificada para propriedades
-- Apenas campos básicos da tabela principal

CREATE OR REPLACE VIEW vw_properties_summary AS
SELECT
    property_id,
    registration_number,
    name,
    property_type,
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    zip_code,
    owner_name,
    owner_document,
    owner_email,
    owner_phone,
    total_area,
    total_perimeter,
    datum,
    coordinate_system,
    active,
    created_at,
    updated_at,
    user_id,

    -- Campos calculados simples
    1 as total_owners,
    0 as total_documents,
    0 as total_files,
    0 as total_dxf_files,
    '' as dxf_files_list,

    -- Endereço formatado
    (street ||
     CASE WHEN number IS NOT NULL THEN ', ' || number ELSE '' END ||
     CASE WHEN complement IS NOT NULL THEN ', ' || complement ELSE '' END ||
     ' - ' || neighborhood ||
     ', ' || city || ' - ' || state ||
     CASE WHEN zip_code IS NOT NULL THEN ' - ' || zip_code ELSE '' END
        ) as full_address,

    -- Status de completude
    CASE
        WHEN registration_number IS NOT NULL
            AND street IS NOT NULL
            AND neighborhood IS NOT NULL
            AND city IS NOT NULL
            AND state IS NOT NULL
            AND owner_name IS NOT NULL
            AND owner_document IS NOT NULL
            THEN 'COMPLETO'
        ELSE 'INCOMPLETO'
        END as completeness_status

FROM tab_properties
WHERE active = true
ORDER BY updated_at DESC;