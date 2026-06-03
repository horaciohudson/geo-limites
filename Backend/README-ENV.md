# Configuracao de Variaveis de Ambiente

## Objetivo

O backend deve subir sem segredos versionados no repositorio.

As configuracoes sensiveis agora devem entrar por:

- arquivo `.env` local
- variaveis de ambiente do sistema
- configuracao do ambiente de deploy

## Arquivo de exemplo

Use o arquivo [`.env.example`](file:///c:/Desenvolvimento/sigeves-antigos/SistemasNoForno/memorial-pro/Backend/.env.example) como modelo.

No diretório `Backend`:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Variaveis principais

### Banco de dados

```env
DB_URL=jdbc:postgresql://localhost:5432/memorial_pro_db
DB_USERNAME=postgres
DB_PASSWORD=altere-aqui
```

### JWT

```env
JWT_SECRET=coloque-aqui-uma-chave-longa-com-no-minimo-64-caracteres
```

### Cadastro e confirmacao de e-mail

```env
AUTH_AUTO_VERIFY_USERS=false
AUTH_VERIFICATION_TOKEN_HOURS=24
APP_FRONTEND_URL=https://www.geolimites.com.br
CORS_ALLOWED_ORIGIN_PATTERNS=https://www.geolimites.com.br,https://geolimites.com.br
PUBLIC_APP_URL=https://www.geolimites.com.br
```

### SMTP / Hostinger

```env
MAIL_ENABLED=false
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=nao-responda@seudominio.com
MAIL_PASSWORD=altere-aqui
MAIL_PROTOCOL=smtp
MAIL_AUTH=true
MAIL_TLS=true
MAIL_SSL=false
MAIL_FROM_ADDRESS=nao-responda@seudominio.com
MAIL_FROM_NAME=Geo Limites
```

### Geracao assistida

```env
ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
CLAUDE_MODEL=claude-3-haiku-20240307
CLAUDE_MAX_TOKENS=8192
CLAUDE_CHUNK_DELAY=10000
```

### Bootstrap opcional do admin

```env
BOOTSTRAP_ADMIN_ENABLED=false
BOOTSTRAP_ADMIN_USERNAME=admin@geolimites.com
BOOTSTRAP_ADMIN_PASSWORD=altere-aqui
BOOTSTRAP_ADMIN_FULL_NAME=Administrador GeoLimites

DXF_STORAGE_DIR=uploads/dxf
TEMPLATES_STORAGE_DIR=templates
```

## Como o backend le

O backend carrega variaveis do `.env` local no bootstrap da aplicacao e tambem aceita variaveis de ambiente tradicionais do sistema.

As propriedades principais atualmente ligadas ao ambiente sao:

- `spring.datasource.url` via `DB_URL`
- `spring.datasource.username` via `DB_USERNAME`
- `spring.datasource.password` via `DB_PASSWORD`
- `jwt.secret` via `JWT_SECRET`
- `memorialpro.auth.auto-verify-users` via `AUTH_AUTO_VERIFY_USERS`
- `memorialpro.auth.frontend-url` via `APP_FRONTEND_URL`
- `memorialpro.cors.allowed-origin-patterns` via `CORS_ALLOWED_ORIGIN_PATTERNS`
- `geolimites.public-url` via `PUBLIC_APP_URL`
- `spring.mail.*` via `MAIL_*`
- `memorialpro.claude.api-key` via `ANTHROPIC_API_KEY`
- bootstrap do admin via `BOOTSTRAP_ADMIN_*`
- armazenamento persistente via `DXF_STORAGE_DIR` e `TEMPLATES_STORAGE_DIR`

Observacao: as chaves `memorialpro.*` foram mantidas por compatibilidade com a configuracao atual da aplicacao e nao devem ser renomeadas sem uma migracao tecnica dedicada.

## Regras de seguranca

- nunca commite arquivos `.env` reais
- nunca commite chaves reais em `.env.new`, `.env.fixed` ou arquivos auxiliares
- trate `JWT_SECRET`, `DB_PASSWORD`, `ANTHROPIC_API_KEY` e `MAIL_PASSWORD` como obrigatorios no ambiente real
- se uma chave foi exposta, revogue e gere outra imediatamente

## Observacoes

- o perfil principal e o perfil `dev` exigem segredo JWT via ambiente
- o perfil `simple` usa um placeholder local apenas para facilitar testes rapidos com H2
- roles, tenant padrao e norma padrao agora entram por migration; o admin inicial entra apenas se o bootstrap estiver habilitado
- para teste local igual a VPS, mantenha `AUTH_AUTO_VERIFY_USERS=false`, `MAIL_ENABLED=true` e use as credenciais SMTP reais da Hostinger
