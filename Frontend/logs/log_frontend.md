🎨 Desenho renderizado com sucesso! Use Pan (arrastar) e Zoom (+/-) para ajustar.
Sidebar.tsx:142 🚀 handleGenerateMemorial chamado!
Sidebar.tsx:159 ✅ Todas as validações passaram
Sidebar.tsx:160 🔍 viewerActions: Object
Sidebar.tsx:161 🔍 onGenerateMemorial: async () => {
    const currentFile = files[currentFileIndex] || file;
    const currentFileId = currentFile?.id;
    if (!currentFileId || !currentFile || !dxfData) {
      setMemorialError("Dados d…
Sidebar.tsx:165 🎯 Chamando viewerActions.onGenerateMemorial()
Viewer.tsx:403 🚀🚀🚀 CÓDIGO NOVO DO VIEWER.TSX ESTÁ RODANDO! 🚀🚀🚀
Viewer.tsx:404 📊 Total de entidades DXF: 294
Viewer.tsx:416 ⏰ Timer do memorial iniciado no Viewer
Viewer.tsx:426 📋 Norma carregada do localStorage no Viewer: NBR ABNT-NBR-17047 94b1a695-2cc1-4ddf-adcb-43b42d2d1da7
Viewer.tsx:444 🏠 Dados da propriedade carregados no Viewer: 12345, INCRA-4567
Viewer.tsx:455 ✅ VIEWER: LWPOLYLINE tem 4 vértices
Viewer.tsx:455 ✅ VIEWER: LWPOLYLINE tem 8 vértices
6Viewer.tsx:455 ✅ VIEWER: LWPOLYLINE tem 2 vértices
Viewer.tsx:455 ✅ VIEWER: POLYLINE tem 1 vértices
4Viewer.tsx:455 ✅ VIEWER: LWPOLYLINE tem 2 vértices
2Viewer.tsx:455 ✅ VIEWER: LWPOLYLINE tem 4 vértices
Viewer.tsx:34 🏠 PropertyId encontrado no localStorage: 297a79ae-5305-4e18-906d-17d55255b80a
Viewer.tsx:35 🔍 Campo usado: propertyId
Viewer.tsx:506 🚀 Viewer enviando memorial com standardId: 94b1a695-2cc1-4ddf-adcb-43b42d2d1da7
Viewer.tsx:507 📋 DADOS COMPLETOS SENDO ENVIADOS PARA O BACKEND:
Viewer.tsx:508 - Entidades DXF: 294
Viewer.tsx:509 - StandardId: 94b1a695-2cc1-4ddf-adcb-43b42d2d1da7
Viewer.tsx:510 - PropertyData: Object
Viewer.tsx:513 🔍 DEBUG CRÍTICO - PRIMEIRAS 3 ENTIDADES MAPEADAS:
Viewer.tsx:515    Entidade 1: Object
Viewer.tsx:515    Entidade 2: Object
Viewer.tsx:515    Entidade 3: Object
Viewer.tsx:528 ✅ DADOS DA PROPRIEDADE CONFIRMADOS:
Viewer.tsx:529 - ID: undefined
Viewer.tsx:530 - Registro: 12345, INCRA-4567
Viewer.tsx:531 - Nome: 12345, INCRA-4567
Viewer.tsx:532 - Rua: Rua Maria Ivani da Silva
Viewer.tsx:533 - Bairro: Gameleira
Viewer.tsx:534 - Cidade: Horizonte
Viewer.tsx:535 - Estado: CE
Viewer.tsx:536 - Proprietário: DBL Empreendimentos LTDA Localização
Viewer.tsx:537 - Documento: 070.369.494-49
Viewer.tsx:538 - Tipo: URBAN
Viewer.tsx:540 🔍 VERIFICAÇÃO FINAL - O que o backend deve receber:
Viewer.tsx:541 requestData.propertyData = {
  "registrationNumber": "12345, INCRA-4567",
  "name": "12345, INCRA-4567",
  "street": "Rua Maria Ivani da Silva",
  "number": "123",
  "neighborhood": "Gameleira",
  "city": "Horizonte",
  "state": "CE",
  "ownerName": "DBL Empreendimentos LTDA Localização",
  "ownerDocument": "070.369.494-49",
  "propertyType": "URBAN"
}
Viewer.tsx:551 🔍 VERIFICAÇÃO FINAL ANTES DO ENVIO:
Viewer.tsx:552    └─ propertyId: 297a79ae-5305-4e18-906d-17d55255b80a
Viewer.tsx:553    └─ tipo propertyId: string
Viewer.tsx:554    └─ propertyId é null? false
Viewer.tsx:555    └─ propertyId é undefined? false
Viewer.tsx:573 🎯 Viewer usando Claude AI - Endpoint: /memorial/generate-gpt
Viewer.tsx:84 🌐 URL ATUAL DO VIEWER: Object
Viewer.tsx:657 🎨 ESTADO ATUAL DO VIEWER: Object
Viewer.tsx:309 ⏰ Iniciando timer do memorial no Viewer...
Viewer.tsx:84 🌐 URL ATUAL DO VIEWER: Object
Viewer.tsx:657 🎨 ESTADO ATUAL DO VIEWER: Object
Viewer.tsx:330 ⏱️ Timer memorial: 1 segundos
Viewer.tsx:84 🌐 URL ATUAL DO VIEWER: Object
Viewer.tsx:657 🎨 ESTADO ATUAL DO VIEWER: Object
Viewer.tsx:330 ⏱️ Timer memorial: 2 segundos
Viewer.tsx:84 🌐 URL ATUAL DO VIEWER: Object
Viewer.tsx:657 🎨 ESTADO ATUAL DO VIEWER: Object
Viewer.tsx:330 ⏱️ Timer memorial: 3 segundos
Viewer.tsx:84 🌐 URL ATUAL DO VIEWER: Object
Viewer.tsx:657 🎨 ESTADO ATUAL DO VIEWER: Object
Viewer.tsx:330 ⏱️ Timer memorial: 4 segundos
Viewer.tsx:84 🌐 URL ATUAL DO VIEWER: Object
Viewer.tsx:657 🎨 ESTADO ATUAL DO VIEWER: Object
Viewer.tsx:587 ✅ Memorial gerado, parando timer...
Viewer.tsx:84 🌐 URL ATUAL DO VIEWER: Object
Viewer.tsx:657 🎨 ESTADO ATUAL DO VIEWER: Object
Viewer.tsx:336 🛑 Limpando timer do memorial...
Viewer.tsx:84 🌐 URL ATUAL DO VIEWER: Object
Viewer.tsx:657 🎨 ESTADO ATUAL DO VIEWER: Object