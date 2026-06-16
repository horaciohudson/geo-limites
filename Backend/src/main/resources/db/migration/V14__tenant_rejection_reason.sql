ALTER TABLE tab_tenant_operational_control
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);
