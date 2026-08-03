

CREATE TYPE credit_transaction_type AS ENUM (
    'PURCHASE',
    'USE');

CREATE TYPE credit_purchase_status AS ENUM (
    'PENDING',
    'PAID',
    'FAILED');


CREATE TYPE role_name AS ENUM (
        'ROLE_ADMIN', --Administrador da plataforma
    'ROLE_TENANT_ADMIN', --Administrador da empresa
    'ROLE_USER'   --Usuário comum
);
