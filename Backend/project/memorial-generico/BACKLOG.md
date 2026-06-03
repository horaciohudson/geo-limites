# Backlog Inicial

## Prioridade P0

### MG-001 - Remover segredos do repositorio

- mover `jwt.secret` e chaves externas para ambiente
- revisar `.env.example` e documentar valores obrigatorios
- validar inicializacao sem segredo hardcoded

Resultado esperado:

- nenhuma chave sensivel em arquivo versionado

### MG-002 - Definir fluxo oficial de geracao

- inventariar rotas e servicos usados hoje
- escolher o fluxo backend oficial
- marcar fluxos paralelos como experimentais ou remover

Resultado esperado:

- um unico caminho backend para gerar memorial

### MG-003 - Eliminar hardcodes criticos do memorial

- remover pressuposto fixo de 25 lotes
- remover area e dimensoes fixas do prompt
- remover confrontacoes padrao fixas do fluxo principal
- remover coordenadas ficticias e notas de debug da saida final

Resultado esperado:

- memorial orientado por dados reais

### MG-004 - Testar DXF georreferenciado real

- selecionar arquivo de referencia
- validar extracao de coordenada base
- registrar sucesso, falha e confianca tecnica

Resultado esperado:

- criterio objetivo para dizer se o georreferenciamento esta fechado

### MG-004A - Fundacao multi-tenant para SAAS

- criar tabela de tenant
- associar tenant aos agregados principais
- inicializar tenant padrao
- propagar tenant nos cadastros novos

Resultado esperado:

- backend preparado para ativar multitenancy real na proxima sequencia

## Prioridade P1

### MG-005 - Criar modelo de dominio tecnico do memorial

- consolidar entidade intermediaria para vertices, lados, confrontantes, area e perimetro
- separar dados extraidos do texto final

Resultado esperado:

- IA recebe fatos tecnicos, nao DXF cru

### MG-006 - Classificar tipo de operacao

- identificar se o caso e desmembramento, unificacao, retificacao ou remembramento
- permitir override explicito quando necessario

Resultado esperado:

- o sistema escolhe a estrategia correta de memorial

### MG-007 - Fechar integracao propriedade x arquivos DXF

- implementar lista real de arquivos DXF na propriedade
- refletir associacao em resumo e detalhes
- usar essa relacao na geracao do memorial

Resultado esperado:

- propriedade e arquivo deixam de depender de heuristica fraca

### MG-008 - Corrigir inconsistencias de endpoint

- remover chamadas frontend para `/api/dxf/{id}/parse` se o endpoint nao existir
- alinhar fluxo async com backend real ou descontinuar
- revisar rotas divergentes de navegacao

Resultado esperado:

- sem caminhos mortos entre frontend e backend

### MG-008A - Ativar enforcement por tenant

- definir como o tenant atual sera resolvido
- revisar consultas por tenant
- preparar segregacao de acesso entre tenants

Resultado esperado:

- base pronta para operacao SAAS isolada

### MG-008B - Cadastro tenant-aware com e-mail

- incluir `email` no modelo de usuario
- cadastrar usuario com `tenantCode`
- garantir unicidade adequada por tenant e por e-mail
- permitir onboarding sem depender de bootstrap manual

Resultado esperado:

- usuario novo entra no sistema pelo fluxo normal de cadastro

### MG-008C - Confirmacao de e-mail e recuperacao de senha

- criar token de verificacao
- bloquear login de usuario nao verificado
- criar reenvio de confirmacao
- implementar recuperacao e redefinicao de senha

Resultado esperado:

- fluxo de identidade pronto para uso externo controlado

### MG-008D - Configuracao SMTP e envio real

- integrar SMTP por variaveis de ambiente
- preparar configuracao administravel
- permitir teste real com credenciais da Hostinger
- criar servico de envio e templates basicos

Resultado esperado:

- sistema envia e-mail real em ambiente local e hospedado

### MG-008E - Area admin minima do SAAS

- listar e gerir usuarios por tenant
- listar e gerir tenants
- reenviar confirmacao de e-mail
- ativar, inativar e bloquear usuarios
- expor configuracao SMTP ao super admin

Resultado esperado:

- operacao inicial deixa de depender de banco e ajuste manual

## Prioridade P2

### MG-009 - Melhorar confianca da extracao vetorial

- validar leitura de `LINE`, `LWPOLYLINE`, `POLYLINE`, `TEXT`, `MTEXT`, `INSERT`, `ATTRIB`
- consolidar normalizacao de vertices
- medir confianca da geometria extraida

### MG-010 - Criar matriz de observabilidade

- logs por etapa do pipeline
- correlacao por request ou sessao
- indicadores tecnicos para diagnostico

### MG-011 - Revisar prompts e separacao de responsabilidades

- transferir calculos tecnicos do prompt para codigo
- deixar a IA responsavel por redacao, nao por inferencia estrutural principal

### MG-012 - Padronizar documentacao tecnica

- consolidar documentos dispersos
- manter este projeto como referencia central

## Dependencias Principais

- `MG-001` antes de qualquer validacao externa mais seria
- `MG-002` antes de alinhar frontend
- `MG-003` e `MG-005` antes de chamar o sistema de generico
- `MG-004` como prova real da Fase 3

## Primeira Sprint Recomendada

- `MG-001`
- `MG-002`
- `MG-003`
 - `MG-004A`
- `MG-004`
