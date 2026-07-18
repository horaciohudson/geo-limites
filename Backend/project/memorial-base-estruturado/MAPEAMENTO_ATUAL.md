# Mapeamento Atual Do Pipeline

## Visao Geral

Este arquivo registra, de forma objetiva, onde o backend ja produz os dados tecnicos que servirao de base para o `memorial_base_json`.

## Fontes Tecnicas Ja Existentes

### 1. Pontos e vertices

Arquivo principal:

- [MemorialApiService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java)

Trechos relevantes:

- [SimplePoint](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java#L591-L605)
- [extractPointsFromEntities()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java#L610-L678)
- [applyGeoreferencingTransform()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java#L690-L703)

O que ja existe:

- extracao de pontos principais e secundarios das entidades
- extracao de vertices de `POLYLINE` e `LWPOLYLINE`
- rotulacao simples de pontos como `P`, `V`, `M`, `R`
- transformacao georreferenciada quando ha marcos cadastrados

Observacao:

- hoje os pontos entram fortemente como contexto textual para a IA, mas ainda nao existe um DTO tecnico dedicado por lote.

### 2. Calculo geometrico

Arquivo principal:

- [GeometricCalculator.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/util/GeometricCalculator.java)

Trechos relevantes:

- [Point e Line](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/util/GeometricCalculator.java#L19-L28)
- [calculateDistance()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/util/GeometricCalculator.java#L33-L37)
- [calculateAzimuth()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/util/GeometricCalculator.java#L43-L56)
- [calculatePerimeter()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/util/GeometricCalculator.java#L61-L74)
- [calculateArea()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/util/GeometricCalculator.java#L80-L95)
- [generatePolygonLines()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/util/GeometricCalculator.java#L100-L115)

O que ja existe:

- calculo de distancia
- calculo de azimute
- calculo de perimetro
- calculo de area
- geracao de linhas de poligono com distancia e azimute

Observacao:

- esta e a base mais solida para montar segmentos deterministas do memorial.

### 3. Coordenadas reais e georreferenciamento

Arquivos principais:

- [MemorialApiService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java)
- [DxfGeoReferenciaExtractorService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/DxfGeoReferenciaExtractorService.java)
- [CoordinateExtractionService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/CoordinateExtractionService.java)

Trechos relevantes em `MemorialApiService`:

- [construcao do georreferenciamento](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java#L149-L196)
- [buildRealCoordinatesFromTransform()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java#L705-L723)

O que ja existe:

- aplicacao de transformacao com marcos de referencia
- coordenada base SIRGAS
- fallback para extracao de coordenadas reais do DXF

Observacao:

- a base tecnica precisa guardar a fonte da coordenada, e nao apenas os numeros.

### 4. Ruas e confrontacoes textuais

Arquivo principal:

- [DxfTextExtractorService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/DxfTextExtractorService.java)

Trechos relevantes:

- [extractStreetNames()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/DxfTextExtractorService.java#L90-L137)
- [extractConfrontations()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/DxfTextExtractorService.java#L142-L173)
- [calculateIndividualAreas()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/DxfTextExtractorService.java#L178-L214)

O que ja existe:

- extracao de nomes de ruas
- classificacao basica de confrontacoes por direcao
- calculo de areas individuais por polylines

Observacao:

- hoje as confrontacoes ainda nascem muito como texto extraido, nao como relacao geometrica consolidada por segmento.

### 5. Confrontacao automatica por geometria

Arquivo principal:

- [ConfrontationDetectionService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/ConfrontationDetectionService.java)

Trechos relevantes:

- [Confrontation](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/ConfrontationDetectionService.java#L20-L63)
- [detectConfrontations()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/ConfrontationDetectionService.java#L68-L88)
- [generateConfrontationMemorial()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/ConfrontationDetectionService.java#L202-L232)

O que ja existe:

- segmentos com distancia, azimute, direcao e rumo tecnico
- ordenacao dos pontos para formar um poligono
- deteccao de problemas de qualidade

Observacao:

- este servico se aproxima bastante do que a futura base estruturada precisa, embora ainda nao esteja conectado como fonte principal do memorial final.

## Onde Esses Dados Entram Hoje

O fluxo principal atual esta em:

- [generate()](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java#L104-L251)

Dados que ja sao montados antes do prompt:

- `extractedPoints`
- `realCoordinates`
- `streetNames`
- `confrontations`
- `individualAreas`

Observacao critica:

- esses dados ja existem antes da chamada ao modelo, mas ainda sao usados majoritariamente como contexto textual, e nao como contrato tecnico estruturado por lote.

## Lacunas Atuais

Ainda falta transformar o que existe em um pipeline realmente deterministico:

- identificar lotes e vertices por lote de forma explicita
- montar segmentos por lote com ordem confiavel
- associar confrontante por segmento ou por lado
- validar que soma dos segmentos bate com o perimetro
- persistir a base tecnica em estrutura propria

## Proximo Passo Tecnico

O passo natural agora e criar um gerador que converta essas fontes atuais em:

- `MemorialBaseDTO`
- `MemorialBaseLotDTO`
- `MemorialBaseSegmentDTO`
- `MemorialBaseVertexDTO`

Esse gerador deve ser introduzido sem quebrar o fluxo atual, primeiro como artefato interno de apoio.
