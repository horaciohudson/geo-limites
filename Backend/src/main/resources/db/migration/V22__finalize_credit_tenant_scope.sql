UPDATE tab_credit_transactions ct
SET tenant_id = u.tenant_id
FROM tab_users u
WHERE u.user_id = ct.user_id
  AND ct.tenant_id IS NULL
  AND u.tenant_id IS NOT NULL;

UPDATE tab_credit_purchases cp
SET tenant_id = u.tenant_id
FROM tab_users u
WHERE u.user_id = cp.user_id
  AND cp.tenant_id IS NULL
  AND u.tenant_id IS NOT NULL;

UPDATE tab_credit_transactions
SET tenant_id = (
    SELECT tenant_id
    FROM tab_tenants
    WHERE is_default = TRUE
    ORDER BY created_at NULLS LAST, tenant_id
    LIMIT 1
)
WHERE tenant_id IS NULL;

UPDATE tab_credit_purchases
SET tenant_id = (
    SELECT tenant_id
    FROM tab_tenants
    WHERE is_default = TRUE
    ORDER BY created_at NULLS LAST, tenant_id
    LIMIT 1
)
WHERE tenant_id IS NULL;

ALTER TABLE tab_credit_transactions
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE tab_credit_purchases
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE tab_credit_transactions
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE tab_credit_purchases
    ALTER COLUMN tenant_id SET NOT NULL;
