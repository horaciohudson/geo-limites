package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.util.DxfParser;
import com.momorialPro.CadMemorial.dto.MemorialExportDTO;
import com.momorialPro.CadMemorial.dto.MemorialRequestDTO;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.MemorialService;
import com.momorialPro.CadMemorial.service.MemorialGptService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;
import java.security.MessageDigest;

/**
 * Controller responsável por geração de memorial descritivo
 * usando GPT a partir de dados DXF já processados em memória.
 */
@RestController
@RequestMapping("/api/memorial")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MemorialGptController {

    private final MemorialService memorialService;
    private final MemorialGptService memorialGptService;

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
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==============================================================
    // 🤖 GERA MEMORIAL COM GPT A PARTIR DE DADOS DXF EM MEMÓRIA
    // ==============================================================
    @PostMapping("/generate-gpt")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<MemorialExportDTO> generateGptMemorial(@RequestBody MemorialRequestDTO request) {
        log.info("🚀 Iniciando geração de memorial com IA");
        log.info("📋 Dados da requisição: projectName={}, standardId={}, entities={}", 
                request.projectName(), request.standardId(), 
                request.entities() != null ? request.entities().size() : 0);
        
        if (request.entities() == null || request.entities().isEmpty()) {
            log.warn("⚠️ Nenhuma entidade DXF fornecida na requisição");
            return ResponseEntity.badRequest().build();
        }
        
        log.info("🔍 Detalhes das entidades recebidas:");
        // Limita o log a apenas as primeiras 5 entidades para evitar spam de logs
        int entitiesToLog = Math.min(5, request.entities().size());
        for (int i = 0; i < entitiesToLog; i++) {
            DxfParser.Entity entity = request.entities().get(i);
            String fingerprint = entity.fingerprint();
            // Se o fingerprint for null, gera um novo
            if (fingerprint == null) {
                fingerprint = generateFingerprint(entity);
                log.info("🔧 Fingerprint gerado para entidade {}: {}", i+1, fingerprint.substring(0, Math.min(8, fingerprint.length())));
            }
            log.info("  - Entidade {}: Tipo: {}, Layer: {}, Fingerprint: {}", 
                    i+1, entity.type(), entity.layer(), 
                    fingerprint.substring(0, Math.min(8, fingerprint.length())));
        }
        
        if (request.entities().size() > 5) {
            log.info("... e mais {} entidades (log limitado para performance)", request.entities().size() - 5);
        }

        try {
            UUID userId = AuthUtils.getCurrentUserId();
            
            // Primeiro gera o memorial tradicional
            log.info("📝 Gerando memorial tradicional primeiro...");
            MemorialExportDTO traditionalMemorial = memorialService.generate(request);
            log.info("✅ Memorial tradicional gerado com sucesso");

            // Simula comparação DXF dividindo as entidades
            log.info("🔄 Simulando comparação DXF...");
            List<DxfParser.Entity> allEntities = request.entities();
            int midPoint = allEntities.size() / 2;
            
            List<DxfParser.Entity> oldEntities = allEntities.subList(0, midPoint);
            List<DxfParser.Entity> newEntities = allEntities.subList(midPoint, allEntities.size());
            
            log.info("📊 Divisão das entidades: antigas={}, novas={}", oldEntities.size(), newEntities.size());

            // Calcula mudanças por tipo
            Map<String, Integer> oldCounts = oldEntities.stream()
                    .collect(Collectors.groupingBy(DxfParser.Entity::type, 
                            Collectors.collectingAndThen(Collectors.counting(), Math::toIntExact)));
            
            Map<String, Integer> newCounts = newEntities.stream()
                    .collect(Collectors.groupingBy(DxfParser.Entity::type, 
                            Collectors.collectingAndThen(Collectors.counting(), Math::toIntExact)));

            log.info("📈 Contagem por tipo - Antigas: {}", oldCounts);
            log.info("📈 Contagem por tipo - Novas: {}", newCounts);

            // Usa nomes de arquivo da requisição
            String oldFileName = "Arquivo Base";
            String newFileName = "Arquivo Revisado";
            
            // Análise detalhada das entidades para comparação
            List<DxfParser.Entity> allEntitiesForComparison = request.entities();
            int totalEntities = allEntitiesForComparison.size();
            int halfSize = totalEntities / 2;
            
            log.info("📊 Analisando {} entidades para comparação", totalEntities);
            List<DxfParser.Entity> oldEntitiesForComparison = allEntitiesForComparison.subList(0, halfSize);
            List<DxfParser.Entity> newEntitiesForComparison = allEntitiesForComparison.subList(halfSize, totalEntities);
            
            log.info("📈 Entidades antigas: {}, Entidades novas: {}", oldEntitiesForComparison.size(), newEntitiesForComparison.size());
            
            // Análise por tipo de entidade (limitada para performance)
            log.info("🔍 Analisando entidades por tipo...");
            int sampleSize = Math.min(3, totalEntities);
            for (int i = 0; i < sampleSize; i++) {
                DxfParser.Entity entity = allEntitiesForComparison.get(i);
                String fingerprint = entity.fingerprint();
                // Se o fingerprint for null, gera um novo
                if (fingerprint == null) {
                    fingerprint = generateFingerprint(entity);
                }
                String fingerprintDisplay = fingerprint.substring(0, Math.min(8, fingerprint.length()));
                log.info("📋 Entidade {}: tipo={}, layer={}, fingerprint={}", 
                    i+1, entity.type(), entity.layer(), fingerprintDisplay);
            }
            
            if (totalEntities > 3) {
                log.info("... análise limitada a {} entidades de {} total para performance", sampleSize, totalEntities);
            }
            
            // Contagem por tipo
            Map<String, Long> oldEntityCounts = oldEntitiesForComparison.stream()
                .collect(Collectors.groupingBy(DxfParser.Entity::type, Collectors.counting()));
            Map<String, Long> newEntityCounts = newEntitiesForComparison.stream()
                .collect(Collectors.groupingBy(DxfParser.Entity::type, Collectors.counting()));
            
            log.info("🔄 Processando mudanças entre arquivos...");
            
            // Calcula diferenças reais
            List<DxfEntityChangeDTO> added = new ArrayList<>();
            List<DxfEntityChangeDTO> removed = new ArrayList<>();
            List<DxfEntityChangeDTO> modified = new ArrayList<>();
            
            // Agrupa entidades por tipo para análise
            Map<String, Long> oldByType = oldEntitiesForComparison.stream()
                .collect(Collectors.groupingBy(DxfParser.Entity::type, Collectors.counting()));
            Map<String, Long> newByType = newEntitiesForComparison.stream()
                .collect(Collectors.groupingBy(DxfParser.Entity::type, Collectors.counting()));
            
            log.info("📊 Análise por tipo - Antigas: {}, Novas: {}", oldByType, newByType);
            
            // Identifica mudanças por tipo
            Set<String> allTypes = new HashSet<>();
            allTypes.addAll(oldByType.keySet());
            allTypes.addAll(newByType.keySet());
            
            for (String type : allTypes) {
                long oldCount = oldByType.getOrDefault(type, 0L);
                long newCount = newByType.getOrDefault(type, 0L);
                
                if (newCount > oldCount) {
                    // Entidades adicionadas - extrai coordenadas reais
                    List<DxfParser.Entity> newEntitiesOfType = newEntitiesForComparison.stream()
                        .filter(e -> e.type().equals(type))
                        .collect(Collectors.toList());
                    
                    for (int i = 0; i < Math.min(newEntitiesOfType.size(), (int)(newCount - oldCount)); i++) {
                        DxfParser.Entity entity = newEntitiesOfType.get(i);
                        log.info("🔍 Entidade original {}: tipo={}, x={}, y={}, text='{}'", 
                                i, entity.type(), entity.x(), entity.y(), entity.text());
                        DxfEntityChangeDTO dto = DxfEntityChangeDTO.builder()
                            .type(entity.type())
                            .layer(entity.layer())
                            .id(entity.fingerprint() != null ? entity.fingerprint() : "new_" + type + "_" + i)
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
                            .textHeight(entity.textHeight())
                            .textRotation(entity.textRotation())
                            .build();
                        
                        log.info("✅ DTO ADDED criado: tipo={}, x={}, y={}, layer={}", 
                                dto.getType(), dto.getX(), dto.getY(), dto.getLayer());
                        added.add(dto);
                    }
                } else if (oldCount > newCount) {
                    // Entidades removidas - extrai coordenadas reais
                    List<DxfParser.Entity> oldEntitiesOfType = oldEntitiesForComparison.stream()
                        .filter(e -> e.type().equals(type))
                        .collect(Collectors.toList());
                    
                    for (int i = 0; i < Math.min(oldEntitiesOfType.size(), (int)(oldCount - newCount)); i++) {
                        DxfParser.Entity entity = oldEntitiesOfType.get(i);
                        removed.add(DxfEntityChangeDTO.builder()
                            .type(entity.type())
                            .layer(entity.layer())
                            .id(entity.fingerprint() != null ? entity.fingerprint() : "old_" + type + "_" + i)
                            .change("REMOVED")
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
                            .textHeight(entity.textHeight())
                            .textRotation(entity.textRotation())
                            .build());
                    }
                }
                
                // Entidades modificadas (se há sobreposição)
                long commonCount = Math.min(oldCount, newCount);
                if (commonCount > 0 && oldCount != newCount) {
                    List<DxfParser.Entity> newEntitiesOfType = newEntitiesForComparison.stream()
                        .filter(e -> e.type().equals(type))
                        .collect(Collectors.toList());
                    
                    for (int i = 0; i < Math.min(Math.min(commonCount, 5), newEntitiesOfType.size()); i++) {
                        DxfParser.Entity entity = newEntitiesOfType.get(i);
                        modified.add(DxfEntityChangeDTO.builder()
                            .type(entity.type())
                            .layer(entity.layer())
                            .id(entity.fingerprint() != null ? entity.fingerprint() : "mod_" + type + "_" + i)
                            .change("MODIFIED")
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
                            .textHeight(entity.textHeight())
                            .textRotation(entity.textRotation())
                            .build());
                    }
                }
            }
            
            log.info("📈 Mudanças calculadas: +{}, -{}, ~{}", added.size(), removed.size(), modified.size());
            
            // Cria resumo das mudanças
            Map<String, Integer> summaryByType = new LinkedHashMap<>();
            for (DxfEntityChangeDTO change : added) {
                summaryByType.merge(change.getType() + ":+", 1, Integer::sum);
            }
            for (DxfEntityChangeDTO change : removed) {
                summaryByType.merge(change.getType() + ":-", 1, Integer::sum);
            }
            for (DxfEntityChangeDTO change : modified) {
                summaryByType.merge(change.getType() + ":~", 1, Integer::sum);
            }
            
            // Cria um DxfCompareResultDTO com comparação real
            DxfCompareResultDTO compareResult = DxfCompareResultDTO.builder()
                .oldFileName(oldFileName)
                .newFileName(newFileName)
                .totalOldEntities(oldEntitiesForComparison.size())
                .totalNewEntities(newEntitiesForComparison.size())
                .added(added)
                .removed(removed)
                .modified(modified)
                .summaryByType(summaryByType)
                .summary(traditionalMemorial.getComparisonSummary())
                .differences(traditionalMemorial.getDifferences())
                .build();
            
            log.info("🤖 Enviando dados para IA...");
            
            // Usa o GPT para gerar memorial seguindo normas específicas
            String gptContent = memorialGptService.generate(
                compareResult, 
                request.standardId(), 
                userId
            );
            
            log.info("✅ Conteúdo recebido da IA com {} caracteres", gptContent.length());
            
            // Cria novo memorial com conteúdo gerado pelo GPT
            MemorialExportDTO gptMemorial = new MemorialExportDTO();
            gptMemorial.setMemorialText("MEMORIAL GERADO COM IA\n\n" + gptContent);
            gptMemorial.setProjectName(request.projectName());
            gptMemorial.setProjectDescription(request.projectDescription());
            gptMemorial.setComparisonSummary(traditionalMemorial.getComparisonSummary());
            gptMemorial.setDifferences(traditionalMemorial.getDifferences());
            
            log.info("🎉 Memorial com IA gerado com sucesso!");
            return ResponseEntity.ok(gptMemorial);
            
        } catch (Exception e) {
            log.error("💥 Erro durante geração do memorial com IA: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
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
}