ALTER TABLE tab_files
    ADD COLUMN IF NOT EXISTS is_primary_for_property BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_files_primary_property
    ON tab_files(property_id)
    WHERE property_id IS NOT NULL AND is_primary_for_property = TRUE;
