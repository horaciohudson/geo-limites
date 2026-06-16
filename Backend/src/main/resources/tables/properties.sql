-- ========================================
-- 🏗️ PROPERTY REGISTRATION TABLES
-- ========================================
-- Complementary data needed for memorial generation
-- that doesn't come from DXF files but is required by standards

-- ========================================
-- 📋 MAIN TABLE: PROPERTIES
-- ========================================
CREATE TABLE tab_properties (
    property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 🏠 PROPERTY IDENTIFICATION
    name VARCHAR(255) NOT NULL,
    internal_code VARCHAR(50),
    
    -- 👤 OWNER
    owner_name VARCHAR(255) NOT NULL,
    owner_document VARCHAR(20), -- CPF/CNPJ
    owner_id_number VARCHAR(20), -- RG/IE
    owner_phone VARCHAR(20),
    owner_email VARCHAR(255),
    
    -- 📍 LOCATION
    street VARCHAR(255) NOT NULL,
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10),
    
    -- 🗺️ CARTOGRAPHIC DATA
    coordinate_system VARCHAR(100) DEFAULT 'SIRGAS 2000 / UTM zone 23S',
    datum VARCHAR(50) DEFAULT 'SIRGAS 2000',
    utm_zone VARCHAR(10) DEFAULT '23S',
    central_meridian VARCHAR(20) DEFAULT '-45°',
    
    -- 📐 TECHNICAL DATA
    total_area DECIMAL(15,4), -- in m²
    total_perimeter DECIMAL(15,4), -- in meters
    main_frontage DECIMAL(15,4), -- in meters
    average_depth DECIMAL(15,4), -- in meters
    
    -- 🏛️ LEGAL DATA
    registration_number VARCHAR(100),
    registry_office VARCHAR(255),
    registration_book VARCHAR(50),
    registration_page VARCHAR(50),
    registration_date DATE,
    
    -- 🗂️ CLASSIFICATION
    property_type VARCHAR(50) DEFAULT 'URBAN', -- URBAN, RURAL, INDUSTRIAL
    zoning VARCHAR(100), -- Zoning according to master plan
    floor_area_ratio DECIMAL(5,2),
    lot_coverage DECIMAL(5,2),
    
    -- 🌍 BOUNDARIES (free text for special cases)
    north_boundary TEXT,
    south_boundary TEXT,
    east_boundary TEXT,
    west_boundary TEXT,
    
    -- 📝 NOTES
    observations TEXT,
    restrictions TEXT,
    
    -- 👤 AUDIT
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    
    -- 🔗 RELATIONSHIPS
    CONSTRAINT fk_property_user FOREIGN KEY (user_id) REFERENCES tab_users(user_id)
);

-- ========================================
-- 📋 TABLE: LANDMARKS AND VERTICES
-- ========================================
CREATE TABLE tab_property_landmarks (
    landmark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    
    -- 📍 LANDMARK IDENTIFICATION
    landmark_name VARCHAR(50) NOT NULL, -- M1, M2, V1, V2, etc.
    landmark_type VARCHAR(20) NOT NULL, -- LANDMARK, VERTEX, REFERENCE_POINT
    
    -- 🗺️ COORDINATES
    coordinate_x DECIMAL(15,4) NOT NULL, -- UTM X (E)
    coordinate_y DECIMAL(15,4) NOT NULL, -- UTM Y (N)
    coordinate_z DECIMAL(10,4), -- Altitude (optional)
    
    -- 📐 TECHNICAL DATA
    entrance_azimuth DECIMAL(8,4), -- Arrival azimuth
    exit_azimuth DECIMAL(8,4), -- Exit azimuth
    previous_distance DECIMAL(15,4), -- Distance from previous landmark
    
    -- 📝 DESCRIPTION
    description TEXT,
    landmark_material VARCHAR(100), -- Concrete, iron, wood, etc.
    
    -- 📊 ORDER
    sequence_order INTEGER NOT NULL,
    
    -- 👤 AUDIT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 🔗 RELATIONSHIPS
    CONSTRAINT fk_landmark_property FOREIGN KEY (property_id) REFERENCES tab_properties(property_id) ON DELETE CASCADE
);

-- ========================================
-- 📋 TABLE: DETAILED BOUNDARIES
-- ========================================
CREATE TABLE tab_property_boundaries (
    boundary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    
    -- 📍 DIRECTION
    direction VARCHAR(20) NOT NULL, -- NORTH, SOUTH, EAST, WEST, NORTHEAST, etc.
    
    -- 📐 MEASUREMENTS
    extension DECIMAL(15,4) NOT NULL, -- in meters
    azimuth DECIMAL(8,4), -- Boundary azimuth
    
    -- 🏠 ADJACENT
    adjacent_type VARCHAR(50) NOT NULL, -- OWNER, STREET, AVENUE, RIVER, RAILWAY, etc.
    adjacent_name VARCHAR(255) NOT NULL,
    adjacent_document VARCHAR(50), -- CPF/CNPJ of adjacent owner
    
    -- 📝 DESCRIPTION
    full_description TEXT,
    
    -- 📊 ORDER
    sequence_order INTEGER NOT NULL,
    
    -- 👤 AUDIT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 🔗 RELATIONSHIPS
    CONSTRAINT fk_boundary_property FOREIGN KEY (property_id) REFERENCES tab_properties(property_id) ON DELETE CASCADE
);

-- ========================================
-- 📋 TABLE: PROPERTY DOCUMENTS
-- ========================================
CREATE TABLE tab_property_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    
    -- 📄 IDENTIFICATION
    document_type VARCHAR(50) NOT NULL, -- DEED, REGISTRATION, PLAN, PHOTO, etc.
    file_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 📁 FILE
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- 👤 AUDIT
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 🔗 RELATIONSHIPS
    CONSTRAINT fk_document_property FOREIGN KEY (property_id) REFERENCES tab_properties(property_id) ON DELETE CASCADE,
    CONSTRAINT fk_document_uploader FOREIGN KEY (uploaded_by) REFERENCES tab_users(user_id)
);

-- ========================================
-- 🔍 PERFORMANCE INDEXES
-- ========================================
CREATE INDEX idx_properties_user ON tab_properties(user_id);
CREATE INDEX idx_properties_city ON tab_properties(city, state);
CREATE INDEX idx_properties_owner ON tab_properties(owner_name);
CREATE INDEX idx_properties_active ON tab_properties(active);

CREATE INDEX idx_landmarks_property ON tab_property_landmarks(property_id);
CREATE INDEX idx_landmarks_order ON tab_property_landmarks(property_id, sequence_order);

CREATE INDEX idx_boundaries_property ON tab_property_boundaries(property_id);
CREATE INDEX idx_boundaries_order ON tab_property_boundaries(property_id, sequence_order);

CREATE INDEX idx_documents_property ON tab_property_documents(property_id);
CREATE INDEX idx_documents_type ON tab_property_documents(document_type);

-- ========================================
-- 📊 TABLE COMMENTS
-- ========================================
COMMENT ON TABLE tab_properties IS 'Complete property registration with data needed for descriptive memorials';
COMMENT ON TABLE tab_property_landmarks IS 'Property landmarks and vertices with precise coordinates';
COMMENT ON TABLE tab_property_boundaries IS 'Detailed boundaries by direction';
COMMENT ON TABLE tab_property_documents IS 'Property attached documents (deeds, plans, photos)';

-- ========================================
-- 🎯 SAMPLE DATA (OPTIONAL)
-- ========================================
/*
INSERT INTO tab_properties (
    name, owner_name, street, number, neighborhood, city, state,
    coordinate_system, total_area, total_perimeter, user_id
) VALUES (
    'Lot 15 - Block B',
    'John Silva Santos',
    'Flowers Street',
    '123',
    'Downtown',
    'São Paulo',
    'SP',
    'SIRGAS 2000 / UTM zone 23S',
    450.75,
    85.30,
    (SELECT user_id FROM tab_users WHERE email = 'admin@memorialpro.com' LIMIT 1)
);
*/