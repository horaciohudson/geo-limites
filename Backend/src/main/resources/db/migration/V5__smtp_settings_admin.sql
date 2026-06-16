CREATE TABLE IF NOT EXISTS tab_smtp_settings (
    smtp_config_id SMALLINT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    host VARCHAR(255) NOT NULL DEFAULT '',
    port INTEGER NOT NULL DEFAULT 587,
    username VARCHAR(255) NOT NULL DEFAULT '',
    password_encrypted TEXT NOT NULL DEFAULT '',
    auth BOOLEAN NOT NULL DEFAULT TRUE,
    starttls_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ssl_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    from_address VARCHAR(255) NOT NULL DEFAULT '',
    from_name VARCHAR(150) NOT NULL DEFAULT 'Geo Limites',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tab_smtp_settings (
    smtp_config_id,
    enabled,
    host,
    port,
    username,
    password_encrypted,
    auth,
    starttls_enabled,
    ssl_enabled,
    from_address,
    from_name
)
VALUES (
    1,
    FALSE,
    '',
    587,
    '',
    '',
    TRUE,
    TRUE,
    FALSE,
    '',
    'Geo Limites'
)
ON CONFLICT (smtp_config_id) DO NOTHING;
