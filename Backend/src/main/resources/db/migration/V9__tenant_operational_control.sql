CREATE TABLE IF NOT EXISTS tab_tenant_operational_control (
    tenant_operational_control_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    onboarding_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    billing_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_FIRST_PAYMENT',
    company_data_completed BOOLEAN NOT NULL DEFAULT FALSE,
    admin_approved BOOLEAN NOT NULL DEFAULT FALSE,
    first_payment_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    operational_access_released BOOLEAN NOT NULL DEFAULT FALSE,
    admin_approved_by VARCHAR(50),
    admin_approved_at TIMESTAMP WITH TIME ZONE,
    first_payment_confirmed_by VARCHAR(50),
    first_payment_confirmed_at TIMESTAMP WITH TIME ZONE,
    operational_access_released_by VARCHAR(50),
    operational_access_released_at TIMESTAMP WITH TIME ZONE,
    release_notes VARCHAR(255),
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT ux_tenant_operational_control_tenant UNIQUE (tenant_id),
    CONSTRAINT fk_tenant_op_control_tenant FOREIGN KEY (tenant_id) REFERENCES tab_tenants(tenant_id)
);

CREATE INDEX IF NOT EXISTS ix_tenant_operational_control_onboarding_status ON tab_tenant_operational_control(onboarding_status);
CREATE INDEX IF NOT EXISTS ix_tenant_operational_control_billing_status ON tab_tenant_operational_control(billing_status);
CREATE INDEX IF NOT EXISTS ix_tenant_operational_control_operational_access ON tab_tenant_operational_control(operational_access_released);

-- Inserir registros para os tenants existentes (para evitar problemas de tenants orfaos na parte operacional)
INSERT INTO tab_tenant_operational_control (tenant_id, onboarding_status, billing_status, company_data_completed, admin_approved, first_payment_confirmed, operational_access_released, created_by)
SELECT tenant_id, 'ACTIVE', 'PAID', TRUE, TRUE, TRUE, TRUE, 'system'
FROM tab_tenants
WHERE NOT EXISTS (
    SELECT 1 FROM tab_tenant_operational_control WHERE tenant_id = tab_tenants.tenant_id
);
