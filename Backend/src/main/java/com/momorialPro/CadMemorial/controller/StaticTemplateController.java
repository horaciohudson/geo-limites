package com.momorialPro.CadMemorial.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/templates")
@Slf4j
@CrossOrigin(origins = "*")
public class StaticTemplateController {

    @GetMapping("/{templateName}.json")
    public ResponseEntity<String> getTemplate(@PathVariable String templateName) {
        try {
            // Primeiro, tenta buscar no diretório raiz do backend
            Path templatePath = Paths.get(templateName + ".json");

            if (Files.exists(templatePath)) {
                String content = Files.readString(templatePath);

                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                        .body(content);
            }
            
            // Se não encontrar, tenta buscar em resources/templates
            try {
                Resource resource = new ClassPathResource("templates/" + templateName + ".json");
                if (resource.exists()) {
                    String content = Files.readString(Paths.get(resource.getURI()));

                    return ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                            .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                            .body(content);
                }
            } catch (Exception e) {
                // Continua para o fallback de template padrão.
            }

            // Se não encontrar em lugar nenhum, retorna um template padrão
            log.warn("Template não encontrado: {}.json, retornando template padrão", templateName);

            String defaultTemplate = createDefaultTemplate(templateName);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                    .body(defaultTemplate);

        } catch (IOException e) {
            log.error("Erro ao ler template {}: {}", templateName, e.getMessage());
            return ResponseEntity.internalServerError()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .body("{\"error\": \"Erro ao carregar template\"}");
        }
    }
    
    private String createDefaultTemplate(String templateName) {
        return switch (templateName) {
            case "memorial_descritivo" -> """
                {
                  "id": "memorial_descritivo",
                  "name": "Memorial Descritivo",
                  "description": "Template para memorial descritivo de levantamento topográfico",
                  "type": "memorial_descritivo",
                  "fields": [
                    {
                      "name": "proprietario",
                      "label": "Proprietário",
                      "type": "text",
                      "required": true
                    },
                    {
                      "name": "localizacao",
                      "label": "Localização",
                      "type": "text",
                      "required": true
                    },
                    {
                      "name": "area_total",
                      "label": "Área Total (m²)",
                      "type": "number",
                      "required": true
                    }
                  ],
                  "template": "MEMORIAL DESCRITIVO\\n\\nProprietário: {{proprietario}}\\nLocalização: {{localizacao}}\\nÁrea Total: {{area_total}} m²"
                }
                """;
            case "memorial_desmmembramento" -> """
                {
                  "id": "memorial_desmmembramento",
                  "name": "Memorial de Desmembramento",
                  "description": "Template para memorial descritivo de desmembramento de área",
                  "type": "memorial_desmmembramento",
                  "fields": [
                    {
                      "name": "proprietario",
                      "label": "Proprietário",
                      "type": "text",
                      "required": true
                    },
                    {
                      "name": "localizacao",
                      "label": "Localização",
                      "type": "text",
                      "required": true
                    },
                    {
                      "name": "area_original",
                      "label": "Área Original (m²)",
                      "type": "number",
                      "required": true
                    },
                    {
                      "name": "numero_lotes",
                      "label": "Número de Lotes",
                      "type": "number",
                      "required": true
                    }
                  ],
                  "template": "MEMORIAL DESCRITIVO DE DESMEMBRAMENTO\\n\\nProprietário: {{proprietario}}\\nLocalização: {{localizacao}}\\nÁrea Original: {{area_original}} m²\\nNúmero de Lotes: {{numero_lotes}}"
                }
                """;
            case "relatorio_geometrico" -> """
                {
                  "id": "relatorio_geometrico",
                  "name": "Relatório Geométrico",
                  "description": "Template para relatório geométrico de levantamento",
                  "type": "relatorio_geometrico",
                  "fields": [
                    {
                      "name": "perimetro",
                      "label": "Perímetro (m)",
                      "type": "number",
                      "required": true
                    },
                    {
                      "name": "area",
                      "label": "Área (m²)",
                      "type": "number",
                      "required": true
                    },
                    {
                      "name": "coordenadas",
                      "label": "Coordenadas",
                      "type": "textarea",
                      "required": true
                    }
                  ],
                  "template": "RELATÓRIO GEOMÉTRICO\\n\\nPerímetro: {{perimetro}} m\\nÁrea: {{area}} m²\\nCoordenadas:\\n{{coordenadas}}"
                }
                """;
            case "cadastro_terreno" -> """
                {
                  "id": "cadastro_terreno",
                  "name": "Cadastro de Terreno",
                  "description": "Template para cadastro de terreno",
                  "type": "cadastro_terreno",
                  "fields": [
                    {
                      "name": "inscricao_municipal",
                      "label": "Inscrição Municipal",
                      "type": "text",
                      "required": true
                    },
                    {
                      "name": "endereco",
                      "label": "Endereço",
                      "type": "text",
                      "required": true
                    },
                    {
                      "name": "bairro",
                      "label": "Bairro",
                      "type": "text",
                      "required": true
                    },
                    {
                      "name": "municipio",
                      "label": "Município",
                      "type": "text",
                      "required": true
                    }
                  ],
                  "template": "CADASTRO DE TERRENO\\n\\nInscrição Municipal: {{inscricao_municipal}}\\nEndereço: {{endereco}}\\nBairro: {{bairro}}\\nMunicípio: {{municipio}}"
                }
                """;
            default -> """
                {
                  "id": "%s",
                  "name": "Template Padrão",
                  "description": "Template padrão gerado automaticamente",
                  "type": "default",
                  "fields": [],
                  "template": "Template não encontrado: %s"
                }
                """.formatted(templateName, templateName);
        };
    }
}
