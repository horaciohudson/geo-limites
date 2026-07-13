ALTER TABLE tab_files
    ADD COLUMN IF NOT EXISTS property_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_files_property'
    ) THEN
        ALTER TABLE tab_files
            ADD CONSTRAINT fk_files_property
            FOREIGN KEY (property_id) REFERENCES tab_properties(property_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_files_property_id ON tab_files(property_id);
