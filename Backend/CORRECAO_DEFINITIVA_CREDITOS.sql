-- =====================================================
-- CORREÇÃO DEFINITIVA - TABELA DE CRÉDITOS
-- Remove problema de user_credits_id e recria estrutura correta
-- =====================================================

-- 1. REMOVER TABELA PROBLEMÁTICA (se existir)
DROP TABLE IF EXISTS tab_user_credits CASCADE;
DROP TABLE IF EXISTS tab_credit_transactions CASCADE;
DROP TABLE IF EXISTS tab_credit_purchases CASCADE;

-- 2. GARANTIR EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. CRIAR TABELA DE CRÉDITOS CORRETA
CREATE TABLE tab_user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    total_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. CRIAR TABELA DE TRANSAÇÕES
CREATE TABLE tab_credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('PURCHASE', 'USE', 'REFUND', 'BONUS', 'ADJUSTMENT')),
    amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. CRIAR TABELA DE COMPRAS
CREATE TABLE tab_credit_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    amount_reais DECIMAL(10,2) NOT NULL,
    credits_purchased INTEGER NOT NULL,
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'default',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_user_credits_user_id ON tab_user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON tab_credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON tab_credit_transactions(created_at);
CREATE INDEX idx_credit_purchases_user_id ON tab_credit_purchases(user_id);
CREATE INDEX idx_credit_purchases_status ON tab_credit_purchases(status);

-- 7. CRIAR TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_credits_updated_at 
    BEFORE UPDATE ON tab_user_credits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_purchases_updated_at 
    BEFORE UPDATE ON tab_credit_purchases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. INSERIR DADOS DE TESTE
INSERT INTO tab_user_credits (user_id, total_credits) VALUES 
('123e4567-e89b-12d3-a456-426614174000', 25);

INSERT INTO tab_credit_transactions (user_id, transaction_type, amount, description) VALUES 
('123e4567-e89b-12d3-a456-426614174000', 'PURCHASE', 25, 'Créditos de boas-vindas - Novo usuário');

-- 9. VERIFICAR ESTRUTURA CRIADA
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('tab_user_credits', 'tab_credit_transactions', 'tab_credit_purchases')
ORDER BY table_name, ordinal_position;

-- 10. TESTAR INSERÇÃO
INSERT INTO tab_user_credits (user_id, total_credits) 
VALUES ('456e7890-e89b-12d3-a456-426614174001', 50)
ON CONFLICT (user_id) DO NOTHING;

-- 11. VERIFICAR DADOS
SELECT 
    'tab_user_credits' as tabela,
    COUNT(*) as registros
FROM tab_user_credits
UNION ALL
SELECT 
    'tab_credit_transactions' as tabela,
    COUNT(*) as registros
FROM tab_credit_transactions
UNION ALL
SELECT 
    'tab_credit_purchases' as tabela,
    COUNT(*) as registros
FROM tab_credit_purchases;

-- 12. MOSTRAR DADOS DE TESTE
SELECT 
    id,
    user_id,
    total_credits,
    created_at
FROM tab_user_credits;

SELECT 
    id,
    user_id,
    transaction_type,
    amount,
    description,
    created_at
FROM tab_credit_transactions;

-- =====================================================
-- RESULTADO ESPERADO:
-- - Tabelas criadas sem coluna user_credits_id
-- - Estrutura correta com UUID
-- - Dados de teste inseridos
-- - Triggers funcionando
-- =====================================================