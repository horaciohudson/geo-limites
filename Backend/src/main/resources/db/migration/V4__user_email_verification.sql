ALTER TABLE tab_users
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE tab_users
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE tab_users
SET email = username
WHERE email IS NULL;

UPDATE tab_users
SET is_verified = TRUE
WHERE is_verified IS DISTINCT FROM TRUE;

ALTER TABLE tab_users
    DROP CONSTRAINT IF EXISTS tab_users_username_key;

CREATE UNIQUE INDEX IF NOT EXISTS uk_tab_users_tenant_username
    ON tab_users(tenant_id, username);

CREATE UNIQUE INDEX IF NOT EXISTS uk_tab_users_tenant_email
    ON tab_users(tenant_id, email)
    WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tab_users_tenant_email
    ON tab_users(tenant_id, email);

CREATE TABLE IF NOT EXISTS tab_email_verification_tokens (
    email_verification_token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    used_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_email_verification_tokens_user
        FOREIGN KEY (user_id) REFERENCES tab_users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user
    ON tab_email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires
    ON tab_email_verification_tokens(expires_at);
