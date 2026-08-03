ALTER TABLE tab_roles
    DROP CONSTRAINT IF EXISTS ck_roles_name;

ALTER TABLE tab_roles
    ADD CONSTRAINT ck_roles_name CHECK (name IN ('ROLE_ADMIN', 'ROLE_TENANT_ADMIN', 'ROLE_USER'));

INSERT INTO tab_roles (role_id, name)
VALUES (gen_random_uuid(), 'ROLE_TENANT_ADMIN')
ON CONFLICT (name) DO NOTHING;
