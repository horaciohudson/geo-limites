CREATE TABLE IF NOT EXISTS tab_memorial_base_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    property_id UUID NULL,
    file_id UUID NULL,
    memorial_standard_id UUID NULL,
    project_name VARCHAR(255),
    file_name VARCHAR(255),
    pipeline_version VARCHAR(50) NOT NULL,
    estimated_lot_count INTEGER,
    georeferenced BOOLEAN NOT NULL DEFAULT FALSE,
    coordinate_source VARCHAR(100),
    generation_status VARCHAR(30) NOT NULL DEFAULT 'GENERATED',
    generated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    memorial_base_json TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_memorial_base_snapshot_tenant'
    ) THEN
        ALTER TABLE tab_memorial_base_snapshots
            ADD CONSTRAINT fk_memorial_base_snapshot_tenant
            FOREIGN KEY (tenant_id) REFERENCES tab_tenants(tenant_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_memorial_base_snapshot_user'
    ) THEN
        ALTER TABLE tab_memorial_base_snapshots
            ADD CONSTRAINT fk_memorial_base_snapshot_user
            FOREIGN KEY (user_id) REFERENCES tab_users(user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_memorial_base_snapshot_property'
    ) THEN
        ALTER TABLE tab_memorial_base_snapshots
            ADD CONSTRAINT fk_memorial_base_snapshot_property
            FOREIGN KEY (property_id) REFERENCES tab_properties(property_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_memorial_base_snapshot_file'
    ) THEN
        ALTER TABLE tab_memorial_base_snapshots
            ADD CONSTRAINT fk_memorial_base_snapshot_file
            FOREIGN KEY (file_id) REFERENCES tab_files(file_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_memorial_base_snapshot_tenant ON tab_memorial_base_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memorial_base_snapshot_user ON tab_memorial_base_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_memorial_base_snapshot_property ON tab_memorial_base_snapshots(property_id);
CREATE INDEX IF NOT EXISTS idx_memorial_base_snapshot_generated_at ON tab_memorial_base_snapshots(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memorial_base_snapshot_tenant_property_generated
    ON tab_memorial_base_snapshots(tenant_id, property_id, generated_at DESC);
