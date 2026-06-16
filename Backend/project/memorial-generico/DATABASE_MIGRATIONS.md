# Database Migrations

## Objetivo

Padronizar a evolucao do banco do backend com migrations versionadas em `Backend/src/main/resources/db/migration`, eliminando a dependencia de criacao automatica de schema por Hibernate.

## Estrategia aplicada

## Enums

O arquivo legado `resources/tables/enums.sql` existe, mas ele nao e mais a fonte de verdade do schema.

Na linha atual de migrations, os enums do sistema foram modelados como:

- `VARCHAR`
- `CHECK CONSTRAINT`

Essa escolha foi feita para manter compatibilidade direta com o mapeamento JPA atual usando `@Enumerated(EnumType.STRING)` e com `ddl-auto=validate`.

Os casos cobertos hoje sao:

- `tab_roles.name`
- `tab_credit_transactions.transaction_type`
- `tab_credit_purchases.status`

### V1 - Baseline do schema principal

Arquivo:

- `V1__baseline_core_schema.sql`

Responsabilidade:

- criar o schema principal do sistema
- cobrir usuarios, perfis, tokens, auditoria, propriedades, arquivos, normas, templates e creditos
- criar indices basicos
- criar a view `vw_properties_summary`

### V2 - Fundacao SAAS

Arquivo:

- `V2__saas_tenant_foundation.sql`

Responsabilidade:

- criar `tab_tenants`
- adicionar `tenant_id` em `tab_users`, `tab_properties` e `tab_files`
- criar foreign keys e indices
- inserir o tenant padrao `default`
- fazer backfill dos registros existentes para o tenant padrao

### V3 - Bootstrap minimo

Arquivo:

- `V3__bootstrap_reference_data.sql`

Responsabilidade:

- inserir `ROLE_ADMIN`
- inserir `ROLE_USER`
- garantir uma norma padrao global para o sistema iniciar utilizavel

## Configuracao do backend

O backend foi ajustado para:

- usar Flyway no perfil principal
- usar Flyway no perfil `dev`
- trocar `ddl-auto=update` por `ddl-auto=validate`

O perfil `simple` continua sem Flyway porque usa H2 em memoria e nao deve consumir migrations PostgreSQL.

## Comportamento esperado

### Banco novo

- o Flyway executa `V1`
- em seguida executa `V2`
- em seguida executa `V3`
- o schema final ja nasce com base pronta para SAAS

### Banco existente sem historico Flyway

- `baseline-on-migrate=true` cria a linha de base
- `V2` e `V3` rodam como evolucao incremental
- a fundacao de tenant entra sem precisar recriar o banco

## Bootstrap do admin

O usuario admin inicial nao ficou em migration SQL para evitar senha fixa versionada.

Ele continua sendo provisionado em runtime pelo `DataInitializer`, mas agora:

- depende de configuracao explicita
- nao usa mais credenciais hardcoded no codigo
- reaproveita os dados de referencia que ja vieram das migrations

Propriedades suportadas:

- `memorialpro.bootstrap.admin.enabled`
- `memorialpro.bootstrap.admin.username`
- `memorialpro.bootstrap.admin.password`
- `memorialpro.bootstrap.admin.full-name`

Variaveis de ambiente equivalentes:

- `BOOTSTRAP_ADMIN_ENABLED`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_FULL_NAME`

## Proxima sequencia recomendada

1. Criar `V3` para remocao de segredos do bootstrap e ajustes de configuracao se for necessario refletir algo em banco.
2. Criar migrations especificas para enforcement por tenant quando a segregacao SAAS for ativada.
3. Toda mudanca estrutural futura deve entrar por migration versionada, nunca por ajuste manual em `resources/tables`.
