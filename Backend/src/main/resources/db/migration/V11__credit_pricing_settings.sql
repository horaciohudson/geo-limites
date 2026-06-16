CREATE TABLE IF NOT EXISTS tab_credit_pricing_settings (
    credit_pricing_id SMALLINT PRIMARY KEY,
    welcome_credits INTEGER NOT NULL DEFAULT 25,
    single_lot_credit_cost INTEGER NOT NULL DEFAULT 1,
    small_project_max_lots INTEGER NOT NULL DEFAULT 5,
    small_project_credit_cost INTEGER NOT NULL DEFAULT 3,
    large_project_credit_cost INTEGER NOT NULL DEFAULT 10,
    custom_price_per_credit NUMERIC(10,2) NOT NULL DEFAULT 2.50,
    package_starter_name VARCHAR(60) NOT NULL DEFAULT 'Starter',
    package_starter_base_credits INTEGER NOT NULL DEFAULT 10,
    package_starter_bonus_credits INTEGER NOT NULL DEFAULT 0,
    package_starter_price NUMERIC(10,2) NOT NULL DEFAULT 25.00,
    package_starter_popular BOOLEAN NOT NULL DEFAULT FALSE,
    package_basic_name VARCHAR(60) NOT NULL DEFAULT 'Profissional',
    package_basic_base_credits INTEGER NOT NULL DEFAULT 50,
    package_basic_bonus_credits INTEGER NOT NULL DEFAULT 5,
    package_basic_price NUMERIC(10,2) NOT NULL DEFAULT 100.00,
    package_basic_popular BOOLEAN NOT NULL DEFAULT TRUE,
    package_professional_name VARCHAR(60) NOT NULL DEFAULT 'Empresarial',
    package_professional_base_credits INTEGER NOT NULL DEFAULT 100,
    package_professional_bonus_credits INTEGER NOT NULL DEFAULT 20,
    package_professional_price NUMERIC(10,2) NOT NULL DEFAULT 180.00,
    package_professional_popular BOOLEAN NOT NULL DEFAULT FALSE,
    package_enterprise_name VARCHAR(60) NOT NULL DEFAULT 'Corporativo',
    package_enterprise_base_credits INTEGER NOT NULL DEFAULT 250,
    package_enterprise_bonus_credits INTEGER NOT NULL DEFAULT 75,
    package_enterprise_price NUMERIC(10,2) NOT NULL DEFAULT 400.00,
    package_enterprise_popular BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tab_credit_pricing_settings (
    credit_pricing_id
)
VALUES (
    1
)
ON CONFLICT (credit_pricing_id) DO NOTHING;
