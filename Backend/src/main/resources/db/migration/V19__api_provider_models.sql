ALTER TABLE tab_api_settings
    ADD COLUMN IF NOT EXISTS template_api_model VARCHAR(100) NOT NULL DEFAULT 'GPT-4.0';

ALTER TABLE tab_api_settings
    ADD COLUMN IF NOT EXISTS memorial_api_model VARCHAR(100) NOT NULL DEFAULT 'GPT-4.0';

UPDATE tab_api_settings
SET template_api_model = COALESCE(NULLIF(template_api_model, ''), 'GPT-4.0'),
    memorial_api_model = COALESCE(NULLIF(memorial_api_model, ''), 'GPT-4.0');
