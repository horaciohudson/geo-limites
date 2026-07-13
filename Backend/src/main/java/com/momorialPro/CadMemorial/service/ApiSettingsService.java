package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.ApiSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateApiSettingsRequest;
import com.momorialPro.CadMemorial.model.ApiSettings;
import com.momorialPro.CadMemorial.repository.ApiSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApiSettingsService {

    private final ApiSettingsRepository repository;

    private static final Short SINGLETON_ID = 1;
    private static final String DEFAULT_OPENAI_MODEL = "gpt-4o";

    @Transactional(readOnly = true)
    public ApiSettingsDTO getSettings() {
        ApiSettings entity = repository.findById(SINGLETON_ID)
                .orElseGet(() -> {
                    ApiSettings defaultSettings = new ApiSettings();
                    defaultSettings.setId(SINGLETON_ID);
                    defaultSettings.setTemplateApiProvider("CLAUDE");
                    defaultSettings.setTemplateApiModel("GPT-4.0");
                    defaultSettings.setMemorialApiProvider("CLAUDE");
                    defaultSettings.setMemorialApiModel("GPT-4.0");
                    return defaultSettings;
                });

        return toDTO(entity);
    }

    @Transactional
    public ApiSettingsDTO updateSettings(UpdateApiSettingsRequest request) {
        ApiSettings entity = repository.findById(SINGLETON_ID)
                .orElseGet(() -> {
                    ApiSettings newEntity = new ApiSettings();
                    newEntity.setId(SINGLETON_ID);
                    return newEntity;
                });

        entity.setTemplateApiProvider(request.getTemplateApiProvider());
        entity.setTemplateApiModel(request.getTemplateApiModel());
        entity.setMemorialApiProvider(request.getMemorialApiProvider());
        entity.setMemorialApiModel(request.getMemorialApiModel());

        repository.save(entity);

        return toDTO(entity);
    }

    private ApiSettingsDTO toDTO(ApiSettings entity) {
        return ApiSettingsDTO.builder()
                .templateApiProvider(entity.getTemplateApiProvider())
                .templateApiModel(entity.getTemplateApiModel())
                .memorialApiProvider(entity.getMemorialApiProvider())
                .memorialApiModel(entity.getMemorialApiModel())
                .build();
    }

    @Transactional(readOnly = true)
    public String resolveTemplateOpenAiModel() {
        return normalizeOpenAiModel(getSettings().getTemplateApiModel());
    }

    @Transactional(readOnly = true)
    public String resolveMemorialOpenAiModel() {
        return normalizeOpenAiModel(getSettings().getMemorialApiModel());
    }

    @Transactional(readOnly = true)
    public boolean supportsCustomTemperatureForTemplateModel() {
        return supportsCustomTemperature(resolveTemplateOpenAiModel());
    }

    @Transactional(readOnly = true)
    public boolean supportsCustomTemperatureForMemorialModel() {
        return supportsCustomTemperature(resolveMemorialOpenAiModel());
    }

    @Transactional(readOnly = true)
    public boolean usesMaxCompletionTokensForMemorialModel() {
        return usesMaxCompletionTokens(resolveMemorialOpenAiModel());
    }

    @Transactional(readOnly = true)
    public boolean usesMaxCompletionTokensForTemplateModel() {
        return usesMaxCompletionTokens(resolveTemplateOpenAiModel());
    }

    private String normalizeOpenAiModel(String configuredModel) {
        if (configuredModel == null || configuredModel.isBlank()) {
            return DEFAULT_OPENAI_MODEL;
        }

        String normalized = configuredModel.trim()
                .toLowerCase()
                .replace("openai", "")
                .replaceAll("\\s+", " ")
                .trim();

        return switch (normalized) {
            case "gpt-4.0", "gpt-4o" -> "gpt-4o";
            case "gpt-5.5" -> "gpt-5.5";
            case "gpt-5.4" -> "gpt-5.4";
            case "gpt-5.4 mini", "gpt-5.4-mini" -> "gpt-5.4-mini";
            default -> normalized.replace(' ', '-');
        };
    }

    private boolean supportsCustomTemperature(String normalizedModel) {
        if (normalizedModel == null || normalizedModel.isBlank()) {
            return true;
        }

        return !normalizedModel.startsWith("gpt-5");
    }

    private boolean usesMaxCompletionTokens(String normalizedModel) {
        if (normalizedModel == null || normalizedModel.isBlank()) {
            return false;
        }

        return normalizedModel.startsWith("gpt-5");
    }
}
