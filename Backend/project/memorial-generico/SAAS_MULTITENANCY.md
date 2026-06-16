# SAAS e Multitenancy

## Objetivo

Preparar o backend para evoluir de aplicacao mono-tenant por usuario para um SAAS multi-tenant, sem quebrar o fluxo atual e sem obrigar a virada completa agora.

## O que ja foi preparado no codigo

- entidade `Tenant` criada no backend
- relacao opcional de `Tenant` com `User`
- relacao opcional de `Tenant` com `Property`
- relacao opcional de `Tenant` com `FileMetadata`
- servico `TenantProvisioningService` para garantir tenant padrao
- `DataInitializer` ajustado para criar e vincular o tenant padrao
- `AuthService` ajustado para registrar novos usuarios no tenant padrao
- `PropertyService` ajustado para herdar tenant do usuario dono
- `FileMetadataService` ajustado para herdar tenant do usuario dono
- `AuthUtils` preparado para expor `tenantId` do usuario autenticado

## O que isso significa na pratica

Hoje o sistema continua funcionando no modelo atual, mas agora:

- cada usuario pode estar associado a um tenant
- cada propriedade pode carregar o tenant do usuario criador
- cada arquivo DXF pode carregar o tenant do usuario dono
- o banco passa a ter a base estrutural necessaria para a virada SAAS

## O que ja entrou de enforcement inicial

Nesta etapa, o backend passou a validar `tenant` em fluxos criticos sem abandonar o controle por usuario dono.

Entrou enforcement inicial em:

- consultas principais de propriedades
- busca de propriedade por id
- resumo, contagem e lista recente de propriedades
- confrontacoes, marcos e documentos vinculados a propriedades
- listagem, leitura e exclusao de arquivos DXF
- templates pelo tenant do usuario dono
- normas de memorial pelo tenant do dono e pelas normas globais `owner = null`
- leituras e administracao basica de usuarios restritas ao tenant atual

Regra atual:

- o registro precisa pertencer ao mesmo tenant do usuario autenticado
- dentro do tenant, a regra de dono do registro continua valendo para esta primeira fase
- em usuarios, operacoes administrativas ficam reservadas ao admin do tenant

Isso reduz risco de vazamento cross-tenant sem alterar ainda o modelo funcional existente.

## O que ainda falta para a virada completa

### 1. Enforcement por tenant

- revisar usos restantes de `findById` puro em recursos compartilhaveis
- decidir se `templates` e `normas` receberao `tenant_id` proprio em nova migration ou se continuarao isolados pelo dono
- impedir que usuarios de tenants diferentes acessem dados cruzados em todo o sistema

### 2. Resolucao do tenant atual

- definir estrategia oficial de resolucao:
- subdominio
- header
- claim no JWT
- tenant selecionado no login

### 3. Provisionamento comercial

- cadastro de tenant
- plano do tenant
- status do tenant
- isolamento administrativo

### 4. Politica de usuario

- usuario dono do tenant
- usuarios membros
- papeis por tenant
- permissao cross-tenant apenas para super admin

### 5. Contratos e API

- expor `tenantId` nos DTOs necessarios
- definir endpoints administrativos para tenant
- criar fluxo de onboarding

## Estrategia recomendada

### Etapa atual

Manter o sistema em compatibilidade, com tenant padrao e sem exigir chave de tenant no frontend.

### Proxima etapa

Introduzir resolucao explicita de tenant no contexto autenticado.

### Etapa seguinte

Migrar consultas criticas para filtro por tenant e usuario.

## Criterio de sucesso desta fundacao

Esta etapa sera considerada bem feita quando:

- o backend compilar e continuar funcional
- o banco criar a estrutura de tenant sem quebrar os dados atuais
- novos usuarios, propriedades e arquivos nascerem vinculados ao tenant padrao
- a proxima iteracao ja poder ativar enforcement por tenant sem refazer a modelagem
