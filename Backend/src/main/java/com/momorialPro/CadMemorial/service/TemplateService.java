package com.momorialPro.CadMemorial.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String DEFAULT_TEMPLATE_DESCRIPTION =
            "Template para memorial descritivo cartorial de desmembramento de área urbana, contendo cabeçalho com dados do imóvel e do levantamento, descrição da situação antes do desmembramento, descrição consolidada dos lotes resultantes na situação depois e declaração final técnico-jurídica do responsável pelo levantamento topográfico.";
    private static final String CANONICAL_TEMPLATE_MODE = "texto corrido cartorial";
    private static final String CANONICAL_HEADER =
            "MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA\n\nTerreno: {{tipo_terreno}} | Proprietário: {{proprietario}} Localização: {{logradouro_principal}} | Bairro: {{bairro}} | Município: {{municipio}}/{{uf}} Objetivo: {{objetivo_levantamento}} Georreferenciado no Datum {{datum_referencia}} para fins de {{finalidade_memorial}}.";
    private static final String CANONICAL_SITUATION_BEFORE =
            "SITUAÇÃO ANTES DESTE DESMEMBRAMENTO DE ÁREA\n\nTERRENO {{terreno_original_identificacao}}\nUm imóvel {{natureza_imovel_original}}, localizado na {{logradouro_original}}, bairro {{bairro}}, {{municipio}}/{{uf}}, possuindo formato {{formato_terreno_original}}, conforme seus pontos {{pontos_coordenadas_terreno_original}}, perfazendo assim, um perímetro de {{perimetro_terreno_original}} ({{perimetro_terreno_original_extenso}}), com uma área territorial total de {{area_terreno_original}} ({{area_terreno_original_extenso}}), com as seguintes medidas e confrontações:\n{{confrontacoes_terreno_original_formatadas}}";
    private static final String CANONICAL_SITUATION_AFTER =
            "SITUAÇÃO DEPOIS DESTE DESMEMBRAMENTO DE ÁREA\n{{lotes_resultantes}}";
    private static final String CANONICAL_FINAL_DECLARATION =
            "DECLARAÇÃO\n\nDeclaro para todos os fins e efeitos de direito que o levantamento topográfico respeitou as divisas consolidadas e o alinhamento do logradouro público, importando sujeitar-se ao que dispõe o § 14, do artigo 213, da LRP. Verificado a qualquer tempo não serem verdadeiros os fatos constantes no memorial descritivo, responderão o requerente e o profissional que o elaborou pelos prejuízos causados, independentemente das sanções disciplinares e penais. {{local_declaracao}}, {{data_declaracao}}.\n\n_________________________________________________\n{{responsavel_tecnico_nome}} | {{responsavel_tecnico_conselho}}: {{responsavel_tecnico_registro}} | RNP: {{responsavel_tecnico_rnp}}";

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

            return normalizeGeneratedTemplateToCanonicalLocal(content, templateName, norm);
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
            return normalizeGeneratedTemplateToCanonicalLocal(content, templateName, norm);
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

    private String normalizeGeneratedTemplateToCanonicalLocal(String content, String templateName, String norm) throws IOException {
        JsonNode parsed = OBJECT_MAPPER.readTree(content);
        if (!(parsed instanceof ObjectNode root)) {
            throw new IllegalArgumentException("O template gerado pela IA não retornou um objeto JSON válido.");
        }

        String resolvedTemplateId = resolveGeneratedField(root.path("template_id"), templateName != null && !templateName.isBlank() ? templateName : "template");
        String resolvedDescription = resolveGeneratedField(root.path("descricao"), DEFAULT_TEMPLATE_DESCRIPTION);
        String resolvedVersion = resolveGeneratedField(root.path("versao"), "1.0");
        String resolvedNorm = resolveGeneratedField(root.path("norma_referencia"), norm != null && !norm.isBlank() ? norm : "NBR-17047:2024");

        ObjectNode normalized = OBJECT_MAPPER.createObjectNode();
        normalized.put("template_id", resolvedTemplateId);
        normalized.put("descricao", resolvedDescription);
        normalized.put("versao", resolvedVersion);
        normalized.put("norma_referencia", resolvedNorm);
        normalized.put("modo_texto", CANONICAL_TEMPLATE_MODE);

        ObjectNode structure = normalized.putObject("estrutura");
        structure.put("cabecalho", CANONICAL_HEADER);
        structure.put("situacao_antes", CANONICAL_SITUATION_BEFORE);
        structure.put("situacao_depois", CANONICAL_SITUATION_AFTER);
        structure.put("declaracao_final", CANONICAL_FINAL_DECLARATION);

        ObjectNode placeholders = normalized.putObject("placeholders");
        placeholders.put("tipo_terreno", "Classificação do terreno objeto do memorial, por exemplo: Urbano, Rural ou outra denominação aplicável.");
        placeholders.put("proprietario", "Nome ou razão social do proprietário do imóvel objeto do desmembramento, podendo incluir qualificação complementar quando exigida.");
        placeholders.put("logradouro_principal", "Logradouro principal de localização do imóvel, conforme cadastro municipal, matrícula ou levantamento topográfico.");
        placeholders.put("bairro", "Bairro onde se localiza o imóvel.");
        placeholders.put("municipio", "Município onde se localiza o imóvel.");
        placeholders.put("uf", "Unidade federativa do municipio do imovel, em formato abreviado, por exemplo: CE.");
        placeholders.put("objetivo_levantamento", "Descrição do objetivo técnico do trabalho, por exemplo: Levantamento Topográfico Planimétrico de imóvel urbano.");
        placeholders.put("datum_referencia", "Datum geodésico utilizado no georreferenciamento, por exemplo: SIRGAS 2000.");
        placeholders.put("finalidade_memorial", "Finalidade jurídica ou administrativa do memorial, por exemplo: Desmembramento de Área.");
        placeholders.put("terreno_original_identificacao", "Identificação do terreno na situação anterior ao desmembramento, por exemplo: 1, A, Gleba 01 ou denominação equivalente.");
        placeholders.put("natureza_imovel_original", "Natureza do imóvel original, por exemplo: urbano ou rural.");
        placeholders.put("logradouro_original", "Logradouro de localização do terreno original antes do desmembramento.");
        placeholders.put("formato_terreno_original", "Descrição do formato geométrico do terreno original, por exemplo: poligonal e irregular.");
        placeholders.put("pontos_coordenadas_terreno_original", "Sequência dos vértices do terreno original com suas respectivas coordenadas Este e Norte, no padrão cartorial: P01 (coordenadas E ...m e N ...m), P02 (...), etc.");
        placeholders.put("perimetro_terreno_original", "Perímetro numérico do terreno original, com unidade de medida, por exemplo: 292,78m.");
        placeholders.put("perimetro_terreno_original_extenso", "Perímetro do terreno original escrito por extenso, incluindo metros e centímetros.");
        placeholders.put("area_terreno_original", "Área numérica total do terreno original, com unidade de medida, por exemplo: 3.334,51m².");
        placeholders.put("area_terreno_original_extenso", "Área total do terreno original escrita por extenso, incluindo metros quadrados e decímetros quadrados quando aplicável.");
        placeholders.put("confrontacoes_terreno_original_formatadas", "Texto completo das medidas e confrontações do terreno original, organizado por orientação cardeal ou lado, com direções, distâncias, pontos de partida e chegada, confrontantes, matrículas, proprietários e demais informações cartoriais pertinentes.");
        placeholders.put("lotes_resultantes", "Bloco estrutural repetível contendo todos os lotes gerados pelo desmembramento. Cada lote deve seguir o padrão: LOTE {{lote_identificacao}}:\\nUm imóvel {{lote_natureza_imovel}}, localizado na {{lote_logradouro}}, bairro {{lote_bairro}}, {{lote_municipio}}/{{lote_uf}}, possuindo formato {{lote_formato}}, conforme seus pontos {{lote_pontos_coordenadas}}, perfazendo assim, um perímetro de {{lote_perimetro}} ({{lote_perimetro_extenso}}), com uma área territorial de {{lote_area}} ({{lote_area_extenso}}), com as seguintes medidas e confrontações:\\n{{confrontacoesFormatadas}}");
        placeholders.put("lote_identificacao", "Número, letra ou denominação do lote resultante, por exemplo: 1, 2, 23, A ou Lote Remanescente.");
        placeholders.put("lote_natureza_imovel", "Natureza do lote resultante, por exemplo: urbano ou rural.");
        placeholders.put("lote_logradouro", "Logradouro de localização ou frente principal do lote resultante.");
        placeholders.put("lote_bairro", "Bairro do lote resultante, quando diferente ou quando preenchido individualmente.");
        placeholders.put("lote_municipio", "Município do lote resultante, quando preenchido individualmente.");
        placeholders.put("lote_uf", "Unidade federativa do lote resultante, quando preenchida individualmente.");
        placeholders.put("lote_formato", "Descrição do formato geométrico do lote resultante, por exemplo: poligonal, irregular ou poligonal irregular.");
        placeholders.put("lote_pontos_coordenadas", "Sequência dos vértices do lote resultante com suas respectivas coordenadas Este e Norte, no padrão cartorial.");
        placeholders.put("lote_perimetro", "Perímetro numérico do lote resultante, com unidade de medida.");
        placeholders.put("lote_perimetro_extenso", "Perímetro do lote resultante escrito por extenso, incluindo metros e centímetros.");
        placeholders.put("lote_area", "Área numérica do lote resultante, com unidade de medida.");
        placeholders.put("lote_area_extenso", "Área do lote resultante escrita por extenso, incluindo metros quadrados e decímetros quadrados quando aplicável.");
        placeholders.put("confrontacoesFormatadas", "Texto completo das confrontações do lote resultante, já formatado pelo sistema com orientações, faces, medidas, sentidos, pontos, confrontantes, números por extenso e redação cartorial. Este placeholder deve ser usado obrigatoriamente para as confrontações dos lotes resultantes.");
        placeholders.put("local_declaracao", "Município ou local de emissão/assinatura da declaração final.");
        placeholders.put("data_declaracao", "Data completa da declaração final, escrita no padrão cartorial, por exemplo: 13 de julho de 2024.");
        placeholders.put("responsavel_tecnico_nome", "Nome completo do profissional responsável técnico pelo memorial e levantamento.");
        placeholders.put("responsavel_tecnico_conselho", "Conselho profissional e unidade regional do responsável técnico, por exemplo: CREA/CE.");
        placeholders.put("responsavel_tecnico_registro", "Número de registro do responsável técnico no conselho profissional.");
        placeholders.put("responsavel_tecnico_rnp", "Número do Registro Nacional Profissional do responsável técnico.");

        ArrayNode observations = normalized.putArray("observacoes");
        observations.add("Em memoriais de desmembramento, preservar a ordem: cabeçalho, situação antes, situação depois e declaração final.");
        observations.add("O bloco {{lotes_resultantes}} deve ser repetido uma vez para cada lote resultante do desmembramento, mantendo a redação cartorial em texto corrido.");
        observations.add("Nas confrontações dos lotes resultantes, utilizar obrigatoriamente o placeholder {{confrontacoesFormatadas}}, pois o sistema injeta automaticamente o texto completo das medidas e confrontações.");
        observations.add("As coordenadas devem ser apresentadas com indicação dos pontos e dos valores E e N, observando o datum informado no cabeçalho.");
        observations.add("Áreas, perímetros e distâncias devem ser informados numericamente e também por extenso quando o campo correspondente existir.");
        observations.add("As confrontações devem indicar orientação, posição da face quando aplicável, sentido, distância, ponto inicial, ponto final e confrontante.");
        observations.add("Não incluir no template links de validação, manifestos de assinatura, signatários, carimbos digitais ou quaisquer ruídos de PDF assinado.");

        return OBJECT_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(normalized);
    }

    private String resolveGeneratedField(JsonNode node, String fallback) {
        if (node != null && node.isTextual()) {
            String value = node.asText().trim();
            if (!value.isEmpty()) {
                return value;
            }
        }
        return fallback;
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
