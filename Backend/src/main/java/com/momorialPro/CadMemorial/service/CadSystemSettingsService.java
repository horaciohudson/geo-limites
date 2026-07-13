package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.CadSystemSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateCadSystemSettingsRequest;
import com.momorialPro.CadMemorial.model.CadSystemSettings;
import com.momorialPro.CadMemorial.repository.CadSystemSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CadSystemSettingsService {

    private static final Short SINGLETON_ID = 1;

    private final CadSystemSettingsRepository repository;

    @Transactional(readOnly = true)
    public CadSystemSettingsDTO getSettings() {
        return toDTO(getOrCreateEntity());
    }

    @Transactional
    public CadSystemSettingsDTO updateSettings(UpdateCadSystemSettingsRequest request) {
        CadSystemSettings entity = getOrCreateEntity();
        entity.setMeasurementUnit(normalizeMeasurementUnit(request.getMeasurementUnit()));
        entity.setNewDocumentWorkspaceSize(normalizeWorkspaceSize(request.getNewDocumentWorkspaceSize()));
        repository.save(entity);
        return toDTO(entity);
    }

    @Transactional
    public CadSystemSettings getOrCreateEntity() {
        return repository.findById(SINGLETON_ID)
                .orElseGet(() -> repository.save(CadSystemSettings.builder().id(SINGLETON_ID).build()));
    }

    @Transactional(readOnly = true)
    public String getEffectiveMeasurementUnit() {
        return normalizeMeasurementUnit(getOrCreateEntity().getMeasurementUnit());
    }

    private String normalizeMeasurementUnit(String measurementUnit) {
        String normalized = measurementUnit == null ? "" : measurementUnit.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "mm", "cm", "m" -> normalized;
            default -> "cm";
        };
    }

    private Double normalizeWorkspaceSize(Double workspaceSize) {
        if (workspaceSize == null || !Double.isFinite(workspaceSize) || workspaceSize <= 0d) {
            return 1000d;
        }
        return workspaceSize;
    }

    private CadSystemSettingsDTO toDTO(CadSystemSettings entity) {
        return CadSystemSettingsDTO.builder()
                .measurementUnit(normalizeMeasurementUnit(entity.getMeasurementUnit()))
                .newDocumentWorkspaceSize(normalizeWorkspaceSize(entity.getNewDocumentWorkspaceSize()))
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
