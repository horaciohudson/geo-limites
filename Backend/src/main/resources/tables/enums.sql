

CREATE TYPE credit_transaction_type AS ENUM (
    'PURCHASE',
    'USE');

CREATE TYPE credit_purchase_status AS ENUM (
    'PENDING',
    'PAID',
    'FAILED');


CREATE TYPE role_name AS ENUM (
 	'ROLE_ADMIN', --Administrador
    'ROLE_USER'   --Usuário comum
);