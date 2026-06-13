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

    @Transactional(readOnly = true)
    public ApiSettingsDTO getSettings() {
        ApiSettings entity = repository.findById(SINGLETON_ID)
                .orElseGet(() -> {
                    ApiSettings defaultSettings = new ApiSettings();
                    defaultSettings.setId(SINGLETON_ID);
                    defaultSettings.setTemplateApiProvider("CLAUDE");
                    defaultSettings.setMemorialApiProvider("CLAUDE");
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
        entity.setMemorialApiProvider(request.getMemorialApiProvider());

        repository.save(entity);

        return toDTO(entity);
    }

    private ApiSettingsDTO toDTO(ApiSettings entity) {
        return ApiSettingsDTO.builder()
                .templateApiProvider(entity.getTemplateApiProvider())
                .memorialApiProvider(entity.getMemorialApiProvider())
                .build();
    }
}
