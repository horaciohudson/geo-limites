package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.service.MemorialAiServiceWithCredits;
import com.momorialPro.CadMemorial.service.MemorialService;
import com.momorialPro.CadMemorial.util.DxfParser;
import com.momorialPro.CadMemorial.dto.MemorialExportDTO;
import com.momorialPro.CadMemorial.dto.MemorialRequestDTO;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.MemorialApiService;
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
    public ResponseEntity<MemorialExportDTO> generateGptMemorial(@RequestBody MemorialRequestDTO request) {
        if (request.propertyId() == null) {
            log.error("PropertyId ausente na geração do memorial com IA");
        }
        
        if (request.entities() == null || request.entities().isEmpty()) {
            log.warn("Nenhuma entidade DXF fornecida");
            return ResponseEntity.badRequest().build();
        }
        
        if (request.standardId() == null) {
            log.error("StandardId é obrigatório para gerar memorial com IA");
            return ResponseEntity.badRequest().build();
        }

        try {
            UUID userId = AuthUtils.getCurrentUserId();

            // ⚡ CORREÇÃO CRÍTICA: Usar TODAS as entidades como "ADDED" (não dividir ao meio)
            // O frontend envia um único arquivo DXF, não uma comparação entre dois arquivos
            List<DxfParser.Entity> allEntities = request.entities();

            // Usa nomes de arquivo da requisição
            String oldFileName = "Arquivo Base";
            String newFileName = "Arquivo Revisado";
            
            // ⚡ TODAS as entidades são consideradas "ADDED" (arquivo único)
            List<DxfEntityChangeDTO> added = new ArrayList<>();
            List<DxfEntityChangeDTO> removed = new ArrayList<>(); // Vazio para arquivo único
            List<DxfEntityChangeDTO> modified = new ArrayList<>(); // Vazio para arquivo único
            
            // ⚡ Adicionar TODAS as entidades como "ADDED" (arquivo único, não comparação)
            for (int i = 0; i < allEntities.size(); i++) {
                DxfParser.Entity entity = allEntities.get(i);
                DxfEntityChangeDTO dto = DxfEntityChangeDTO.builder()
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
                    .textHeight(entity.textHeight())
                    .textRotation(entity.textRotation())
                    .vertices(convertVertices(entity.vertices()))  // ⚡ CRÍTICO: Adicionar vértices!
                    .build();
                
                added.add(dto);
            }

            // Cria resumo das entidades por tipo
            Map<String, Integer> summaryByType = new LinkedHashMap<>();
            for (DxfEntityChangeDTO entity : added) {
                summaryByType.merge(entity.getType(), 1, Integer::sum);
            }

            // Cria um DxfCompareResultDTO (arquivo único, sem comparação)
            DxfCompareResultDTO compareResult = DxfCompareResultDTO.builder()
                .oldFileName("N/A")
                .newFileName(newFileName)
                .totalOldEntities(0) // Não há arquivo antigo
                .totalNewEntities(allEntities.size())
                .added(added)
                .removed(removed) // Lista vazia
                .modified(modified) // Lista vazia
                .summaryByType(summaryByType)
                .summary("Análise de " + allEntities.size() + " entidades DXF")
                .differences(added) // Todas as entidades são "diferenças" (ADDED)
                .build();

            // Usa o serviço assistido para gerar memorial seguindo normas específicas
            String aiContent = memorialAiService.generateMemorialWithCredits(
                compareResult, 
                request.standardId(), 
                userId,
                request.propertyId()
            );

            // Cria resposta final
            MemorialExportDTO gptMemorial = new MemorialExportDTO();
            gptMemorial.setMemorialText(aiContent);
            gptMemorial.setProjectName(request.projectName());
            gptMemorial.setProjectDescription(request.projectDescription());
            gptMemorial.setComparisonSummary("Memorial assistido gerado com " + request.entities().size() + " entidades");
            gptMemorial.setDifferences(added); // Todas as entidades estão na lista "added"

            return ResponseEntity.ok(gptMemorial);
            
        } catch (Exception e) {
            log.error("Erro durante geração do memorial com IA: {}", e.getMessage(), e);
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





