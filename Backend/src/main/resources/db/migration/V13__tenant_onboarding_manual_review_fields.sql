ALTER TABLE tab_tenant_operational_control
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS pending_approval_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS customer_research_notes VARCHAR(1000);
