INSERT INTO tab_roles (role_id, name)
VALUES (gen_random_uuid(), 'ROLE_ADMIN')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tab_roles (role_id, name)
VALUES (gen_random_uuid(), 'ROLE_USER')
ON CONFLICT (name) DO NOTHING;

UPDATE tab_memorial_standards
SET is_default = FALSE
WHERE is_default = TRUE
  AND active = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM tab_memorial_standards
      WHERE name = 'Padrao GeoLimites'
        AND active = TRUE
  );

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
)
SELECT
    gen_random_uuid(),
    'Padrao GeoLimites',
    'Norma padrao global para inicializacao do sistema e geracao inicial de memoriais.',
    'Gerar memorial descritivo com redacao tecnica, juridica e objetiva, respeitando os dados georreferenciados, confrontacoes, vertices e area efetivamente informados no processo.',
    'Elabore um memorial descritivo profissional em portugues tecnico do Brasil. Use somente os dados fornecidos pelo sistema. Nao invente coordenadas, areas, confrontantes, numero de lotes ou medidas. Se algum dado estiver ausente, mantenha a redacao tecnica sem preencher valores ficticios.',
    TRUE,
    TRUE,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM tab_memorial_standards
    WHERE active = TRUE
      AND is_default = TRUE
);
