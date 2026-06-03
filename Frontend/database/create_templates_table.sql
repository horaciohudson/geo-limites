-- Script SQL para criar a tabela de templates no banco PostgreSQL
-- MemorialPro - Sistema de Templates Gerados por IA
-- Data: 2024


select * from tab_memorial_standards

CREATE TABLE IF NOT EXISTS tab_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_url VARCHAR(500) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    memorial_standard_id UUID,
    municipality VARCHAR(255),
    abnt_norm VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    owner_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_templates_memorial_standard 
        FOREIGN KEY (memorial_standard_id) 
        REFERENCES tab_memorial_standards(standard_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_templates_owner 
        FOREIGN KEY (owner_id) 
        REFERENCES tab_users(user_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_templates_status 
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT'))
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_templates_owner_id ON tab_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_templates_memorial_standard_id ON tab_templates(memorial_standard_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON tab_templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_municipality ON tab_templates(municipality);
CREATE INDEX IF NOT EXISTS idx_templates_abnt_norm ON tab_templates(abnt_norm);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON tab_templates(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_templates_updated_at
    BEFORE UPDATE ON tab_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_templates_updated_at();

-- Comentários na tabela e colunas
COMMENT ON TABLE tab_templates IS 'Tabela para armazenar templates gerados por IA';
COMMENT ON COLUMN tab_templates.template_id IS 'Identificador único do template';
COMMENT ON COLUMN tab_templates.name IS 'Nome do template';
COMMENT ON COLUMN tab_templates.description IS 'Descrição do template';
COMMENT ON COLUMN tab_templates.file_url IS 'URL de acesso ao arquivo do template';
COMMENT ON COLUMN tab_templates.file_path IS 'Caminho físico do arquivo no sistema';
COMMENT ON COLUMN tab_templates.memorial_standard_id IS 'Referência à norma ABNT utilizada';
COMMENT ON COLUMN tab_templates.municipality IS 'Município para o qual o template foi criado';
COMMENT ON COLUMN tab_templates.abnt_norm IS 'Norma ABNT específica (ex: NBR-17047)';
COMMENT ON COLUMN tab_templates.status IS 'Status do template (ACTIVE, INACTIVE, DRAFT)';
COMMENT ON COLUMN tab_templates.owner_id IS 'Usuário proprietário do template';
COMMENT ON COLUMN tab_templates.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN tab_templates.updated_at IS 'Data da última atualização';

-- Inserir dados de exemplo (opcional)
-- INSERT INTO tab_templates (name, description, file_url, file_path, municipality, abnt_norm, owner_id)
-- VALUES 
--     ('Template Desmembramento Urbano', 'Template para desmembramento de área urbana', 
--      '/templates/desmembramento_urbano.json', 'C:\Templates\desmembramento_urbano.json',
--      'São Paulo', 'NBR-17047', 'user-uuid-here');