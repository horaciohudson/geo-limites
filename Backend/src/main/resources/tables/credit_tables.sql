-- =====================================================
-- SISTEMA DE CRÉDITOS - MEMORIAL PRO
-- Tabelas para gerenciar créditos dos usuários
-- ESTRUTURA CORRIGIDA - SEM user_credits_id
-- =====================================================

-- Garantir extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de saldos de créditos dos usuários
DROP TABLE IF EXISTS tab_user_credits CASCADE;
CREATE TABLE tab_user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    total_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT uk_user_credits_user_id UNIQUE (user_id),
    CONSTRAINT ck_user_credits_total_credits CHECK (total_credits >= 0)
);

-- 2. Tabela de transações de créditos (histórico)
DROP TABLE IF EXISTS tab_credit_transactions CASCADE;
CREATE TABLE tab_credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('PURCHASE', 'USE', 'REFUND', 'BONUS', 'ADJUSTMENT')),
    amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT ck_credit_transactions_amount CHECK (amount > 0)
);

-- 3. Tabela de compras de créditos
DROP TABLE IF EXISTS tab_credit_purchases CASCADE;
CREATE TABLE tab_credit_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    amount_reais DECIMAL(10,2) NOT NULL,
    credits_purchased INTEGER NOT NULL,
    payment_provider VARCHAR(100) NOT NULL DEFAULT 'default',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT ck_credit_purchases_amount_reais CHECK (amount_reais > 0),
    CONSTRAINT ck_credit_purchases_credits_purchased CHECK (credits_purchased > 0)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para tab_user_credits
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON tab_user_credits(user_id);

-- Índices para tab_credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON tab_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON tab_credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at ON tab_credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON tab_credit_transactions(transaction_type);

-- Índices para tab_credit_purchases
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON tab_credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON tab_credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_created_at ON tab_credit_purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id_status ON tab_credit_purchases(user_id, status);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_credits_updated_at
    BEFORE UPDATE ON tab_user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_credit_purchases_updated_at
    BEFORE UPDATE ON tab_credit_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS DE TESTE
-- =====================================================

-- Inserir usuário de teste com 25 créditos iniciais
INSERT INTO tab_user_credits (user_id, total_credits) VALUES 
    ('123e4567-e89b-12d3-a456-426614174000', 25)
ON CONFLICT (user_id) DO NOTHING;

-- Inserir transação de boas-vindas
INSERT INTO tab_credit_transactions (user_id, transaction_type, amount, description) VALUES 
    ('123e4567-e89b-12d3-a456-426614174000', 'PURCHASE', 25, 'Créditos de boas-vindas - Novo usuário')
ON CONFLICT DO NOTHING;

-- =====================================================
-- VIEWS ÚTEIS PARA CONSULTAS
-- =====================================================

-- View para resumo de créditos por usuário
CREATE OR REPLACE VIEW view_user_credit_summary AS
SELECT 
    uc.user_id,
    uc.total_credits,
    COALESCE(purchased.total_purchased, 0) as total_purchased,
    COALESCE(used.total_used, 0) as total_used,
    uc.created_at as account_created,
    uc.updated_at as last_activity
FROM tab_user_credits uc
LEFT JOIN (
    SELECT 
        user_id, 
        SUM(amount) as total_purchased
    FROM tab_credit_transactions 
    WHERE transaction_type = 'PURCHASE' 
    GROUP BY user_id
) purchased ON uc.user_id = purchased.user_id
LEFT JOIN (
    SELECT 
        user_id, 
        SUM(amount) as total_used
    FROM tab_credit_transactions 
    WHERE transaction_type = 'USE' 
    GROUP BY user_id
) used ON uc.user_id = used.user_id;

-- View para estatísticas de compras
CREATE OR REPLACE VIEW view_purchase_statistics AS
SELECT 
    status,
    COUNT(*) as total_purchases,
    SUM(amount_reais) as total_amount_reais,
    SUM(credits_purchased) as total_credits,
    AVG(amount_reais) as avg_amount_reais,
    AVG(credits_purchased) as avg_credits
FROM tab_credit_purchases 
GROUP BY status;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE tab_user_credits IS 'Armazena o saldo atual de créditos de cada usuário';
COMMENT ON COLUMN tab_user_credits.id IS 'Chave primária UUID';
COMMENT ON COLUMN tab_user_credits.user_id IS 'ID do usuário (referência externa)';
COMMENT ON COLUMN tab_user_credits.total_credits IS 'Saldo atual de créditos do usuário';

COMMENT ON TABLE tab_credit_transactions IS 'Histórico de todas as transações de crédito (compras e usos)';
COMMENT ON COLUMN tab_credit_transactions.transaction_type IS 'Tipo da transação: PURCHASE, USE, REFUND, BONUS, ADJUSTMENT';
COMMENT ON COLUMN tab_credit_transactions.amount IS 'Quantidade de créditos na transação';

COMMENT ON TABLE tab_credit_purchases IS 'Registro de compras de créditos com status de pagamento';
COMMENT ON COLUMN tab_credit_purchases.status IS 'Status da compra: PENDING, PAID, FAILED, CANCELLED, REFUNDED';
COMMENT ON COLUMN tab_credit_purchases.payment_provider IS 'Provedor de pagamento utilizado';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Mostrar estrutura das tabelas criadas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('tab_user_credits', 'tab_credit_transactions', 'tab_credit_purchases')
ORDER BY table_name, ordinal_position;

-- Mostrar dados de teste inseridos
SELECT 'tab_user_credits' as tabela, COUNT(*) as registros FROM tab_user_credits
UNION ALL
SELECT 'tab_credit_transactions' as tabela, COUNT(*) as registros FROM tab_credit_transactions
UNION ALL
SELECT 'tab_credit_purchases' as tabela, COUNT(*) as registros FROM tab_credit_purchases;

-- =====================================================
-- FIM DO SCRIPT - ESTRUTURA CORRIGIDA
-- =====================================================