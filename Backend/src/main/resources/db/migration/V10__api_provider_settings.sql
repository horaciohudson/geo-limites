CREATE TABLE IF NOT EXISTS tab_api_settings (
    api_config_id SMALLINT PRIMARY KEY,
    template_api_provider VARCHAR(50) NOT NULL DEFAULT 'CLAUDE',
    memorial_api_provider VARCHAR(50) NOT NULL DEFAULT 'CLAUDE',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tab_api_settings (
    api_config_id,
    template_api_provider,
    memorial_api_provider
)
VALUES (
    1,
    'CLAUDE',
    'CLAUDE'
)
ON CONFLICT (api_config_id) DO NOTHING;
