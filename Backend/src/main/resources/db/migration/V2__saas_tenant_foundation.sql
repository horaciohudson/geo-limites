CREATE TABLE IF NOT EXISTS tab_tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    plan_code VARCHAR(50),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_tab_tenants_code ON tab_tenants(code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_tab_tenants_slug ON tab_tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tab_tenants_status ON tab_tenants(status);
CREATE INDEX IF NOT EXISTS idx_tab_tenants_default ON tab_tenants(is_default);

ALTER TABLE tab_users
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE tab_properties
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE tab_files
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_tenant'
    ) THEN
        ALTER TABLE tab_users
            ADD CONSTRAINT fk_users_tenant
            FOREIGN KEY (tenant_id) REFERENCES tab_tenants(tenant_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_properties_tenant'
    ) THEN
        ALTER TABLE tab_properties
            ADD CONSTRAINT fk_properties_tenant
            FOREIGN KEY (tenant_id) REFERENCES tab_tenants(tenant_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_files_tenant'
    ) THEN
        ALTER TABLE tab_files
            ADD CONSTRAINT fk_files_tenant
            FOREIGN KEY (tenant_id) REFERENCES tab_tenants(tenant_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON tab_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_tenant_id ON tab_properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON tab_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_tenant_user_id ON tab_properties(tenant_id, user_id);

INSERT INTO tab_tenants (name, code, slug, status, plan_code, is_default, created_by)
SELECT 'SIGEVE Default Tenant', 'SIGEVE', 'sigeve', 'ACTIVE', 'foundation', TRUE, 'system'
WHERE NOT EXISTS (
    SELECT 1
    FROM tab_tenants
    WHERE code = 'SIGEVE'
);

UPDATE tab_users u
SET tenant_id = t.tenant_id
FROM tab_tenants t
WHERE t.code = 'SIGEVE'
  AND u.tenant_id IS NULL;

UPDATE tab_properties p
SET tenant_id = COALESCE(p.tenant_id, u.tenant_id, t.tenant_id)
FROM tab_users u
JOIN tab_tenants t ON t.code = 'SIGEVE'
WHERE p.user_id = u.user_id
  AND p.tenant_id IS NULL;

UPDATE tab_files f
SET tenant_id = COALESCE(f.tenant_id, u.tenant_id, t.tenant_id)
FROM tab_users u
JOIN tab_tenants t ON t.code = 'SIGEVE'
WHERE f.owner_id = u.user_id
  AND f.tenant_id IS NULL;
