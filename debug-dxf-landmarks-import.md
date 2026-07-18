# Debug Session: dxf-landmarks-import

- Status: OPEN
- Sintoma: o upload/importacao do DXF ainda nao preenche a grade de landmarks no cadastro do imovel.
- Objetivo: descobrir em qual etapa o fluxo `selecionar arquivo -> upload -> extracao -> merge -> renderizacao da grade` falha.
- Debug Server: http://127.0.0.1:7779/event
- Log File: `.dbg/trae-debug-log-dxf-landmarks-import.ndjson`

## Hipoteses

1. O `onChange` de `PropertyFiles` nao esta disparando o fluxo assíncrono esperado em `PropertyRegister`.
2. O upload para `/api/dxf/upload` retorna sucesso, mas o arquivo nao recebe `id` valido no frontend.
3. O endpoint `/api/dxf/{id}/landmarks` esta retornando lista vazia ou erro silencioso.
4. Os landmarks sao extraidos, mas o `setFormData` nao esta atualizando a grade por causa do merge/dedupe.
5. A grade atualiza, mas os pontos importados sao sobrescritos por outro estado logo em seguida.

## Plano

1. Instrumentar frontend no fluxo de arquivos e merge de landmarks.
2. Instrumentar backend na rota de extracao `/api/dxf/{id}/landmarks`.
3. Reproduzir com um DXF real.
4. Confirmar ou refutar hipoteses com evidencias.
5. Aplicar correcao minima baseada nas evidencias.

## Andamento

- Instrumentacao adicionada no frontend e backend.
- Aguardando reproducao do usuario para coleta de evidencias.
