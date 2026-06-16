package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.service.DxfGeoReferenciaExtractorService;
import com.momorialPro.CadMemorial.util.DxfParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller para debug e testes do sistema
 */
@RestController
@RequestMapping("/api/debug")
@RequiredArgsConstructor
@Slf4j
public class DebugController {

    private final DxfGeoReferenciaExtractorService geoExtractorService;

    /**
     * Teste simples de upload - debug completo
     */
    @PostMapping("/teste-upload")
    public ResponseEntity<Map<String, Object>> testeUpload(
            HttpServletRequest request,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam Map<String, String> allParams) {
        
        Map<String, Object> resultado = new HashMap<>();
        
        // Debug completo
        resultado.put("parametros_recebidos", allParams);
        resultado.put("content_type", request.getContentType());
        resultado.put("method", request.getMethod());
        
        if (file == null) {
            resultado.put("status", "❌ ARQUIVO NÃO RECEBIDO");
            resultado.put("mensagem", "Parâmetro 'file' não foi enviado");
            resultado.put("debug", "Verifique se o Postman está configurado como form-data e tipo File");
            return ResponseEntity.badRequest().body(resultado);
        }
        
        resultado.put("status", "✅ ARQUIVO RECEBIDO");
        resultado.put("nome", file.getOriginalFilename());
        resultado.put("tamanho", file.getSize());
        resultado.put("tipo", file.getContentType());
        
        return ResponseEntity.ok(resultado);
    }

    /**
     * Testa extração de coordenadas SIRGAS de um arquivo DXF
     */
    @PostMapping("/testar-georeferencia")
    public ResponseEntity<Map<String, Object>> testarGeoReferencia(
            @RequestParam("file") MultipartFile file) {

        try {
            // Parse do DXF
            List<Map<String, Object>> entidades = parseDxfToEntidades(file);
            
            // Extração de coordenadas
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordBase = 
                    geoExtractorService.extrairCoordenadaBase(entidades);
            
            Map<String, Object> resultado = new HashMap<>();
            
            if (coordBase != null) {
                resultado.put("status", "✅ ENCONTRADO");
                resultado.put("coordenada_e", coordBase.getE());
                resultado.put("coordenada_n", coordBase.getN());
                resultado.put("fonte", coordBase.getFonte());
                resultado.put("formato", String.format("E %.2fm, N %.2fm", 
                        coordBase.getE(), coordBase.getN()));
                resultado.put("valido_sirgas", true);

            } else {
                resultado.put("status", "❌ NÃO ENCONTRADO");
                resultado.put("mensagem", "Coordenadas SIRGAS não foram encontradas no DXF");
                resultado.put("valido_sirgas", false);
                resultado.put("sugestao", "Verifique se o arquivo DXF contém coordenadas georeferenciadas");
                
                log.warn("Coordenadas SIRGAS nao encontradas para o arquivo {}", file.getOriginalFilename());
            }
            
            // Informações adicionais
            resultado.put("arquivo", file.getOriginalFilename());
            resultado.put("tamanho_kb", file.getSize() / 1024);
            resultado.put("entidades_total", entidades.size());
            
            return ResponseEntity.ok(resultado);
            
        } catch (Exception e) {
            log.error("💥 ERRO no teste de georeferência: {}", e.getMessage(), e);
            
            Map<String, Object> erro = new HashMap<>();
            erro.put("status", "💥 ERRO");
            erro.put("mensagem", e.getMessage());
            erro.put("arquivo", file.getOriginalFilename());
            
            return ResponseEntity.badRequest().body(erro);
        }
    }

    /**
     * Lista todas as entidades de um DXF para debug
     */
    @PostMapping("/listar-entidades")
    public ResponseEntity<Map<String, Object>> listarEntidades(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "limit", defaultValue = "50") int limit) {

        try {
            List<Map<String, Object>> entidades = parseDxfToEntidades(file);
            
            Map<String, Object> resultado = new HashMap<>();
            resultado.put("arquivo", file.getOriginalFilename());
            resultado.put("total_entidades", entidades.size());
            
            // Limitar entidades para não sobrecarregar
            List<Map<String, Object>> entidadesLimitadas = entidades.stream()
                    .limit(limit)
                    .collect(Collectors.toList());
            
            resultado.put("entidades_mostradas", entidadesLimitadas.size());
            resultado.put("entidades", entidadesLimitadas);
            
            // Estatísticas por tipo
            Map<String, Long> estatisticas = entidades.stream()
                    .collect(Collectors.groupingBy(
                            e -> (String) e.get("type"),
                            Collectors.counting()
                    ));
            
            resultado.put("estatisticas_por_tipo", estatisticas);
            
            return ResponseEntity.ok(resultado);
            
        } catch (Exception e) {
            log.error("💥 ERRO ao listar entidades: {}", e.getMessage(), e);
            
            Map<String, Object> erro = new HashMap<>();
            erro.put("status", "💥 ERRO");
            erro.put("mensagem", e.getMessage());
            erro.put("arquivo", file.getOriginalFilename());
            
            return ResponseEntity.badRequest().body(erro);
        }
    }

    /**
     * Busca textos específicos no DXF
     */
    @PostMapping("/buscar-textos")
    public ResponseEntity<Map<String, Object>> buscarTextos(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "filtro", defaultValue = "") String filtro) {

        try {
            List<Map<String, Object>> entidades = parseDxfToEntidades(file);
            
            List<Map<String, Object>> textos = entidades.stream()
                    .filter(e -> "TEXT".equals(e.get("type")) || "MTEXT".equals(e.get("type")))
                    .filter(e -> {
                        String texto = (String) e.get("text");
                        return texto != null && (filtro.isEmpty() || 
                                texto.toLowerCase().contains(filtro.toLowerCase()));
                    })
                    .collect(Collectors.toList());
            
            Map<String, Object> resultado = new HashMap<>();
            resultado.put("arquivo", file.getOriginalFilename());
            resultado.put("filtro", filtro);
            resultado.put("textos_encontrados", textos.size());
            resultado.put("textos", textos);
            
            return ResponseEntity.ok(resultado);
            
        } catch (Exception e) {
            log.error("💥 ERRO ao buscar textos: {}", e.getMessage(), e);
            
            Map<String, Object> erro = new HashMap<>();
            erro.put("status", "💥 ERRO");
            erro.put("mensagem", e.getMessage());
            erro.put("arquivo", file.getOriginalFilename());
            
            return ResponseEntity.badRequest().body(erro);
        }
    }

    /**
     * Método auxiliar para converter DXF em entidades Map
     */
    private List<Map<String, Object>> parseDxfToEntidades(MultipartFile file) throws IOException {
        // Salvar arquivo temporariamente
        Path tempFile = Files.createTempFile("debug_dxf_", ".dxf");
        
        try {
            file.transferTo(tempFile);
            
            // Parse usando DxfParser
            List<DxfParser.Entity> entities = DxfParser.parse(tempFile);
            
            // Converter para formato Map
            return entities.stream()
                    .map(this::convertEntityToMap)
                    .collect(Collectors.toList());
                    
        } finally {
            // Limpar arquivo temporário
            Files.deleteIfExists(tempFile);
        }
    }

    /**
     * Converte DxfParser.Entity para Map<String, Object>
     */
    private Map<String, Object> convertEntityToMap(DxfParser.Entity entity) {
        Map<String, Object> map = new HashMap<>();
        map.put("type", entity.type());
        map.put("layer", entity.layer());
        map.put("fingerprint", entity.fingerprint());
        
        // Adicionar coordenadas
        if (entity.x() != null) map.put("x", entity.x());
        if (entity.y() != null) map.put("y", entity.y());
        if (entity.z() != null) map.put("z", entity.z());
        if (entity.x2() != null) map.put("x2", entity.x2());
        if (entity.y2() != null) map.put("y2", entity.y2());
        if (entity.z2() != null) map.put("z2", entity.z2());
        
        // Adicionar propriedades específicas
        if (entity.radius() != null) map.put("radius", entity.radius());
        if (entity.startAngle() != null) map.put("startAngle", entity.startAngle());
        if (entity.endAngle() != null) map.put("endAngle", entity.endAngle());
        if (entity.text() != null) map.put("text", entity.text());
        if (entity.textStyle() != null) map.put("textStyle", entity.textStyle());
        if (entity.textHeight() != null) map.put("textHeight", entity.textHeight());
        if (entity.textRotation() != null) map.put("textRotation", entity.textRotation());
        
        // Adicionar vértices se existirem
        if (entity.vertices() != null && !entity.vertices().isEmpty()) {
            List<Map<String, Object>> verticesList = new ArrayList<>();
            for (DxfParser.Point vertex : entity.vertices()) {
                Map<String, Object> vertexMap = new HashMap<>();
                vertexMap.put("x", vertex.x());
                vertexMap.put("y", vertex.y());
                vertexMap.put("id", vertex.id());
                verticesList.add(vertexMap);
            }
            map.put("vertices", verticesList);
        }
        
        return map;
    }
}
