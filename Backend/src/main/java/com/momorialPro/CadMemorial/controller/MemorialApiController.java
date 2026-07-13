package com.momorialPro.CadMemorial.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.momorialPro.CadMemorial.dto.CorrectiveSnapshotSaveRequestDTO;
import com.momorialPro.CadMemorial.dto.CorrectiveSnapshotSaveResponseDTO;
import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.dto.SelectedConfrontationTextDTO;
import com.momorialPro.CadMemorial.service.MemorialAiServiceWithCredits;
import com.momorialPro.CadMemorial.service.MemorialBaseSnapshotService;
import com.momorialPro.CadMemorial.service.MemorialService;
import com.momorialPro.CadMemorial.util.DxfParser;
import com.momorialPro.CadMemorial.dto.MemorialExportDTO;
import com.momorialPro.CadMemorial.dto.MemorialRequestDTO;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.MemorialApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.util.*;
import java.util.stream.Collectors;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Controller responsável por geração de memorial descritivo
 * usando geração assistida a partir de dados DXF já processados em memória.
 */
@RestController
@RequestMapping("/api/memorial")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MemorialApiController {

    private final MemorialService memorialService;
    private final MemorialAiServiceWithCredits memorialAiService;
    private final MemorialApiService memorialApiService;
    private final MemorialBaseSnapshotService memorialBaseSnapshotService;
    private final ObjectMapper objectMapper;
    
    /**
     * Converte vértices de DxfParser.Point para Map<String, Double>
     */
    private List<Map<String, Double>> convertVertices(List<DxfParser.Point> points) {
        if (points == null || points.isEmpty()) {
            return null;
        }
        
        List<Map<String, Double>> vertices = new ArrayList<>();
        for (DxfParser.Point point : points) {
            Map<String, Double> vertex = new HashMap<>();
            vertex.put("x", point.x());
            vertex.put("y", point.y());
            vertices.add(vertex);
        }

        return vertices;
    }

    private Map<String, Object> buildEntityProperties(DxfParser.Entity entity) {
        Map<String, Object> properties = new LinkedHashMap<>();
        if (entity != null && entity.properties() != null && !entity.properties().isEmpty()) {
            properties.putAll(entity.properties());
        }

        if (entity == null) {
            return properties;
        }

        putIfNotNull(properties, "x", entity.x());
        putIfNotNull(properties, "y", entity.y());
        putIfNotNull(properties, "z", entity.z());
        putIfNotNull(properties, "x2", entity.x2());
        putIfNotNull(properties, "y2", entity.y2());
        putIfNotNull(properties, "z2", entity.z2());
        putIfNotNull(properties, "radius", entity.radius());
        putIfNotNull(properties, "startAngle", entity.startAngle());
        putIfNotNull(properties, "endAngle", entity.endAngle());
        putIfNotNull(properties, "text", entity.text());
        putIfNotNull(properties, "textStyle", entity.textStyle());
        putIfNotNull(properties, "textHeight", entity.textHeight());
        putIfNotNull(properties, "textRotation", entity.textRotation());

        if (entity.vertices() != null && !entity.vertices().isEmpty()) {
            List<Map<String, Object>> vertices = new ArrayList<>();
            for (DxfParser.Point point : entity.vertices()) {
                Map<String, Object> vertex = new LinkedHashMap<>();
                vertex.put("x", point.x());
                vertex.put("y", point.y());
                if (point.id() != null && !point.id().isBlank()) {
                    vertex.put("id", point.id());
                }
                vertices.add(vertex);
            }
            properties.put("vertices", vertices);
        }

        return properties;
    }

    private void putIfNotNull(Map<String, Object> target, String key, Object value) {
        if (target == null || key == null || value == null) {
            return;
        }
        target.putIfAbsent(key, value);
    }

    // ==============================================================
    // 🟢 GERA MEMORIAL TRADICIONAL A PARTIR DE DADOS DXF EM MEMÓRIA
    // ==============================================================
    @PostMapping("/generate-traditional")
    public ResponseEntity<MemorialExportDTO> generateMemorial(@RequestBody MemorialRequestDTO req) {
        if (req.entities() == null || req.entities().isEmpty() || 
            req.fileName() == null || req.fileName().isBlank() ||
            req.projectName() == null || req.projectName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            MemorialExportDTO memorial = memorialService.generate(req);
            return ResponseEntity.ok(memorial);
        } catch (Exception e) {
            log.error("Erro ao gerar memorial tradicional", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==============================================================
    // 🤖 GERA MEMORIAL ASSISTIDO A PARTIR DE DADOS DXF EM MEMÓRIA
    // ==============================================================
    @PostMapping("/generate-gpt")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<?> generateGptMemorial(@RequestBody MemorialRequestDTO request) {
        String debugTraceId = UUID.randomUUID().toString();
        boolean hasEntities = hasEntities(request);
        boolean hasTechnicalSummaryJson = hasTechnicalSummaryJson(request);
        boolean useTechnicalSummaryFlow = shouldUseTechnicalSummaryFlow(request);
        // #region debug-point A:request-entry
        debugReport("pre-fix", "A", "MemorialApiController:generate-gpt:entry", "[DEBUG] Entrada no generate-gpt", Map.ofEntries(
                Map.entry("traceId", debugTraceId),
                Map.entry("entityCount", request.entities() != null ? request.entities().size() : 0),
                Map.entry("hasTechnicalSummaryJson", hasTechnicalSummaryJson),
                Map.entry("useTechnicalSummaryFlow", useTechnicalSummaryFlow),
                Map.entry("lotCount", request.lotCount() != null ? request.lotCount() : -1),
                Map.entry("selectedLayersCount", request.selectedLayers() != null ? request.selectedLayers().size() : 0),
                Map.entry("selectedConfrontationTextsCount", request.selectedConfrontationTexts() != null ? request.selectedConfrontationTexts().size() : 0),
                Map.entry("hasPropertyId", request.propertyId() != null),
                Map.entry("hasStandardId", request.standardId() != null),
                Map.entry("fileName", request.fileName() != null ? request.fileName() : ""),
                Map.entry("projectName", request.projectName() != null ? request.projectName() : ""),
                Map.entry("templateName", request.templateName() != null ? request.templateName() : ""),
                Map.entry("templateBackendId", request.templateBackendId() != null ? request.templateBackendId() : ""),
                Map.entry("technicalSummaryLength", request.technicalSummaryJson() != null ? request.technicalSummaryJson().length() : 0),
                Map.entry("documentSummaryLength", request.documentSummaryJson() != null ? request.documentSummaryJson().length() : 0)
        ));
        // #endregion
        if (request.propertyId() == null) {
            log.error("PropertyId ausente na geração do memorial com IA");
        }

        if (!hasEntities && !hasTechnicalSummaryJson) {
            log.warn("Nem entidades DXF nem resumo tecnico JSON foram fornecidos");
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Nao foi possivel iniciar a geracao porque nenhum Resumo Tecnico JSON nem entidades DXF validas foram enviados."
            ));
        }
        
        if (request.standardId() == null) {
            log.error("StandardId é obrigatório para gerar memorial com IA");
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Selecione uma norma antes de gerar o memorial."
            ));
        }

        try {
            UUID userId = AuthUtils.getCurrentUserId();
            DxfCompareResultDTO compareResult = useTechnicalSummaryFlow
                    ? buildTechnicalSummaryCompareResult(request)
                    : buildSingleFileCompareResult(request);
            int scopedEntityCount = compareResult.getDifferences() != null ? compareResult.getDifferences().size() : 0;
            // #region debug-point B:post-filter
            debugReport("pre-fix", "B", "MemorialApiController:generate-gpt:post-filter", "[DEBUG] Entidades apos filtro", Map.of(
                    "traceId", debugTraceId,
                    "filteredEntityCount", scopedEntityCount,
                    "compareResultSummary", compareResult.getSummary(),
                    "selectedLayers", request.selectedLayers() != null ? String.join(", ", request.selectedLayers()) : "",
                    "selectedConfrontationTexts", request.selectedConfrontationTexts() != null ? request.selectedConfrontationTexts().stream()
                            .map(SelectedConfrontationTextDTO::text)
                            .collect(Collectors.joining(" | ")) : ""
            ));
            // #endregion

            // Usa o serviço assistido para gerar memorial seguindo normas específicas
            String aiContent = memorialAiService.generateMemorialWithCredits(
                    compareResult,
                    request.standardId(),
                    userId,
                    request.propertyId(),
                    request.lotCount(),
                    request.billableLotCount(),
                    request.chargeCredits(),
                    request.selectedLayers(),
                    request.selectedConfrontationTexts(),
                    request.selectedReferencePoints(),
                    request.technicalSummaryJson(),
                    request.documentSummaryJson(),
                    request.templateName(),
                    request.templateBackendId()
            );
            // #region debug-point C:service-output
            debugReport("pre-fix", "C", "MemorialApiController:generate-gpt:service-output", "[DEBUG] Conteudo retornado pelo service", Map.of(
                    "traceId", debugTraceId,
                    "aiContentNull", aiContent == null,
                    "aiContentLength", aiContent != null ? aiContent.length() : -1,
                    "aiPreview", aiContent != null ? aiContent.substring(0, Math.min(180, aiContent.length())) : ""
            ));
            // #endregion
            String sanitizedAiContent = normalizeAiMemorialForResponse(aiContent, request);
            // #region debug-point D:normalized-output
            debugReport("pre-fix", "D", "MemorialApiController:generate-gpt:normalized-output", "[DEBUG] Conteudo apos normalizacao", Map.of(
                    "traceId", debugTraceId,
                    "normalizedNull", sanitizedAiContent == null,
                    "normalizedLength", sanitizedAiContent != null ? sanitizedAiContent.length() : -1,
                    "normalizedPreview", sanitizedAiContent != null ? sanitizedAiContent.substring(0, Math.min(180, sanitizedAiContent.length())) : ""
            ));
            // #endregion

            // Cria resposta final
            MemorialExportDTO gptMemorial = new MemorialExportDTO();
            gptMemorial.setMemorialText(sanitizedAiContent);
            gptMemorial.setProjectName(request.projectName());
            gptMemorial.setProjectDescription(request.projectDescription());
            gptMemorial.setComparisonSummary(useTechnicalSummaryFlow
                    ? "Memorial assistido gerado a partir do Resumo Tecnico JSON aplicado"
                    : "Memorial assistido gerado com " + request.entities().size() + " entidades");
            gptMemorial.setDifferences(compareResult.getAdded());

            return ResponseEntity.ok(gptMemorial);
            
        } catch (Exception e) {
            // #region debug-point E:exception
            debugReport("pre-fix", "E", "MemorialApiController:generate-gpt:exception", "[DEBUG] Excecao no generate-gpt", Map.of(
                    "traceId", debugTraceId,
                    "exceptionType", e.getClass().getName(),
                    "message", String.valueOf(e.getMessage()),
                    "causeType", e.getCause() != null ? e.getCause().getClass().getName() : "",
                    "causeMessage", e.getCause() != null ? String.valueOf(e.getCause().getMessage()) : ""
            ));
            // #endregion
            log.error("Erro durante geração do memorial com IA: {}", e.getMessage(), e);
            if (isOpenAiRateLimitError(e)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                        "message", "A OpenAI atingiu um limite temporario de requisicoes/tokens. O saldo da conta pode ainda estar disponivel. Tente novamente em alguns segundos. Os creditos desta tentativa foram estornados."
                ));
            }
            if (isOpenAiQuotaError(e)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                        "message", "A OpenAI nao aceitou esta tentativa porque a conta esta sem cota disponivel ou precisa de ajuste no faturamento. Verifique o billing/plano da OpenAI ou altere o provedor de memoriais para Claude nas configuracoes. Os creditos desta tentativa foram estornados."
                ));
            }

            return ResponseEntity.internalServerError().body(Map.of(
                    "message", buildOperatorFriendlyErrorMessage(e)
            ));
        }
    }

    @PostMapping("/generate-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<?> generateTechnicalSummary(@RequestBody MemorialRequestDTO request) {
        if (request.entities() == null || request.entities().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Nao foi possivel gerar o resumo tecnico porque o arquivo DXF nao trouxe entidades suficientes para analise."
            ));
        }

        try {
            UUID userId = AuthUtils.getCurrentUserId();
            DxfCompareResultDTO compareResult = buildSingleFileCompareResult(request);
            MemorialApiService.TechnicalSummaryPayload payload = memorialApiService.generateTechnicalSummaryPayload(
                    compareResult,
                    userId,
                    request.propertyId(),
                    request.lotCount(),
                    request.selectedLayers(),
                    request.detectedLotNumbers(),
                    request.selectedLotNumbers(),
                    request.partialReplacementLotNumbers(),
                    request.manualReviewLotNumbers(),
                    request.selectedConfrontationTexts(),
                    request.selectedReferencePoints()
            );

            MemorialExportDTO summaryResponse = new MemorialExportDTO();
            summaryResponse.setProjectName(request.projectName());
            summaryResponse.setProjectDescription(request.projectDescription());
            summaryResponse.setMemorialText(payload.summaryText());
            summaryResponse.setTechnicalSummaryJson(payload.technicalSummaryJson());
            summaryResponse.setDocumentSummaryJson(payload.documentSummaryJson());
            summaryResponse.setProcessingContextStatus(payload.processingContextStatus());
            summaryResponse.setComparisonSummary(compareResult.getSummary());
            summaryResponse.setDifferences(compareResult.getDifferences());
            return ResponseEntity.ok(summaryResponse);
        } catch (Exception e) {
            log.error("Erro ao gerar resumo tecnico do memorial: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", buildOperatorFriendlyErrorMessage(e)
            ));
        }
    }

    @PostMapping("/corrective-snapshots")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<?> saveCorrectiveSnapshot(@RequestBody CorrectiveSnapshotSaveRequestDTO request) {
        if (request == null || request.correctiveSnapshot() == null || request.correctiveSnapshot().isNull()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Nao foi possivel salvar o snapshot corretivo porque a geometria corrigida nao foi enviada."
            ));
        }

        try {
            UUID userId = AuthUtils.getCurrentUserId();
            UUID tenantId = AuthUtils.getRequiredCurrentTenantId();

            ObjectNode memorialBaseNode = objectMapper.createObjectNode();
            memorialBaseNode.put("kind", "CORRECTIVE_SNAPSHOT");
            memorialBaseNode.put("savedAt", java.time.LocalDateTime.now().toString());
            if (request.technicalSummaryJson() != null) {
                memorialBaseNode.put("technicalSummaryJson", request.technicalSummaryJson());
            }
            if (request.processingContextStatus() != null && !request.processingContextStatus().isNull()) {
                memorialBaseNode.set("processingContextStatus", request.processingContextStatus());
            }
            memorialBaseNode.set("correctiveSnapshot", request.correctiveSnapshot());
            if (request.metadata() != null && !request.metadata().isNull()) {
                memorialBaseNode.set("metadata", request.metadata());
            }

            String pipelineVersion = "editor-corretivo-v1";
            String generationStatus = MemorialBaseSnapshotService.GENERATION_STATUS_CORRECTIVE_SNAPSHOT;
            java.time.LocalDateTime generatedAt = java.time.LocalDateTime.now();

            UUID snapshotId = memorialBaseSnapshotService.saveSnapshot(
                    MemorialBaseSnapshotService.SaveRequest.builder()
                            .tenantId(tenantId)
                            .userId(userId)
                            .propertyId(request.propertyId())
                            .fileId(request.fileId())
                            .memorialStandardId(request.standardId())
                            .projectName(request.projectName())
                            .fileName(request.fileName())
                            .pipelineVersion(pipelineVersion)
                            .estimatedLotCount(request.estimatedLotCount())
                            .georeferenced(Boolean.TRUE.equals(request.georeferenced()))
                            .coordinateSource(request.coordinateSource())
                            .generationStatus(generationStatus)
                            .generatedAt(generatedAt)
                            .memorialBaseJson(objectMapper.writeValueAsString(memorialBaseNode))
                            .build()
            ).orElseThrow(() -> new IllegalStateException("Snapshot corretivo nao foi persistido"));

            return ResponseEntity.status(HttpStatus.CREATED).body(new CorrectiveSnapshotSaveResponseDTO(
                    snapshotId,
                    request.propertyId(),
                    request.fileId(),
                    generationStatus,
                    pipelineVersion,
                    generatedAt
            ));
        } catch (Exception e) {
            log.error("Erro ao salvar snapshot corretivo: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", buildOperatorFriendlyErrorMessage(e)
            ));
        }
    }
    
    /**
     * Método utilitário para gerar fingerprint de entidades que chegam sem ele
     */
    private String generateFingerprint(DxfParser.Entity entity) {
        try {
            List<String> data = new ArrayList<>();
            data.add(entity.type());
            data.add(entity.layer());
            
            // Adiciona coordenadas ao fingerprint se disponíveis
            if (entity.x() != null) data.add(entity.x().toString());
            if (entity.y() != null) data.add(entity.y().toString());
            if (entity.z() != null) data.add(entity.z().toString());
            if (entity.x2() != null) data.add(entity.x2().toString());
            if (entity.y2() != null) data.add(entity.y2().toString());
            if (entity.z2() != null) data.add(entity.z2().toString());
            if (entity.radius() != null) data.add(entity.radius().toString());
            if (entity.startAngle() != null) data.add(entity.startAngle().toString());
            if (entity.endAngle() != null) data.add(entity.endAngle().toString());
            
            // Adiciona propriedades de texto melhoradas
            if (entity.text() != null) data.add(entity.text());
            if (entity.textStyle() != null) data.add(entity.textStyle());
            if (entity.textHeight() != null) data.add(entity.textHeight().toString());
            if (entity.textRotation() != null) data.add(entity.textRotation().toString());
            
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            for (String s : data) {
                md.update(s.getBytes());
            }
            return bytesToHex(md.digest());
        } catch (Exception e) {
            log.warn("Erro ao gerar fingerprint para entidade {}: {}", entity.type(), e.getMessage());
            return "default-" + entity.type() + "-" + entity.layer();
        }
    }
    
    private String bytesToHex(byte[] bytes) {
        char[] hexArray = "0123456789abcdef".toCharArray();
        char[] hexChars = new char[bytes.length * 2];
        for (int j = 0; j < bytes.length; j++) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = hexArray[v >>> 4];
            hexChars[j * 2 + 1] = hexArray[v & 0x0F];
        }
        return new String(hexChars);
    }

    private DxfCompareResultDTO buildSingleFileCompareResult(MemorialRequestDTO request) {
        List<DxfParser.Entity> allEntities = filterEntitiesBySelectedLayers(request.entities(), request.selectedLayers());

        if (allEntities.isEmpty()) {
            log.warn("Nenhuma entidade permaneceu após filtro por layers; usando conjunto original");
            allEntities = request.entities();
        }

        allEntities = appendSelectedConfrontationTexts(allEntities, request.selectedConfrontationTexts());

        List<DxfEntityChangeDTO> added = new ArrayList<>();
        List<DxfEntityChangeDTO> removed = new ArrayList<>();
        List<DxfEntityChangeDTO> modified = new ArrayList<>();

        for (int i = 0; i < allEntities.size(); i++) {
            DxfParser.Entity entity = allEntities.get(i);
            added.add(DxfEntityChangeDTO.builder()
                    .type(entity.type())
                    .layer(entity.layer())
                    .id(entity.fingerprint() != null ? entity.fingerprint() : "entity_" + i)
                    .change("ADDED")
                    .x(entity.x())
                    .y(entity.y())
                    .z(entity.z())
                    .x2(entity.x2())
                    .y2(entity.y2())
                    .z2(entity.z2())
                    .radius(entity.radius())
                    .startAngle(entity.startAngle())
                    .endAngle(entity.endAngle())
                    .text(entity.text())
                    .textStyle(entity.textStyle())
                    .textHeight(entity.textHeight())
                    .textRotation(entity.textRotation())
                    .vertices(convertVertices(entity.vertices()))
                    .properties(buildEntityProperties(entity))
                    .build());
        }

        Map<String, Integer> summaryByType = new LinkedHashMap<>();
        for (DxfEntityChangeDTO entity : added) {
            summaryByType.merge(entity.getType(), 1, Integer::sum);
        }

        return DxfCompareResultDTO.builder()
                .oldFileName("N/A")
                .newFileName(request.fileName() != null && !request.fileName().isBlank() ? request.fileName() : "Arquivo Revisado")
                .totalOldEntities(0)
                .totalNewEntities(allEntities.size())
                .added(added)
                .removed(removed)
                .modified(modified)
                .summaryByType(summaryByType)
                .summary("Analise de " + allEntities.size() + " entidades DXF")
                .differences(added)
                .build();
    }

    private DxfCompareResultDTO buildTechnicalSummaryCompareResult(MemorialRequestDTO request) {
        String analyzedFileName = extractAnalyzedFileName(request.technicalSummaryJson(), request.documentSummaryJson());
        String resolvedFileName = analyzedFileName != null && !analyzedFileName.isBlank()
                ? analyzedFileName
                : request.fileName() != null && !request.fileName().isBlank()
                    ? request.fileName()
                    : "Resumo Tecnico Aplicado";
        return DxfCompareResultDTO.builder()
                .oldFileName(analyzedFileName != null && !analyzedFileName.isBlank() ? analyzedFileName : "N/A")
                .newFileName(resolvedFileName)
                .totalOldEntities(0)
                .totalNewEntities(0)
                .added(new ArrayList<>())
                .removed(new ArrayList<>())
                .modified(new ArrayList<>())
                .summaryByType(Map.of())
                .summary("Analise baseada exclusivamente no resumo tecnico JSON aplicado")
                .differences(new ArrayList<>())
                .build();
    }

    private String extractAnalyzedFileName(String technicalSummaryJson, String documentSummaryJson) {
        String technicalSummaryFileName = extractAnalyzedFileNameFromJson(technicalSummaryJson);
        if (technicalSummaryFileName != null && !technicalSummaryFileName.isBlank()) {
            return technicalSummaryFileName;
        }
        return extractAnalyzedFileNameFromJson(documentSummaryJson);
    }

    private String extractAnalyzedFileNameFromJson(String summaryJson) {
        if (summaryJson == null || summaryJson.isBlank()) {
            return null;
        }

        try {
            String analyzedFile = objectMapper.readTree(summaryJson).path("analyzedFile").asText(null);
            return analyzedFile != null && !analyzedFile.isBlank() ? analyzedFile.trim() : null;
        } catch (Exception e) {
            log.debug("Nao foi possivel extrair analyzedFile do resumo para o compareResult tecnico: {}", e.getMessage());
            return null;
        }
    }

    private boolean hasEntities(MemorialRequestDTO request) {
        return request.entities() != null && !request.entities().isEmpty();
    }

    private boolean hasTechnicalSummaryJson(MemorialRequestDTO request) {
        return request.technicalSummaryJson() != null && !request.technicalSummaryJson().isBlank();
    }

    private boolean shouldUseTechnicalSummaryFlow(MemorialRequestDTO request) {
        return hasTechnicalSummaryJson(request);
    }

    private String sanitizeMemorialText(String content) {
        if (content == null) {
            return null;
        }

        return content
                .replace("\r\n", "\n")
                .replace("\\r\\n", "\n")
                .replace("\\n", "\n")
                .replace("“", "")
                .replace("”", "")
                .replace("\"", "")
                .trim();
    }

    private String normalizeAiMemorialForResponse(String content, MemorialRequestDTO request) {
        String sanitized = sanitizeMemorialText(content);
        if (sanitized == null || sanitized.isBlank()) {
            return sanitized;
        }

        sanitized = sanitized.replaceAll("(?is)<!--.*?-->", "");
        sanitized = removeDuplicateMemorialHeaders(sanitized);
        boolean shouldPreserveHeader = request.lotCount() == null || request.lotCount() != 1;
        boolean shouldPreserveDocumentSections = shouldPreserveHeader;
        if (!shouldPreserveHeader) {
            sanitized = sanitized.replaceAll("(?is)^\\s*Memorial\\s+Descritivo\\s*\\n\\s*Projeto:.*?\\n\\s*Arquivo:.*?\\n\\s*Data:.*?(?:\\n|$)", "");
        }
        sanitized = sanitized
                .replaceAll("(?i)\\[BAIRRO\\]", "nao informado no cadastro")
                .replaceAll("(?i)\\[Bairro a ser confirmado\\]", "nao informado no cadastro")
                .replaceAll("(?i)\\[N[ÚU]MERO DA MATR[IÍ]CULA\\]", "nao informada")
                .replaceAll("(?i)\\[n[úu]mero da matr[ií]cula\\]", "nao informada")
                .replaceAll("(?i)\\[ZONA\\]", "nao informada")
                .replaceAll("(?i)\\[especificada\\]", "nao informada")
                .replaceAll("(?i)\\[data\\]", "data nao informada")
                .replaceAll("(?i)\\[[^\\]]+\\]", "nao informado");
        sanitized = sanitized
                .replaceAll("(?i)medida\\s+a\\s+confirmar", "medida nao identificada no DXF")
                .replaceAll("(?i)sentido\\s+a\\s+confirmar", "sentido nao identificado no DXF")
                .replaceAll("(?i)confrontante\\s+a\\s+confirmar(?:\\s+em\\s+confer[êe]ncia\\s+t[ée]cnica)?",
                        "confrontante nao identificado no DXF")
                .replaceAll("(?i)data\\s+a\\s+confirmar", "data nao informada");
        sanitized = normalizeFallbackPhrases(sanitized);

        Integer selectedLotNumber = extractSelectedLotNumber(request.selectedLayers());
        // #region debug-point D:selected-lot-number
        debugReport("pre-fix", "D", "MemorialApiController:normalizeAiMemorialForResponse:selected-lot-number",
                "[DEBUG] Numero do lote extraido a partir das layers selecionadas", Map.of(
                        "selectedLayers", request.selectedLayers() != null ? String.join(", ", request.selectedLayers()) : "",
                        "selectedLotNumber", selectedLotNumber != null ? selectedLotNumber : -1
                ));
        // #endregion
        if (request.lotCount() != null && request.lotCount() == 1) {
            sanitized = extractLotBlockForSingleLot(sanitized, selectedLotNumber);
            sanitized = cleanupSingleLotBoilerplate(sanitized);
            sanitized = rewriteSingleLotIntroduction(sanitized);
            sanitized = normalizeCoordinateFormatting(sanitized);
        }

        List<String> cleanedLines = new ArrayList<>();
        for (String line : sanitized.split("\\n")) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) {
                if (cleanedLines.isEmpty() || cleanedLines.get(cleanedLines.size() - 1).isBlank()) {
                    continue;
                }
                cleanedLines.add("");
                continue;
            }

            String compact = trimmed.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
            boolean isConfrontationLine = compact.startsWith("aonorte:")
                    || compact.startsWith("aosul:")
                    || compact.startsWith("aoleste:")
                    || compact.startsWith("aooeste:");
            boolean isNumberedInvalidSection = !shouldPreserveDocumentSections
                    && compact.matches("^\\d+\\.(preâmbulo|preambulo|identificaçãodoterreno|identificacaodoterreno|situaçãoantes|situacaoantes|situaçãodepois|situacaodepois|declaraçãofinal|declaracaofinal).*$");
            boolean isMetadataOnlyLine = compact.contains("geradopor")
                    || compact.contains("aviso:estememorialestaincompleto")
                    || compact.contains("foramgeradosapenasalgunslotes")
                    || compact.contains("paramemorialcompleto")
                    || (!shouldPreserveHeader && compact.startsWith("memorialdescritivo"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("preâmbulo"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("preambulo"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("identificaçãodoterreno"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("identificacaodoterreno"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("situaçãoantes"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("situacaoantes"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("situaçãodepois"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("situacaodepois"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("declaraçãofinal"))
                    || (!shouldPreserveDocumentSections && compact.startsWith("declaracaofinal"))
                    || isNumberedInvalidSection
                    || compact.contains("0,0000m²")
                    || compact.contains("0,0000m2")
                    || compact.contains("0,0000m.");
            boolean isGenericTechnicalConferenceLine = !isConfrontationLine
                    && (compact.contains("conferênciatécnica") || compact.contains("conferenciatecnica"))
                    && !compact.contains("naoidentificadonodxf")
                    && !compact.contains("divisainternadoloteamento");
            if (isMetadataOnlyLine || isGenericTechnicalConferenceLine) {
                continue;
            }

            cleanedLines.add(trimmed);
        }

        sanitized = String.join("\n", cleanedLines)
                .replaceAll("\n{3,}", "\n\n")
                .trim();

        // O cabeçalho é gerado pela IA. O backend apenas remove duplicatas
        // caso a IA acidentalmente gere mais de um.

        if (request.lotCount() != null && request.lotCount() == 1 && selectedLotNumber != null) {
            sanitized = sanitized.replaceFirst(
                    "(?im)^\\s*LOTE\\s*0*\\d+(?:\\s*:\\s*|\\s*\\[[^\\]]+\\]\\s*)",
                    "LOTE " + selectedLotNumber + ":\n"
            );
        }

        if (request.lotCount() != null && request.lotCount() == 1
                && !isUsefulSingleLotMemorial(sanitized, selectedLotNumber)) {
            return "";
        }

        return sanitized;
    }

    private String removeDuplicateMemorialHeaders(String content) {
        if (content == null || content.isBlank()) {
            return content;
        }

        // Se a IA gerar apenas 1 cabeçalho, mantém sem alterar.
        // Se gerar 2+, mantém o último (o mais completo/correto) e remove os demais.
        String normalized = content.replace("\r\n", "\n");
        java.util.regex.Pattern headerPattern = java.util.regex.Pattern.compile(
                "(?ims)^\\s*Memorial\\s+Descritivo\\s*\\n(?:\\s*Projeto:.*\\n)?(?:\\s*Arquivo:.*\\n)?(?:\\s*Data:.*\\n)?(?:\\s*Metodo:.*\\n)?"
        );
        java.util.regex.Matcher matcher = headerPattern.matcher(normalized);
        List<String> headers = new ArrayList<>();

        while (matcher.find()) {
            headers.add(matcher.group().trim());
        }

        if (headers.size() <= 1) {
            return content; // Nenhuma duplicata — mantém o cabeçalho da IA intacto
        }

        // 2+ cabeçalhos: mantém o último (geralmente o mais completo)
        String preferredHeader = headers.get(headers.size() - 1);
        String contentWithoutHeaders = headerPattern.matcher(normalized)
                .replaceAll("")
                .replaceFirst("^\\s+", "");

        return (preferredHeader + "\n\n" + contentWithoutHeaders)
                .replaceAll("\n{3,}", "\n\n")
                .trim();
    }

    private String ensureMemorialHeader(String content, MemorialRequestDTO request) {
        if (content == null || content.isBlank()) {
            return content;
        }

        if (content.matches("(?is)^\\s*Memorial\\s+Descritivo.*")) {
            return content;
        }

        StringBuilder header = new StringBuilder();
        header.append("Memorial Descritivo\n");
        if (request.projectName() != null && !request.projectName().isBlank()) {
            header.append("Projeto: ").append(request.projectName().trim()).append("\n");
        }
        if (request.fileName() != null && !request.fileName().isBlank()) {
            header.append("Arquivo: ").append(request.fileName().trim()).append("\n");
        }
        header.append("Data: ")
                .append(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .append("\n\n");

        return header + content;
    }

    private String normalizeFallbackPhrases(String content) {
        if (content == null || content.isBlank()) {
            return content;
        }

        return content
                .replaceAll("(?i)bairro\\s+a\\s+ser\\s+confirmado", "bairro nao informado no cadastro")
                .replaceAll("(?i)bairro\\s+a\\s+confirmar", "bairro nao informado no cadastro")
                .replaceAll("(?i)bairro\\s+n[aã]o\\s+especificado", "bairro nao informado no cadastro")
                .replaceAll("(?i)bairro\\s+não\\s+especificado", "bairro nao informado no cadastro")
                .replaceAll("(?i)zona\\s+a\\s+confirmar", "zona nao informada")
                .replaceAll("(?i)zona\\s+especificada", "zona nao informada")
                .replaceAll("(?i)propriedade\\s+a\\s+confirmar", "confrontante nao identificado no DXF")
                .replaceAll("(?i)CPF\\s*\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}", "CPF nao informado")
                .replaceAll("(?i)confrontante\\s+nao\\s+identificado\\s+no\\s+dxf\\s+em\\s+confer[êe]ncia\\s+t[ée]cnica",
                        "confrontante nao identificado no DXF")
                .replaceAll("(?i)medida\\s+e\\s+sentido\\s+a\\s+serem\\s+determinados",
                        "medida e sentido nao identificados no DXF")
                .replaceAll("(?i)medindo\\s+aproximadamente\\s+nao\\s+informado\\s+metros", "com medida nao identificada no DXF")
                .replaceAll("(?i)medindo\\s+nao\\s+informado\\s+metros", "com medida nao identificada no DXF");
    }

    private String cleanupSingleLotBoilerplate(String content) {
        if (content == null || content.isBlank()) {
            return content;
        }

        return content
                .replaceAll("(?is)\\s+O imóvel está registrado sob a matrícula.*$", "")
                .replaceAll("(?is)\\s+Este memorial descritivo foi elaborado.*$", "")
                .replaceAll("(?is)\\s+Este memorial descritivo est[aá] em conformidade com.*$", "")
                .replaceAll("(?is)\\s+Este lote est[aá] devidamente identificado e descrito.*$", "")
                .replaceAll("(?im)^\\s*\\d+\\.\\s*DECLARAÇÃO FINAL\\s*$", "")
                .replaceAll("(?im)^\\s*\\d+\\.\\s*DECLARACAO FINAL\\s*$", "")
                .replaceAll("(?is)\\s+Documento elaborado em.*$", "")
                .replaceAll("(?is)\\s+Todas as medidas e confrontações foram determinadas com base.*$", "")
                .replaceAll("(?is)\\s+Estas coordenadas foram extra[ií]das do levantamento topogr[aá]fico realizado conforme a norma.*$", "")
                .replaceAll("(?is)\\s+Estas coordenadas est[aã]o no sistema de refer[êe]ncia.*$", "")
                .replaceAll("(?is)\\s+O sistema de refer[êe]ncia utilizado [ée].*$", "")
                .trim();
    }

    private String rewriteSingleLotIntroduction(String content) {
        if (content == null || content.isBlank()) {
            return content;
        }

        return content
                .replaceAll("(?i)Um\\s+im[oó]vel\\s+urbano,\\s+localizado\\s+na\\s+Rua\\s+[^,\\n]+,\\s*bairro\\s+[^,\\n]+,\\s*([^,\\n]+/[A-Z]{2}),",
                        "Um imóvel urbano integrante da area/loteamento em $1,")
                .replaceAll("(?i)Um\\s+im[oó]vel\\s+urbano,\\s+localizado\\s+na\\s+[^,\\n]+,\\s*bairro\\s+[^,\\n]+,\\s*([^,\\n]+/[A-Z]{2}),",
                        "Um imóvel urbano integrante da area/loteamento em $1,");
    }

    private String normalizeCoordinateFormatting(String content) {
        if (content == null || content.isBlank()) {
            return content;
        }

        return content
                .replaceAll("(?i)As coordenadas dos v[ée]rtices do lote s[aã]o:\\s*-\\s*Ponto", "As coordenadas dos vertices do lote sao:\n- Ponto")
                .replaceAll("(?i)Coordenadas dos v[ée]rtices:\\s*-\\s*P0?(\\d+)", "Coordenadas dos vertices:\n- P$1")
                .replaceAll("(?i)Coordenadas dos v[ée]rtices do lote s[aã]o:\\s*-\\s*P0?(\\d+)", "Coordenadas dos vertices do lote sao:\n- P$1")
                .replaceAll("\\)\\s*-\\s*Ponto", ")\n- Ponto")
                .replaceAll("\\)\\s*-\\s*P0?(\\d+)", ")\n- P$1")
                .replaceAll("(?i)As coordenadas dos v[ée]rtices do lote s[aã]o:\\s*P0?(\\d+)", "As coordenadas dos vertices do lote sao:\nP$1")
                .replaceAll("(?i)Coordenadas dos v[ée]rtices:\\s*P0?(\\d+)", "Coordenadas dos vertices:\nP$1")
                .replaceAll("(?i)\\)\\s*P0?(\\d+)", ")\nP$1");
    }

    private String extractLotBlockForSingleLot(String content, Integer selectedLotNumber) {
        if (content == null || content.isBlank()) {
            return content;
        }

        if (selectedLotNumber != null) {
            Pattern targetLotPattern = Pattern.compile(
                    "(?ims)^LOTE\\s*0*" + selectedLotNumber
                            + "(?:\\s*:\\s*|\\s*\\[[^\\]]+\\]\\s*).*?(?=^LOTE\\s*\\d+(?:\\s*:|\\s*\\[[^\\]]+\\])|\\z)"
            );
            Matcher targetMatcher = targetLotPattern.matcher(content);
            if (targetMatcher.find()) {
                return targetMatcher.group().trim();
            }
        }

        Pattern genericLotPattern = Pattern.compile(
                "(?ims)^LOTE\\s*\\d+(?:\\s*:\\s*|\\s*\\[[^\\]]+\\]\\s*).*?(?=^LOTE\\s*\\d+(?:\\s*:|\\s*\\[[^\\]]+\\])|\\z)"
        );
        Matcher genericMatcher = genericLotPattern.matcher(content);
        if (genericMatcher.find()) {
            return genericMatcher.group().trim();
        }

        return content;
    }

    private boolean isUsefulSingleLotMemorial(String content, Integer selectedLotNumber) {
        if (content == null || content.isBlank()) {
            return false;
        }

        String trimmed = content.trim();
        if (selectedLotNumber != null) {
            Pattern lotPattern = Pattern.compile("(?i)^LOTE\\s*0*" + selectedLotNumber + "(?:\\s*:|\\s*\\[[^\\]]+\\])");
            if (!lotPattern.matcher(trimmed).find()) {
                return false;
            }
        } else if (!Pattern.compile("(?i)^LOTE\\s*\\d+(?:\\s*:|\\s*\\[[^\\]]+\\])").matcher(trimmed).find()) {
            return false;
        }

        if (trimmed.length() < 120) {
            return false;
        }

        String lowered = trimmed.toLowerCase(Locale.ROOT);
        if (lowered.contains("...") || lowered.contains("[repetir") || lowered.contains("[continuar")) {
            return false;
        }

        return lowered.contains("ao norte:") || lowered.contains("ao sul:");
    }

    private Integer extractSelectedLotNumber(List<String> selectedLayers) {
        if (selectedLayers == null || selectedLayers.isEmpty()) {
            return null;
        }

        Pattern pattern = Pattern.compile("(\\d+)");
        for (String layer : selectedLayers) {
            if (layer == null || layer.isBlank()) {
                continue;
            }
            Matcher matcher = pattern.matcher(layer);
            if (matcher.find()) {
                try {
                    return Integer.parseInt(matcher.group(1));
                } catch (NumberFormatException ignored) {
                    // Tenta a próxima layer, se houver.
                }
            }
        }

        return null;
    }

    private List<DxfParser.Entity> filterEntitiesBySelectedLayers(List<DxfParser.Entity> entities, List<String> selectedLayers) {
        if (entities == null || entities.isEmpty() || selectedLayers == null || selectedLayers.isEmpty()) {
            return entities;
        }

        Set<String> normalizedLayers = selectedLayers.stream()
                .filter(Objects::nonNull)
                .map(this::normalizeLayer)
                .filter(layer -> !layer.isBlank())
                .collect(Collectors.toSet());

        if (normalizedLayers.isEmpty()) {
            return entities;
        }

        return entities.stream()
                .filter(entity -> normalizedLayers.contains(normalizeLayer(entity.layer())))
                .collect(Collectors.toList());
    }

    private List<DxfParser.Entity> appendSelectedConfrontationTexts(
            List<DxfParser.Entity> entities,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        if (selectedConfrontationTexts == null || selectedConfrontationTexts.isEmpty()) {
            return entities;
        }

        List<DxfParser.Entity> merged = new ArrayList<>(entities != null ? entities : List.of());
        int appended = 0;

        for (SelectedConfrontationTextDTO selectedText : selectedConfrontationTexts) {
            if (selectedText == null || selectedText.text() == null || selectedText.text().isBlank()
                    || selectedText.x() == null || selectedText.y() == null) {
                continue;
            }

            String entityType = selectedText.entityType() != null && !selectedText.entityType().isBlank()
                    ? selectedText.entityType().trim().toUpperCase(Locale.ROOT)
                    : "TEXT";

            if (!"TEXT".equals(entityType) && !"MTEXT".equals(entityType)) {
                entityType = "TEXT";
            }

            merged.add(new DxfParser.Entity(
                    entityType,
                    selectedText.layer() != null && !selectedText.layer().isBlank()
                            ? selectedText.layer().trim()
                            : "SELECAO_MANUAL_CONFRONTACAO",
                    "manual-text-" + appended,
                    selectedText.x(),
                    selectedText.y(),
                    0.0,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    selectedText.text().trim(),
                    null,
                    2.5,
                    0.0,
                    List.of()
            ));
            appended++;
        }

        return merged;
    }

    private String normalizeLayer(String layer) {
        return layer == null ? "" : layer.trim().toLowerCase(Locale.ROOT);
    }

    private void debugReport(String runId, String hypothesisId, String location, String msg, Map<String, Object> data) {
        try {
            String debugServerUrl = "http://127.0.0.1:7778/event";
            String debugSessionId = "lot-selection-mismatch";
            Path envPath = Path.of(".dbg", "lot-selection-mismatch.env");
            if (Files.exists(envPath)) {
                for (String line : Files.readAllLines(envPath, StandardCharsets.UTF_8)) {
                    if (line.startsWith("DEBUG_SERVER_URL=")) {
                        debugServerUrl = line.substring("DEBUG_SERVER_URL=".length()).trim();
                    } else if (line.startsWith("DEBUG_SESSION_ID=")) {
                        debugSessionId = line.substring("DEBUG_SESSION_ID=".length()).trim();
                    }
                }
            }

            String payload = toJson(debugSessionId, runId, hypothesisId, location, msg, data);
            HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create(debugServerUrl))
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                            .build(),
                    java.net.http.HttpResponse.BodyHandlers.discarding()
            );
        } catch (Exception ignored) {
            // Intencional: a instrumentacao nao pode derrubar o fluxo.
        }
    }

    private String toJson(String sessionId, String runId, String hypothesisId, String location, String msg, Map<String, Object> data) {
        StringBuilder builder = new StringBuilder();
        builder.append("{")
                .append("\"sessionId\":\"").append(escapeJson(sessionId)).append("\",")
                .append("\"runId\":\"").append(escapeJson(runId)).append("\",")
                .append("\"hypothesisId\":\"").append(escapeJson(hypothesisId)).append("\",")
                .append("\"location\":\"").append(escapeJson(location)).append("\",")
                .append("\"msg\":\"").append(escapeJson(msg)).append("\",")
                .append("\"ts\":").append(System.currentTimeMillis()).append(",")
                .append("\"data\":{");

        boolean first = true;
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            if (!first) {
                builder.append(",");
            }
            first = false;
            builder.append("\"").append(escapeJson(entry.getKey())).append("\":");
            Object value = entry.getValue();
            if (value == null) {
                builder.append("null");
            } else if (value instanceof Number || value instanceof Boolean) {
                builder.append(value);
            } else {
                builder.append("\"").append(escapeJson(String.valueOf(value))).append("\"");
            }
        }

        builder.append("}}");
        return builder.toString();
    }

    private String escapeJson(String value) {
        return value == null ? "" : value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }

    private boolean isOpenAiRateLimitError(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String className = current.getClass().getSimpleName().toLowerCase(Locale.ROOT);
            if (className.contains("openairatelimitexception")) {
                return true;
            }
            String message = current.getMessage();
            if (message != null) {
                String lowered = message.toLowerCase(Locale.ROOT);
                if (lowered.contains("rate_limit_exceeded")
                        || lowered.contains("tokens per min")
                        || lowered.contains("requests per min")
                        || lowered.contains("please try again in")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }


    private boolean isOpenAiQuotaError(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String className = current.getClass().getSimpleName().toLowerCase(Locale.ROOT);
            if (className.contains("openaiquotaexceededexception")) {
                return true;
            }
            String message = current.getMessage();
            if (message != null) {
                String lowered = message.toLowerCase(Locale.ROOT);
                if (lowered.contains("insufficient_quota")
                        || lowered.contains("you exceeded your current quota")
                        || lowered.contains("problema de faturamento")
                        || lowered.contains("sem cota disponivel")) {
                    return true;
                }
            }
            current = current.getCause();
        }

        return false;
    }

    private String firstNonBlankMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current.getMessage() != null && !current.getMessage().isBlank()) {
                return current.getMessage();
            }
            current = current.getCause();
        }
        return "sem detalhe adicional";
    }

    private String buildOperatorFriendlyErrorMessage(Throwable throwable) {
        String detail = firstNonBlankMessage(throwable).toLowerCase(Locale.ROOT);

        if (detail.contains("propertyid")) {
            return "Selecione um imovel antes de gerar o memorial.";
        }
        if (detail.contains("standardid")) {
            return "Selecione uma norma antes de gerar o memorial.";
        }
        if (detail.contains("coordenad")
                || detail.contains("georreferenciada")
                || detail.contains("sirgas")) {
            return "Nao foi possivel confirmar coordenadas confiaveis neste arquivo. Revise o DXF e tente novamente.";
        }
        if (detail.contains("entity")
                || detail.contains("entidad")
                || detail.contains("dxf")) {
            return "Nao foi possivel concluir a leitura deste DXF. Revise o arquivo e tente novamente.";
        }

        return "Nao foi possivel concluir a geracao deste memorial agora. Revise a norma, o template e o Resumo Tecnico aplicados e tente novamente.";
    }
}





