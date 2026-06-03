✅ Autenticação definida no SecurityContext
2025-12-05T15:33:17.506-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : 🤖 Iniciando geração de memorial com IA
2025-12-05T15:33:17.506-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : 📊 Projeto: 12345, INCRA-4567, Entidades: 294, StandardId: 94b1a695-2cc1-4ddf-adcb-43b42d2d1da7
2025-12-05T15:33:17.506-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : 🔍 DEBUG CRÍTICO - PropertyId recebido no controller: 297a79ae-5305-4e18-906d-17d55255b80a
2025-12-05T15:33:17.506-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ PropertyId NÃO É NULL: 297a79ae-5305-4e18-906d-17d55255b80a
2025-12-05T15:33:17.509-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select u1_0.user_id,u1_0.active,u1_0.created_at,u1_0.full_name,u1_0.owner_id,u1_0.password,u1_0.updated_at,u1_0.username from tab_users u1_0 where u1_0.username=?
2025-12-05T15:33:17.512-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select r1_0.user_id,r1_1.role_id,r1_1.name from tab_users_roles r1_0 join tab_roles r1_1 on r1_1.role_id=r1_0.role_id where r1_0.user_id=?
2025-12-05T15:33:17.515-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : 🎯 Processamento direto com IA
2025-12-05T15:33:17.515-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : 📊 Total de entidades recebidas: 294
2025-12-05T15:33:17.516-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 4 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.516-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 8 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.516-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.516-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.517-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.517-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.517-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.517-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.517-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 1 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.517-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.517-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.517-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.517-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 2 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.518-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 4 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.518-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Convertidos 4 vértices de DxfParser.Point para Map
2025-12-05T15:33:17.518-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ TODAS as 294 entidades foram adicionadas na lista 'ADDED'
2025-12-05T15:33:17.520-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : 📊 Resumo das entidades por tipo: {LWPOLYLINE=14, LINE=253, TEXT=16, ARC=9, INSERT=1, POLYLINE=1}
2025-12-05T15:33:17.523-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : 🤖 Gerando memorial com IA...
2025-12-05T15:33:17.523-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : 🚀 Iniciando geração de memorial com validação de créditos
2025-12-05T15:33:17.523-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : 👤 UserId: 78521575-bef1-40f3-be10-0f3429a66783, StandardId: 94b1a695-2cc1-4ddf-adcb-43b42d2d1da7, PropertyId: 297a79ae-5305-4e18-906d-17d55255b80a
2025-12-05T15:33:17.523-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : 💰 === VALIDAÇÃO DE CRÉDITOS ===
2025-12-05T15:33:17.526-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select uc1_0.total_credits from tab_user_credits uc1_0 where uc1_0.user_id=?
2025-12-05T15:33:17.530-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialCreditIntegrationService : 📊 Lotes estimados: 25
2025-12-05T15:33:17.530-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialCreditIntegrationService : 💰 Créditos necessários: 10 (para 25 lotes)
2025-12-05T15:33:17.530-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : 📊 Saldo atual: 5 créditos
2025-12-05T15:33:17.530-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : 📊 Necessário: 10 créditos
2025-12-05T15:33:17.530-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : 📊 Lotes estimados: 25
2025-12-05T15:33:17.530-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : ⚠️ MODO DESENVOLVIMENTO: Validação de créditos desabilitada
2025-12-05T15:33:17.531-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : 🤖 === GERAÇÃO DO MEMORIAL ===
2025-12-05T15:33:17.531-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🤖 Iniciando geração de memorial com Claude AI
2025-12-05T15:33:17.531-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🧹 Cache limpo para esta requisição - Memorial será gerado do zero
2025-12-05T15:33:17.531-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔧 Config: claude-3-haiku-20240307 | Timeout: 5min | Retries: 3 | Fallback: false | Particionamento: true
2025-12-05T15:33:17.531-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔍 Analisando geometria...
2025-12-05T15:33:17.532-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔄 Convertidas 294 entidades DXF para formato de mapa
2025-12-05T15:33:17.533-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔍 Iniciando extração de pontos das entidades DXF...
2025-12-05T15:33:17.533-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Processando 294 entidades adicionadas
2025-12-05T15:33:17.533-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 50 pontos processados
2025-12-05T15:33:17.534-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 100 pontos processados
2025-12-05T15:33:17.534-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 150 pontos processados
2025-12-05T15:33:17.534-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 200 pontos processados
2025-12-05T15:33:17.534-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 250 pontos processados
2025-12-05T15:33:17.535-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 300 pontos processados
2025-12-05T15:33:17.535-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 350 pontos processados
2025-12-05T15:33:17.535-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 400 pontos processados
2025-12-05T15:33:17.535-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 450 pontos processados
2025-12-05T15:33:17.535-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 500 pontos processados
2025-12-05T15:33:17.535-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Progresso extração: 550 pontos processados
2025-12-05T15:33:17.536-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Processando 0 entidades modificadas
2025-12-05T15:33:17.536-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Processando 0 entidades removidas
2025-12-05T15:33:17.536-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Extração concluída: 586 pontos válidos extraídos
2025-12-05T15:33:17.536-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔍 Primeiros 5 pontos extraídos:
2025-12-05T15:33:17.542-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    P1 = (2888.304684234891, 1468.782387345545)
2025-12-05T15:33:17.542-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    V2 = (2888.304684234891, 1468.782387345545)
2025-12-05T15:33:17.542-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    V3 = (2888.304684234891, 1574.231996388622)
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    V4 = (3013.979542497769, 1574.231996388622)
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    V5 = (3013.979542497769, 1468.782387345545)
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ 586 coordenadas reais extraídas com sucesso
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🎯 NOVA ESTRATÉGIA: Extraindo coordenadas SIRGAS 2000 com 5 métodos...
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : ========================================
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : EXTRAINDO COORDENADAS GEOREFERENCIADAS
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : ========================================
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Estrategia 1: Buscando em HEADER variables...
2025-12-05T15:33:17.543-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Nao encontrado em HEADER variables
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Estrategia 2: Buscando em TEXTOS...
2025-12-05T15:33:17.543-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Nao encontrado em TEXTOS
2025-12-05T15:33:17.543-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Estrategia 3: Buscando em XDATA...
2025-12-05T15:33:17.544-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Nao encontrado em XDATA
2025-12-05T15:33:17.544-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Estrategia 4: Buscando em INSERTs...
2025-12-05T15:33:17.544-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Nao encontrado em INSERTs
2025-12-05T15:33:17.544-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Estrategia 5: Inferindo de coordenadas existentes (VERSAO MELHORADA)...
2025-12-05T15:33:17.544-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Total de coordenadas coletadas: 293 pontos
2025-12-05T15:33:17.546-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Bounding box: X[2809.069444615501 - 3247.515848919857], Y[1459.9797407775 - 1574.231996479891]
2025-12-05T15:33:17.546-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Coordenada NAO e SIRGAS: E=2809.069444615501, N=1459.9797407775
2025-12-05T15:33:17.546-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Coordenada NAO e SIRGAS: E=3247.515848919857, N=1459.9797407775
2025-12-05T15:33:17.546-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Coordenadas locais nao sao SIRGAS (X: 2809.069444615501-3247.515848919857, Y: 1459.9797407775-1574.231996479891)
2025-12-05T15:33:17.547-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Coordenadas georeferenciadas NAO encontradas!
2025-12-05T15:33:17.547-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.DxfGeoReferenciaExtractorService : Sistema usara coordenadas locais do DXF
2025-12-05T15:33:17.547-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.CadMemorial.service.PropertyService  : 🔍 Buscando propriedade 297a79ae-5305-4e18-906d-17d55255b80a com relacionamentos do usuário 78521575-bef1-40f3-be10-0f3429a66783
2025-12-05T15:33:17.557-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select p1_0.property_id,p1_0.active,p1_0.average_depth,p1_0.central_meridian,p1_0.city,p1_0.complement,p1_0.coordinate_system,p1_0.created_at,p1_0.datum,p1_0.east_boundary,p1_0.floor_area_ratio,p1_0.internal_code,l1_0.property_id,l1_0.landmark_id,l1_0.coordinate_x,l1_0.coordinate_y,l1_0.coordinate_z,l1_0.created_at,l1_0.description,l1_0.entrance_azimuth,l1_0.exit_azimuth,l1_0.landmark_material,l1_0.landmark_name,l1_0.landmark_type,l1_0.previous_distance,l1_0.sequence_order,l1_0.updated_at,p1_0.lot_coverage,p1_0.main_frontage,p1_0.name,p1_0.neighborhood,p1_0.north_boundary,p1_0.number,p1_0.observations,p1_0.owner_document,p1_0.owner_email,p1_0.owner_id_number,p1_0.owner_name,p1_0.owner_phone,p1_0.property_type,p1_0.registration_book,p1_0.registration_date,p1_0.registration_number,p1_0.registration_page,p1_0.registry_office,p1_0.restrictions,p1_0.sirgas_e,p1_0.sirgas_n,p1_0.sirgas_source,p1_0.south_boundary,p1_0.state,p1_0.street,p1_0.total_area,p1_0.total_perimeter,p1_0.updated_at,p1_0.user_id,p1_0.utm_zone,p1_0.west_boundary,p1_0.zip_code,p1_0.zoning from tab_properties p1_0 left join tab_property_landmarks l1_0 on p1_0.property_id=l1_0.property_id where p1_0.property_id=? and p1_0.user_id=? and p1_0.active=true
2025-12-05T15:33:17.561-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select b1_0.property_id,b1_0.boundary_id,b1_0.adjacent_document,b1_0.adjacent_name,b1_0.adjacent_type,b1_0.azimuth,b1_0.created_at,b1_0.direction,b1_0.extension,b1_0.full_description,b1_0.sequence_order,b1_0.updated_at from tab_property_boundaries b1_0 where b1_0.property_id=?
2025-12-05T15:33:17.563-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select d1_0.property_id,d1_0.document_id,d1_0.created_at,d1_0.description,d1_0.document_type,d1_0.file_name,d1_0.file_path,d1_0.file_size,d1_0.mime_type,d1_0.uploaded_by from tab_property_documents d1_0 where d1_0.property_id=?
2025-12-05T15:33:17.563-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.CadMemorial.service.PropertyService  : ✅ Propriedade encontrada com 0 marcos, 0 confrontações, 0 documentos
2025-12-05T15:33:17.565-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select u1_0.user_id,u1_0.active,u1_0.created_at,u1_0.full_name,u1_0.owner_id,u1_0.password,r1_0.user_id,r1_1.role_id,r1_1.name,u1_0.updated_at,u1_0.username from tab_users u1_0 left join tab_users_roles r1_0 on u1_0.user_id=r1_0.user_id left join tab_roles r1_1 on r1_1.role_id=r1_0.role_id where u1_0.user_id=?
2025-12-05T15:33:17.568-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔍 Tentando coordenada SIRGAS manual da propriedade...
2025-12-05T15:33:17.568-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ❌ Coordenada SIRGAS manual não encontrada
2025-12-05T15:33:17.568-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ⚠️ COORDENADA SIRGAS NÃO ENCONTRADA - Usando extração antiga como fallback
2025-12-05T15:33:17.568-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 🎯 MELHORADO: Extraindo coordenadas reais SIRGAS 2000...
2025-12-05T15:33:17.569-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 📝 FASE 1: Extraindo coordenadas de textos DXF...
2025-12-05T15:33:17.569-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 📝 Analisando texto potencial: 'RUA MARIA IVANI DA SILVA'
2025-12-05T15:33:17.569-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 📝 Analisando texto potencial: 'RUA TEREZINHA ONOFRE LIMA'
2025-12-05T15:33:17.569-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 📝 Analisando texto potencial: 'AVENIDA THALES BEZERRA VERAS'
2025-12-05T15:33:17.569-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 📝 Processados 16 textos, 0 com coordenadas, 0 coordenadas extraídas
2025-12-05T15:33:17.569-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 📐 FASE 2: Extraindo coordenadas de polylines...
2025-12-05T15:33:17.570-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 📐 Processadas 15 polylines
2025-12-05T15:33:17.570-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 🔺 FASE 3: Extraindo vértices gerais como backup...
2025-12-05T15:33:17.570-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : 🔺 Poucas coordenadas encontradas (0), extraindo vértices gerais
2025-12-05T15:33:17.571-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : ✅ FASE 4: Validando coordenadas SIRGAS 2000...
2025-12-05T15:33:17.572-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.CoordinateExtractionService      : ✅ Coordenadas SIRGAS 2000 extraídas: 0 válidas de 0 encontradas
2025-12-05T15:33:17.572-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🛣️ Extraindo nomes de ruas...
2025-12-05T15:33:17.572-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔄 Rua identificada por correspondência parcial: RUA SDO 31 -> RUA SDO 31
2025-12-05T15:33:17.574-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔄 Rua identificada por correspondência parcial: RUA MARIA IVANI DA SILVA -> RUA MARIA IVANI DA SILVA
2025-12-05T15:33:17.575-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔄 Rua identificada por correspondência parcial: RUA TEREZINHA ONOFRE LIMA -> RUA TEREZINHA ONOFRE LIMA
2025-12-05T15:33:17.576-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔄 Rua identificada por correspondência parcial: AVENIDA THALES BEZERRA VERAS -> AVENIDA THALES BEZERRA VERAS
2025-12-05T15:33:17.579-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🛣️ Ruas identificadas: 4 - [RUA MARIA IVANI DA SILVA, RUA SDO 31, RUA TEREZINHA ONOFRE LIMA, AVENIDA THALES BEZERRA VERAS]
2025-12-05T15:33:17.579-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🏘️ Extraindo confrontações específicas...
2025-12-05T15:33:17.579-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🏘️ Extraindo confrontações específicas...
2025-12-05T15:33:17.580-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🏘️ Confrontações extraídas: N=0, S=0, L=0, O=0
2025-12-05T15:33:17.580-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📐 Calculando áreas individuais dos lotes...
2025-12-05T15:33:17.580-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Calculando áreas individuais dos lotes...
2025-12-05T15:33:17.580-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 Total de entidades recebidas: 294
2025-12-05T15:33:17.580-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ✅ Área calculada: {:.2f}m² (13252.364670364186 vértices válidos)
2025-12-05T15:33:17.580-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 1 - Área calculada: 13252.364670364186 m²
2025-12-05T15:33:17.580-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ✅ LOTE_01 = {:.2f}m²
2025-12-05T15:33:17.581-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ✅ Área calculada: {:.2f}m² (3344.205049031414 vértices válidos)
2025-12-05T15:33:17.581-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 2 - Área calculada: 3344.205049031414 m²
2025-12-05T15:33:17.581-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ✅ LOTE_02 = {:.2f}m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.581-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 3 - Área calculada: null m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.581-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 4 - Área calculada: null m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.581-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 5 - Área calculada: null m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.581-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 6 - Área calculada: null m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.581-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 7 - Área calculada: null m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.581-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.582-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 8 - Área calculada: null m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=1), precisa >2
2025-12-05T15:33:17.582-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 9 - Área calculada: null m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.582-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 10 - Área calculada: null m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.582-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 11 - Área calculada: null m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.582-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 12 - Área calculada: null m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 🔍 DIAGNÓSTICO: Poucos vértices (size=2), precisa >2
2025-12-05T15:33:17.582-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 13 - Área calculada: null m²
2025-12-05T15:33:17.582-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ⚠️ Área rejeitada (muito pequena): {:.2f}m²
2025-12-05T15:33:17.582-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ✅ Área calculada: {:.2f}m² (13252.364670364186 vértices válidos)
2025-12-05T15:33:17.582-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 14 - Área calculada: 13252.364670364186 m²
2025-12-05T15:33:17.582-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ✅ LOTE_03 = {:.2f}m²
2025-12-05T15:33:17.582-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ✅ Área calculada: {:.2f}m² (898.567721044179 vértices válidos)
2025-12-05T15:33:17.583-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📐 Polyline 15 - Área calculada: 898.567721044179 m²
2025-12-05T15:33:17.583-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : ✅ LOTE_04 = {:.2f}m²
2025-12-05T15:33:17.583-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📊 RESULTADO: 4 lotes com áreas válidas
2025-12-05T15:33:17.583-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📊 Polylines encontradas: 15
2025-12-05T15:33:17.583-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.DxfTextExtractorService    : 📊 Áreas rejeitadas: 11
2025-12-05T15:33:17.583-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ⚠️ NENHUMA COORDENADA REAL EXTRAÍDA - Usando coordenadas genéricas
2025-12-05T15:33:17.583-03:00  WARN 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ⚠️ USANDO COORDENADAS GENÉRICAS NO MEMORIAL
2025-12-05T15:33:17.583-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔧 OTIMIZAÇÃO: Filtrando pontos extraídos para reduzir volume...
2025-12-05T15:33:17.583-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔧 FILTRO AGRESSIVO: Reduzindo 586 pontos para ~25-30 essenciais
2025-12-05T15:33:17.584-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Após remoção agressiva de duplicatas: 76 pontos
2025-12-05T15:33:17.585-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ REDUÇÃO CONCLUÍDA: 586 -> 10 pontos (99% redução)
2025-12-05T15:33:17.585-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔍 Amostra dos pontos finais: 10 pontos de P1 a P11
2025-12-05T15:33:17.585-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Pontos reduzidos: 586 -> 10 (redução de 99%)
2025-12-05T15:33:17.587-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select ms1_0.standard_id,ms1_0.active,ms1_0.created_at,ms1_0.description,ms1_0.is_default,ms1_0.name,ms1_0.owner_id,ms1_0.prompt_template,ms1_0.standard_text,ms1_0.updated_at from tab_memorial_standards ms1_0 where ms1_0.standard_id=?
2025-12-05T15:33:17.591-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select u1_0.user_id,u1_0.active,u1_0.created_at,u1_0.full_name,u1_0.owner_id,u1_0.password,r1_0.user_id,r1_1.role_id,r1_1.name,u1_0.updated_at,u1_0.username from tab_users u1_0 left join tab_users_roles r1_0 on u1_0.user_id=r1_0.user_id left join tab_roles r1_1 on r1_1.role_id=r1_0.role_id where u1_0.user_id=?
2025-12-05T15:33:17.594-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.CadMemorial.service.PropertyService  : 🔍 Buscando propriedade 297a79ae-5305-4e18-906d-17d55255b80a com relacionamentos do usuário 78521575-bef1-40f3-be10-0f3429a66783
2025-12-05T15:33:17.597-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select p1_0.property_id,p1_0.active,p1_0.average_depth,p1_0.central_meridian,p1_0.city,p1_0.complement,p1_0.coordinate_system,p1_0.created_at,p1_0.datum,p1_0.east_boundary,p1_0.floor_area_ratio,p1_0.internal_code,l1_0.property_id,l1_0.landmark_id,l1_0.coordinate_x,l1_0.coordinate_y,l1_0.coordinate_z,l1_0.created_at,l1_0.description,l1_0.entrance_azimuth,l1_0.exit_azimuth,l1_0.landmark_material,l1_0.landmark_name,l1_0.landmark_type,l1_0.previous_distance,l1_0.sequence_order,l1_0.updated_at,p1_0.lot_coverage,p1_0.main_frontage,p1_0.name,p1_0.neighborhood,p1_0.north_boundary,p1_0.number,p1_0.observations,p1_0.owner_document,p1_0.owner_email,p1_0.owner_id_number,p1_0.owner_name,p1_0.owner_phone,p1_0.property_type,p1_0.registration_book,p1_0.registration_date,p1_0.registration_number,p1_0.registration_page,p1_0.registry_office,p1_0.restrictions,p1_0.sirgas_e,p1_0.sirgas_n,p1_0.sirgas_source,p1_0.south_boundary,p1_0.state,p1_0.street,p1_0.total_area,p1_0.total_perimeter,p1_0.updated_at,p1_0.user_id,p1_0.utm_zone,p1_0.west_boundary,p1_0.zip_code,p1_0.zoning from tab_properties p1_0 left join tab_property_landmarks l1_0 on p1_0.property_id=l1_0.property_id where p1_0.property_id=? and p1_0.user_id=? and p1_0.active=true
2025-12-05T15:33:17.601-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select b1_0.property_id,b1_0.boundary_id,b1_0.adjacent_document,b1_0.adjacent_name,b1_0.adjacent_type,b1_0.azimuth,b1_0.created_at,b1_0.direction,b1_0.extension,b1_0.full_description,b1_0.sequence_order,b1_0.updated_at from tab_property_boundaries b1_0 where b1_0.property_id=?
2025-12-05T15:33:17.602-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select d1_0.property_id,d1_0.document_id,d1_0.created_at,d1_0.description,d1_0.document_type,d1_0.file_name,d1_0.file_path,d1_0.file_size,d1_0.mime_type,d1_0.uploaded_by from tab_property_documents d1_0 where d1_0.property_id=?
2025-12-05T15:33:17.603-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.CadMemorial.service.PropertyService  : ✅ Propriedade encontrada com 0 marcos, 0 confrontações, 0 documentos
2025-12-05T15:33:17.605-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] org.hibernate.SQL                        : select u1_0.user_id,u1_0.active,u1_0.created_at,u1_0.full_name,u1_0.owner_id,u1_0.password,r1_0.user_id,r1_1.role_id,r1_1.name,u1_0.updated_at,u1_0.username from tab_users u1_0 left join tab_users_roles r1_0 on u1_0.user_id=r1_0.user_id left join tab_roles r1_1 on r1_1.role_id=r1_0.role_id where u1_0.user_id=?
2025-12-05T15:33:17.608-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Propriedade encontrada: 12345, INCRA-4567
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔍 Iniciando estimativa inteligente de lotes...
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Análise de entidades:
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    - Total de entidades: 294
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    - Polylines: 15
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    - Textos: 16
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    - Textos de lotes: 3
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🎯 Estimativa por polylines: 15 lotes
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🎯 Estimativa por textos de lotes: 3 lotes
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🎯 Estimativa por entidades: 24 lotes
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ ESTIMATIVA FINAL: 25 lotes
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 💡 Baseado em: 15 polylines, 3 textos de lotes, 294 entidades totais
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📦 Projeto grande (25 lotes > 12) - Usando PARTICIONAMENTO
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 💡 Claude Haiku tem limite de 4096 tokens - particionamento necessário
2025-12-05T15:33:17.609-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🔍 Iniciando estimativa inteligente de lotes...
2025-12-05T15:33:17.610-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Análise de entidades:
2025-12-05T15:33:17.610-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    - Total de entidades: 294
2025-12-05T15:33:17.610-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    - Polylines: 15
2025-12-05T15:33:17.610-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    - Textos: 16
2025-12-05T15:33:17.610-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         :    - Textos de lotes: 3
2025-12-05T15:33:17.610-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🎯 Estimativa por polylines: 15 lotes
2025-12-05T15:33:17.610-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🎯 Estimativa por textos de lotes: 3 lotes
2025-12-05T15:33:17.610-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🎯 Estimativa por entidades: 24 lotes
2025-12-05T15:33:17.611-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ ESTIMATIVA FINAL: 25 lotes
2025-12-05T15:33:17.611-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 💡 Baseado em: 15 polylines, 3 textos de lotes, 294 entidades totais
2025-12-05T15:33:17.611-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📦 Implementando particionamento para 25 lotes
2025-12-05T15:33:17.611-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📊 Particionamento: 25 lotes em 4 chunks de ~7 lotes cada
2025-12-05T15:33:17.612-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📄 Gerando preâmbulo profissional com LegalTemplateService...
2025-12-05T15:33:17.612-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.LegalTemplateService       : ⚖️ Gerando preâmbulo legal completo...
2025-12-05T15:33:17.613-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Preâmbulo legal profissional gerado com sucesso
2025-12-05T15:33:17.613-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📦 Gerando chunk 1/4: Lotes 1 a 7 (Iniciado)
2025-12-05T15:33:17.613-03:00 ERROR 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ❌ ERRO CRÍTICO: Coordenadas SIRGAS não encontradas para chunk 1-7
2025-12-05T15:33:41.643-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Chunk lotes 1-7 gerado: 8075 caracteres
2025-12-05T15:33:41.643-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Chunk 1/4 concluído em 24030ms: 8075 caracteres
2025-12-05T15:33:41.644-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ⏳ Aguardando 2s antes do próximo chunk...
2025-12-05T15:33:43.657-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📦 Gerando chunk 2/4: Lotes 8 a 14 (Iniciado)
2025-12-05T15:33:43.657-03:00 ERROR 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ❌ ERRO CRÍTICO: Coordenadas SIRGAS não encontradas para chunk 8-14
2025-12-05T15:34:09.059-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Chunk lotes 8-14 gerado: 8184 caracteres
2025-12-05T15:34:09.059-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Chunk 2/4 concluído em 25402ms: 8184 caracteres
2025-12-05T15:34:09.059-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ⏳ Aguardando 2s antes do próximo chunk...
2025-12-05T15:34:11.067-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📦 Gerando chunk 3/4: Lotes 15 a 21 (Iniciado)
2025-12-05T15:34:11.067-03:00 ERROR 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ❌ ERRO CRÍTICO: Coordenadas SIRGAS não encontradas para chunk 15-21
2025-12-05T15:34:32.713-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Chunk lotes 15-21 gerado: 8157 caracteres
2025-12-05T15:34:32.714-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Chunk 3/4 concluído em 21647ms: 8157 caracteres
2025-12-05T15:34:32.714-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ⏳ Aguardando 2s antes do próximo chunk...
2025-12-05T15:34:34.716-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📦 Gerando chunk 4/4: Lotes 22 a 25 (Iniciado)
2025-12-05T15:34:34.716-03:00 ERROR 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ❌ ERRO CRÍTICO: Coordenadas SIRGAS não encontradas para chunk 22-25
2025-12-05T15:34:47.994-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Chunk lotes 22-25 gerado: 4585 caracteres
2025-12-05T15:34:47.995-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Chunk 4/4 concluído em 13279ms: 4585 caracteres
2025-12-05T15:34:47.995-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 📄 Gerando declaração legal profissional...
2025-12-05T15:34:47.995-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.LegalTemplateService       : ⚖️ Gerando declaração legal final...
2025-12-05T15:34:48.002-03:00 DEBUG 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.LegalTemplateService       : ⚠️ Sem observações - usando dados profissionais padrão
2025-12-05T15:34:48.002-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : ✅ Declaração legal profissional gerada com sucesso
2025-12-05T15:34:48.003-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialMetricsService     : 📊 Métrica registrada: 90472ms, 25 lotes, 294 entidades, 31364 chars
2025-12-05T15:34:48.003-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.service.MemorialApiService         : 🎉 Memorial particionado concluído: 4 chunks, 31364 caracteres
2025-12-05T15:34:48.003-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : ✅ === MEMORIAL GERADO COM SUCESSO ===
2025-12-05T15:34:48.003-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : ⏱️ Tempo total de processamento: 90480ms
2025-12-05T15:34:48.003-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : 📄 Tamanho do memorial: 31364 caracteres
2025-12-05T15:34:48.003-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.s.MemorialAiServiceWithCredits     : 💳 Créditos NÃO foram consumidos (modo desenvolvimento)
2025-12-05T15:34:48.003-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : ✅ Memorial IA gerado: 31364 caracteres
2025-12-05T15:34:48.003-03:00  INFO 13284 --- [MemorialPro] [nio-9010-exec-4] c.m.C.controller.MemorialApiController   : 🎉 Concluído com sucesso!
