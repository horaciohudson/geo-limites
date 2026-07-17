package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.*;
import com.momorialPro.CadMemorial.model.Template;
import com.momorialPro.CadMemorial.repository.TemplateRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.momorialPro.CadMemorial.model.User;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final UserRepository userRepository;
    private final ApiSettingsService apiSettingsService;
    private final MemorialExampleSanitizer memorialExampleSanitizer;

    @Value("${OPENAI_API_KEY:}")
    private String openaiApiKey;

    @Value("${memorialpro.claude.model}")
    private String claudeModel;

    @Value("${memorialpro.claude.api-key:}")
    private String claudeApiKey;

    @Value("${memorialpro.claude.endpoint}")
    private String claudeEndpoint;

    @Value("${memorialpro.storage.templates-dir:templates}")
    private String templatesDir;


    public List<TemplateDTO> findAll() {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndStatus(tenantId, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TemplateDTO> findActive() {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndStatus(tenantId, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TemplateDTO> findAvailableForUser(UUID userId) {
        UUID tenantId = requireTenantId(userId);
        return templateRepository.findAvailableForUser(userId, tenantId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Optional<TemplateDTO> findById(UUID id) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByIdAndTenantId(id, tenantId)
                .map(this::convertToDTO);
    }

    public List<TemplateDTO> findByMunicipality(String municipality) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndMunicipalityAndStatus(tenantId, municipality, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TemplateDTO> findByAbntNorm(String abntNorm) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndAbntNormAndStatus(tenantId, abntNorm, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TemplateDTO> findByMemorialStandard(UUID memorialStandardId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndMemorialStandardIdAndStatus(tenantId, memorialStandardId, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public TemplateDTO create(TemplateCreateDTO createDTO, UUID ownerId) {
        if (templateRepository.existsByNameAndOwnerId(createDTO.getName(), ownerId)) {
            throw new IllegalArgumentException("Já existe um template com este nome para este usuário");
        }

        UUID templateId = UUID.randomUUID();
        TemplateStorageData storageData = resolveTemplateStorageData(templateId, createDTO);

        Template template = Template.builder()
                .id(templateId)
                .name(createDTO.getName())
                .description(createDTO.getDescription())
                .fileUrl(storageData.fileUrl())
                .filePath(storageData.filePath())
                .memorialStandardId(createDTO.getMemorialStandardId())
                .municipality(createDTO.getMunicipality())
                .abntNorm(createDTO.getAbntNorm())
                .status(createDTO.getStatus() != null ? createDTO.getStatus() : Template.TemplateStatus.ACTIVE)
                .ownerId(ownerId)
                .build();

        Template saved = templateRepository.save(template);
        return convertToDTO(saved);
    }

    public TemplateDTO update(UUID id, TemplateCreateDTO updateDTO, UUID ownerId) {
        UUID tenantId = requireTenantId(ownerId);
        Template template = templateRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Template não encontrado"));

        if (!template.getOwnerId().equals(ownerId)) {
            throw new IllegalArgumentException("Você não tem permissão para editar este template");
        }

        TemplateStorageData storageData = updateDTO.getTemplateContent() != null && !updateDTO.getTemplateContent().isBlank()
                ? resolveTemplateStorageData(template.getId(), updateDTO)
                : new TemplateStorageData(
                        updateDTO.getFileUrl() != null && !updateDTO.getFileUrl().isBlank() ? updateDTO.getFileUrl() : template.getFileUrl(),
                        updateDTO.getFilePath() != null && !updateDTO.getFilePath().isBlank() ? updateDTO.getFilePath() : template.getFilePath()
                );

        template.setName(updateDTO.getName());
        template.setDescription(updateDTO.getDescription());
        template.setFileUrl(storageData.fileUrl());
        template.setFilePath(storageData.filePath());
        template.setMemorialStandardId(updateDTO.getMemorialStandardId());
        template.setMunicipality(updateDTO.getMunicipality());
        template.setAbntNorm(updateDTO.getAbntNorm());
        if (updateDTO.getStatus() != null) {
            template.setStatus(updateDTO.getStatus());
        }

        Template saved = templateRepository.save(template);
        return convertToDTO(saved);
    }

    public void delete(UUID id, UUID ownerId) {
        UUID tenantId = requireTenantId(ownerId);
        Template template = templateRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Template não encontrado"));

        if (!template.getOwnerId().equals(ownerId)) {
            throw new IllegalArgumentException("Você não tem permissão para deletar este template");
        }

        templateRepository.delete(template);
    }

    public TemplateDTO updateStatus(UUID id, Template.TemplateStatus status, UUID ownerId) {
        UUID tenantId = requireTenantId(ownerId);
        Template template = templateRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Template não encontrado"));

        if (!template.getOwnerId().equals(ownerId)) {
            throw new IllegalArgumentException("Você não tem permissão para alterar o status deste template");
        }

        template.setStatus(status);
        Template saved = templateRepository.save(template);
        return convertToDTO(saved);
    }

    public TemplateGenerationResponseDTO generateTemplate(MultipartFile file, TemplateGenerationRequestDTO request, UUID ownerId) {
        try {
            // Salvar arquivo usando o nome fornecido ou o nome original
            String originalFileName = file.getOriginalFilename();
            String baseName = "template";
            
            if (request.getName() != null && !request.getName().trim().isEmpty()) {
                baseName = request.getName().trim().replaceAll("[^a-zA-Z0-9_-]", "_");
            } else if (originalFileName != null && !originalFileName.isEmpty()) {
                int lastDotIndex = originalFileName.lastIndexOf(".");
                if (lastDotIndex > 0) {
                    baseName = originalFileName.substring(0, lastDotIndex);
                } else {
                    baseName = originalFileName;
                }
                baseName = baseName.replaceAll("[^a-zA-Z0-9_-]", "_");
            }
            
            String targetFileName = baseName + ".json";
            // Sem validação de pasta ou gravação em disco, pois o frontend que lida com o arquivo agora


            // Processamento do arquivo: extrair texto e chamar Claude se necessário
            String extractedText = "";
            boolean isJson = false;

            if (originalFileName != null && originalFileName.toLowerCase().endsWith(".json")) {
                isJson = true;
                extractedText = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
            } else if (originalFileName != null && originalFileName.toLowerCase().endsWith(".pdf")) {
                log.info("Processando arquivo PDF de exemplo: {}", originalFileName);
                PdfReader reader = null;
                try {
                    reader = new PdfReader(file.getInputStream());
                    int pages = reader.getNumberOfPages();
                    StringBuilder sb = new StringBuilder();
                    for (int i = 1; i <= pages; i++) {
                        sb.append(PdfTextExtractor.getTextFromPage(reader, i)).append("\n");
                    }
                    extractedText = sb.toString();
                } catch (Exception e) {
                    log.error("Erro ao extrair texto do PDF", e);
                    throw new RuntimeException("Falha ao extrair texto do PDF: " + e.getMessage(), e);
                } finally {
                    if (reader != null) {
                        reader.close();
                    }
                }
            } else {
                log.info("Processando arquivo de texto de exemplo: {}", originalFileName);
                extractedText = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
            }

            if (!isJson) {
                extractedText = memorialExampleSanitizer.sanitize(extractedText);
            }

            String jsonContent;
            if (isJson) {
                // Validar se é JSON estruturalmente válido
                try {
                    new com.fasterxml.jackson.databind.ObjectMapper().readTree(extractedText);
                    jsonContent = extractedText;
                } catch (Exception e) {
                    throw new IllegalArgumentException("O arquivo enviado com extensão .json não é um JSON válido.");
                }
            } else {
                jsonContent = generateTemplateWithAi(extractedText, request.getName(), request.getAbntNorm());
            }
            TemplateCreateDTO createDTO = new TemplateCreateDTO();
            createDTO.setName(request.getName() != null && !request.getName().isBlank() ? request.getName() : baseName);
            createDTO.setDescription(request.getDescription());
            createDTO.setTemplateContent(jsonContent);
            createDTO.setMemorialStandardId(request.getMemorialStandardId());
            createDTO.setMunicipality(request.getMunicipality());
            createDTO.setAbntNorm(request.getAbntNorm());
            createDTO.setStatus(Template.TemplateStatus.ACTIVE);

            TemplateDTO savedTemplate = create(createDTO, ownerId);
            log.info("Template processado com sucesso, persistido no backend e retornado ao frontend.");
            
            return TemplateGenerationResponseDTO.builder()
                    .id(savedTemplate.getId())
                    .name(savedTemplate.getName())
                    .templateContent(jsonContent)
                    .fileUrl(savedTemplate.getFileUrl())
                    .filePath(savedTemplate.getFilePath())
                    .message("Template processado com sucesso!")
                    .build();
                    
        } catch (IOException e) {
            log.error("Erro ao salvar arquivo do template", e);
            throw new RuntimeException("Erro ao processar arquivo do template", e);
        }
    }

    private String generateTemplateWithAi(String rawText, String templateName, String norm) {
        String provider = Optional.ofNullable(apiSettingsService.getSettings().getTemplateApiProvider())
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .orElse("CLAUDE");

        if ("OPENAI".equalsIgnoreCase(provider) || "GPT".equalsIgnoreCase(provider)) {
            log.info("Chamando OpenAI para converter exemplo de memorial em JSON...");
            return callOpenAiToGenerateTemplate(rawText, templateName, norm);
        }

        if ("CLAUDE".equalsIgnoreCase(provider)) {
            log.info("Chamando Claude para converter exemplo de memorial em JSON...");
            return callClaudeToGenerateTemplate(rawText, templateName, norm);
        }

        throw new IllegalArgumentException("O provedor configurado para templates ainda não é suportado: " + provider);
    }

    private String callOpenAiToGenerateTemplate(String rawText, String templateName, String norm) {
        if (openaiApiKey == null || openaiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("Chave da API da OpenAI não configurada (OPENAI_API_KEY).");
        }

        try {
            String openAiModel = apiSettingsService.resolveTemplateOpenAiModel();
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openaiApiKey);
            
            // Log para debug (mascarando a chave para segurança)
            String maskedKey = openaiApiKey.length() > 8 ? 
                openaiApiKey.substring(0, 8) + "..." + openaiApiKey.substring(openaiApiKey.length() - 4) : "INVALID";
            log.info("Enviando requisição para OpenAI com a chave: {}", maskedKey);

            Map<String, Object> body = new HashMap<>();
            body.put("model", openAiModel);
            // Usando json_object garante que a resposta será um JSON válido.
            // Apenas gpt-4-1106-preview ou superior suportam response_format={"type":"json_object"}
            // Como gpt-5.5 não é um modelo OpenAI padrão, e pode falhar com essa flag dependendo do proxy/API,
            // removemos o json_object flag para manter a compatibilidade com a API da interface configurada.
            // body.put("response_format", Map.of("type", "json_object"));
            if (apiSettingsService.supportsCustomTemperatureForTemplateModel()) {
                body.put("temperature", 0.1);
            }

            log.info("Gerando template com OpenAI usando modelo configurado: {}", openAiModel);

            body.put("messages", new Object[]{
                    Map.of("role", "system", "content", buildTemplateSystemPrompt()),
                    Map.of("role", "user", "content", buildTemplateUserPrompt(rawText, templateName, norm))
            });

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://api.openai.com/v1/chat/completions",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new RuntimeException("Resposta nula recebida da OpenAI API.");
            }

            String content = extractContentFromOpenAIResponse(responseBody);
            if (content == null) {
                throw new RuntimeException("Não foi possível extrair o texto da resposta da OpenAI.");
            }

            // Limpar possíveis tags de markdown se a IA ignorar a instrução
            content = content.trim();
            if (content.startsWith("```")) {
                int firstNewLine = content.indexOf("\n");
                int lastBackticks = content.lastIndexOf("```");
                if (firstNewLine != -1 && lastBackticks != -1 && lastBackticks > firstNewLine) {
                    content = content.substring(firstNewLine + 1, lastBackticks).trim();
                }
            }

            // Validar se o retorno é um JSON estruturalmente válido
            new com.fasterxml.jackson.databind.ObjectMapper().readTree(content);

            return content;
        } catch (Exception e) {
            log.error("Erro ao chamar OpenAI API para gerar o template", e);
            throw new RuntimeException("Erro ao gerar template com IA: " + e.getMessage(), e);
        }
    }

    private String callClaudeToGenerateTemplate(String rawText, String templateName, String norm) {
        if (claudeApiKey == null || claudeApiKey.trim().isEmpty()) {
            throw new IllegalStateException("Chave da API do Claude não configurada (memorialpro.claude.api-key).");
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", claudeApiKey);
            headers.set("anthropic-version", "2023-06-01");

            Map<String, Object> body = new HashMap<>();
            body.put("model", claudeModel);
            body.put("max_tokens", 4000);
            body.put("temperature", 0.1);
            body.put("system", buildTemplateSystemPrompt());
            body.put("messages", new Object[]{
                    Map.of("role", "user", "content", buildTemplateUserPrompt(rawText, templateName, norm))
            });

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    claudeEndpoint,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            String content = extractContentFromClaudeResponse(response.getBody());
            content = sanitizeGeneratedJson(content);
            new com.fasterxml.jackson.databind.ObjectMapper().readTree(content);
            return content;
        } catch (Exception e) {
            log.error("Erro ao chamar Claude API para gerar o template", e);
            throw new RuntimeException("Erro ao gerar template com IA: " + e.getMessage(), e);
        }
    }

    private String buildTemplateSystemPrompt() {
        return "Você é um assistente especializado em estruturar templates de memoriais descritivos topográficos e cartoriais.\n" +
                "Seu objetivo é analisar o texto de um memorial descritivo de exemplo e convertê-lo em um template JSON com placeholders configuráveis no formato exato solicitado pelo usuário.\n" +
                "Você deve consolidar o resultado em um único schema canônico, sem criar versões alternativas para o mesmo memorial.\n" +
                "Em memoriais de desmembramento, preserve a lógica: cabeçalho, situação antes, situação depois e declaração final.\n" +
                "Quando houver repetição de lotes, represente a repetição com um placeholder estrutural, como {{lotes_resultantes}}, em vez de gerar schemas paralelos.\n" +
                "Nunca inclua ruídos de PDF assinado, como links de validação, manifesto de assinaturas, signatários ou avisos de assinatura.\n" +
                "Retorne APENAS o JSON válido correspondente, sem explicações adicionais e sem blocos de código markdown (como ```json).";
    }

    private String buildTemplateUserPrompt(String rawText, String templateName, String norm) {
        return "Por favor, transforme o seguinte memorial descritivo de exemplo em um template JSON estruturado para o sistema.\n" +
                "Nome sugerido do template: " + templateName + "\n" +
                "Norma de referência: " + (norm != null ? norm : "NBR-17047:2024") + "\n\n" +
                "--- INÍCIO DO EXEMPLO ---\n" +
                rawText + "\n" +
                "--- FIM DO EXEMPLO ---\n\n" +
                "O formato JSON de saída DEVE seguir a seguinte estrutura exata:\n" +
                "{\n" +
                "  \"template_id\": \"" + templateName + "\",\n" +
                "  \"descricao\": \"Descrição detalhada de para qual tipo de memorial este template se aplica\",\n" +
                "  \"versao\": \"1.0\",\n" +
                "  \"norma_referencia\": \"NBR-17047:2024 ou outra norma\",\n" +
                "  \"modo_texto\": \"texto corrido cartorial ou outro modo\",\n" +
                "  \"estrutura\": {\n" +
                "    \"cabecalho\": \"Texto do cabeçalho usando placeholders entre chaves duplas {{placeholder}} (ex: {{proprietario}}, {{logradouro}}, etc.)\",\n" +
                "    \"situacao_antes\": \"Texto da situação antes (se aplicável para desmembramento/retificação, caso contrário string vazia) usando placeholders\",\n" +
                "    \"situacao_depois\": \"Texto da situação depois/lote usando placeholders\",\n" +
                "    \"declaracao_final\": \"Texto da declaração final de encerramento do memorial usando placeholders\"\n" +
                "  },\n" +
                "  \"placeholders\": {\n" +
                "    \"nome_do_placeholder\": \"Descrição detalhada do que este placeholder representa\"\n" +
                "  },\n" +
                "  \"observacoes\": [\n" +
                "    \"Observações importantes sobre regras de formatação, direções e preenchimento deste template\"\n" +
                "  ]\n" +
                "}\n\n" +
                "Modelo canônico preferencial para desmembramento:\n" +
                "- cabecalho: dados iniciais do memorial\n" +
                "- situacao_antes: descrição do terreno original\n" +
                "- situacao_depois: bloco único com {{lotes_resultantes}} para os lotes derivados\n" +
                "- declaracao_final: fechamento técnico/jurídico\n\n" +
                "Identifique todos os trechos variáveis do exemplo (proprietário, áreas, perímetros, logradouro, confrontantes, direções, limites, etc.) e substitua-os por placeholders adequados.\n" +
                "REGRA DE OURO PARA CONFRONTAÇÕES DOS LOTES RESULTANTES: O sistema injeta automaticamente o texto completo das confrontações já formatado com números por extenso e direções cartoriais. Portanto, você DEVE obrigatoriamente usar o placeholder exato {{confrontacoesFormatadas}} no bloco de lotes resultantes para representar as medidas e confrontações. NUNCA crie outro nome de placeholder para as confrontações dos lotes.\n" +
                "Não crie múltiplos estilos concorrentes dentro do mesmo JSON.\n" +
                "Não copie qualquer ruído de extração de PDF, assinaturas eletrônicas ou links de validação para o template.\n" +
                "Lembre-se de retornar APENAS o JSON puro. Não envolva o JSON em tags markdown ```json.";
    }

    private String sanitizeGeneratedJson(String content) {
        String sanitized = content.trim();
        if (sanitized.startsWith("```")) {
            int firstNewLine = sanitized.indexOf("\n");
            int lastBackticks = sanitized.lastIndexOf("```");
            if (firstNewLine != -1 && lastBackticks != -1 && lastBackticks > firstNewLine) {
                sanitized = sanitized.substring(firstNewLine + 1, lastBackticks).trim();
            }
        }
        return sanitized;
    }

    private String extractContentFromOpenAIResponse(Map<String, Object> responseBody) {
        try {
            List<Map<String, Object>> choicesList = (List<Map<String, Object>>) responseBody.get("choices");
            if (choicesList != null && !choicesList.isEmpty()) {
                Map<String, Object> choiceMap = choicesList.get(0);
                Map<String, Object> messageMap = (Map<String, Object>) choiceMap.get("message");
                return (String) messageMap.get("content");
            }
            throw new RuntimeException("Estrutura inválida na resposta da OpenAI");
        } catch (Exception e) {
            throw new RuntimeException("Erro ao extrair conteúdo da resposta da OpenAI: " + e.getMessage());
        }
    }

    private String extractContentFromClaudeResponse(Map<String, Object> responseBody) {
        if (responseBody == null) {
            throw new RuntimeException("Resposta nula recebida da Claude API.");
        }

        try {
            Object contentObj = responseBody.get("content");
            if (contentObj instanceof List) {
                List<?> contentList = (List<?>) contentObj;
                if (!contentList.isEmpty() && contentList.get(0) instanceof Map) {
                    Map<?, ?> firstContent = (Map<?, ?>) contentList.get(0);
                    Object text = firstContent.get("text");
                    if (text != null) {
                        return text.toString();
                    }
                }
            }
            throw new RuntimeException("Estrutura inválida na resposta da Claude API.");
        } catch (Exception e) {
            throw new RuntimeException("Erro ao extrair conteúdo da resposta da Claude API: " + e.getMessage(), e);
        }
    }

    public boolean existsByName(String name, UUID ownerId) {
        return templateRepository.existsByNameAndOwnerId(name, ownerId);
    }

    public AppliedTemplateContext resolveAppliedTemplate(String templateBackendId, String fallbackTemplateName) {
        String normalizedFallbackName = fallbackTemplateName != null && !fallbackTemplateName.isBlank()
                ? fallbackTemplateName.trim()
                : null;

        if (templateBackendId == null || templateBackendId.isBlank()) {
            return new AppliedTemplateContext(normalizedFallbackName, null);
        }

        try {
            UUID templateId = UUID.fromString(templateBackendId.trim());
            UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
            Optional<Template> templateOpt = templateRepository.findByIdAndTenantId(templateId, tenantId);
            if (templateOpt.isEmpty()) {
                log.warn("Template aplicado {} nao encontrado no tenant atual", templateBackendId);
                return new AppliedTemplateContext(normalizedFallbackName, null);
            }

            Template template = templateOpt.get();
            String resolvedName = template.getName() != null && !template.getName().isBlank()
                    ? template.getName().trim()
                    : normalizedFallbackName;
            String templateContent = readTemplateContent(template.getFilePath());
            return new AppliedTemplateContext(resolvedName, templateContent);
        } catch (IllegalArgumentException e) {
            log.warn("templateBackendId invalido recebido para memorial: {}", templateBackendId);
            return new AppliedTemplateContext(normalizedFallbackName, null);
        }
    }

    private TemplateStorageData resolveTemplateStorageData(UUID templateId, TemplateCreateDTO dto) {
        if (dto.getTemplateContent() != null && !dto.getTemplateContent().isBlank()) {
            return saveTemplateContent(templateId, dto.getName(), dto.getTemplateContent());
        }

        if (dto.getFileUrl() == null || dto.getFileUrl().isBlank() || dto.getFilePath() == null || dto.getFilePath().isBlank()) {
            throw new IllegalArgumentException("Template sem conteudo JSON ou caminho de arquivo persistente.");
        }

        return new TemplateStorageData(dto.getFileUrl(), dto.getFilePath());
    }

    private TemplateStorageData saveTemplateContent(UUID templateId, String templateName, String templateContent) {
        try {
            String baseName = sanitizeTemplateName(templateName);
            Path baseDirectory = Paths.get(templatesDir).toAbsolutePath().normalize();
            Files.createDirectories(baseDirectory);

            String fileName = baseName + "-" + templateId + ".json";
            Path targetPath = baseDirectory.resolve(fileName);
            String normalizedJson = new com.fasterxml.jackson.databind.ObjectMapper()
                    .writerWithDefaultPrettyPrinter()
                    .writeValueAsString(new com.fasterxml.jackson.databind.ObjectMapper().readTree(templateContent));

            Files.writeString(targetPath, normalizedJson);
            return new TemplateStorageData("/api/templates/" + templateId + "/download", targetPath.toString());
        } catch (IOException e) {
            throw new RuntimeException("Erro ao persistir o arquivo JSON do template.", e);
        }
    }

    private String sanitizeTemplateName(String templateName) {
        if (templateName == null || templateName.trim().isEmpty()) {
            return "template";
        }

        return templateName.trim().replaceAll("[^a-zA-Z0-9_-]", "_");
    }

    private TemplateDTO convertToDTO(Template template) {
        UUID tenantId = AuthUtils.getCurrentTenantId();
        String ownerName = (tenantId == null
                ? userRepository.findById(template.getOwnerId())
                : userRepository.findByIdAndTenantId(template.getOwnerId(), tenantId))
                .map(User::getUsername)
                .orElse("Usuário não encontrado");

        return TemplateDTO.builder()
                .id(template.getId())
                .name(template.getName())
                .description(template.getDescription())
                .fileUrl(template.getFileUrl())
                .filePath(template.getFilePath())
                .memorialStandardId(template.getMemorialStandardId())
                .municipality(template.getMunicipality())
                .abntNorm(template.getAbntNorm())
                .status(template.getStatus())
                .ownerId(template.getOwnerId())
                .ownerName(ownerName)
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }

    private String readTemplateContent(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            return null;
        }

        try {
            Path path = Paths.get(filePath).toAbsolutePath().normalize();
            if (!Files.exists(path)) {
                log.warn("Arquivo do template aplicado nao encontrado: {}", path);
                return null;
            }
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.warn("Nao foi possivel ler o conteudo do template aplicado em {}: {}", filePath, e.getMessage());
            return null;
        }
    }

    private record TemplateStorageData(String fileUrl, String filePath) {
    }

    public record AppliedTemplateContext(String templateName, String templateContent) {
    }

    private UUID requireTenantId(UUID userId) {
        return userRepository.findById(userId)
                .map(User::getTenant)
                .map(tenant -> tenant != null ? tenant.getId() : null)
                .orElseThrow(() -> new IllegalArgumentException("Usuário sem tenant válido"));
    }
}
