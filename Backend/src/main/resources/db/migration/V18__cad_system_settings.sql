CREATE TABLE IF NOT EXISTS tab_cad_system_settings (
    cad_settings_id SMALLINT PRIMARY KEY,
    measurement_unit VARCHAR(8) NOT NULL DEFAULT 'cm',
    new_document_workspace_size DOUBLE PRECISION NOT NULL DEFAULT 1000,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tab_cad_system_settings (
    cad_settings_id
)
VALUES (
    1
)
ON CONFLICT (cad_settings_id) DO NOTHING;
