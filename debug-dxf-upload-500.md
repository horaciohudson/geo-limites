# Debug Session: dxf-upload-500

Status: [OPEN]

## Sintoma
- Ao cadastrar um DXF no `Cadastro de Imovel`, o frontend recebe `500 Internal Server Error` ao persistir os arquivos tecnicos no banco.
- O erro observado aparece durante o fluxo que passa por `PropertyRegister.tsx`.

## Escopo
- Frontend: `Frontend/src/pages/PropertyRegister.tsx`
- Backend: upload DXF e persistencia/vinculo de arquivo com propriedade

## Hipoteses
1. O backend falha ao tentar vincular o arquivo a um `propertyId` inexistente ou invalido durante o upload.
2. O backend falha ao atualizar a marcacao de `primaryForProperty` em arquivos ja vinculados ao imovel.
3. O frontend envia `propertyId` ou `primaryForProperty` em formato inesperado e o controller entra em erro ao processar os parametros.
4. O endpoint de upload grava o arquivo fisico, mas falha ao persistir `FileMetadata` com o relacionamento `property`.
5. O erro 500 nao acontece no upload em si, mas na chamada posterior de persistencia do imovel em `persistTechnicalFilesToDatabase()`.

## Evidencias Coletadas
- Pendente

## Instrumentacao
- Pendente

## Analise
- Pendente

## Correcao
- Pendente

## Verificacao
- Pendente
