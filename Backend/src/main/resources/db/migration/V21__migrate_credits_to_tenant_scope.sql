CREATE TABLE IF NOT EXISTS tab_tenant_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,
    total_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tenant_credits_tenant FOREIGN KEY (tenant_id) REFERENCES tab_tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT ck_tenant_credits_total_credits CHECK (total_credits >= 0)
);

INSERT INTO tab_tenant_credits (id, tenant_id, total_credits, created_at, updated_at)
SELECT
    gen_random_uuid(),
    u.tenant_id,
    COALESCE(SUM(uc.total_credits), 0),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tab_user_credits uc
JOIN tab_users u ON u.user_id = uc.user_id
WHERE u.tenant_id IS NOT NULL
GROUP BY u.tenant_id
ON CONFLICT (tenant_id) DO NOTHING;

ALTER TABLE tab_credit_transactions
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE tab_credit_transactions ct
SET tenant_id = u.tenant_id
FROM tab_users u
WHERE u.user_id = ct.user_id
  AND ct.tenant_id IS NULL;

ALTER TABLE tab_credit_purchases
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE tab_credit_purchases cp
SET tenant_id = u.tenant_id
FROM tab_users u
WHERE u.user_id = cp.user_id
  AND cp.tenant_id IS NULL;

ALTER TABLE tab_credit_transactions
    DROP CONSTRAINT IF EXISTS fk_credit_transactions_user;

ALTER TABLE tab_credit_purchases
    DROP CONSTRAINT IF EXISTS fk_credit_purchases_user;

ALTER TABLE tab_credit_transactions
    ADD CONSTRAINT fk_credit_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES tab_tenants(tenant_id) ON DELETE CASCADE;

ALTER TABLE tab_credit_purchases
    ADD CONSTRAINT fk_credit_purchases_tenant FOREIGN KEY (tenant_id) REFERENCES tab_tenants(tenant_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tenant_credits_tenant_id ON tab_tenant_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant_id ON tab_credit_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant_created_at ON tab_credit_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_tenant_id ON tab_credit_purchases(tenant_id);
