package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.CadSystemSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateCadSystemSettingsRequest;
import com.momorialPro.CadMemorial.model.CadSystemSettings;
import com.momorialPro.CadMemorial.repository.CadSystemSettingsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CadSystemSettingsServiceTest {

    @Mock
    private CadSystemSettingsRepository repository;

    @InjectMocks
    private CadSystemSettingsService cadSystemSettingsService;

    @Test
    void shouldCreateDefaultSingletonSettingsWhenRepositoryIsEmpty() {
        when(repository.findById((short) 1)).thenReturn(Optional.empty());
        when(repository.save(any(CadSystemSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CadSystemSettingsDTO settings = cadSystemSettingsService.getSettings();

        assertEquals("cm", settings.getMeasurementUnit());
        assertEquals(1000d, settings.getNewDocumentWorkspaceSize());
        verify(repository).save(any(CadSystemSettings.class));
    }

    @Test
    void shouldNormalizeInvalidValuesWhenUpdatingSettings() {
        CadSystemSettings existing = CadSystemSettings.builder()
                .id((short) 1)
                .measurementUnit("mm")
                .newDocumentWorkspaceSize(250d)
                .build();

        UpdateCadSystemSettingsRequest request = UpdateCadSystemSettingsRequest.builder()
                .measurementUnit("yards")
                .newDocumentWorkspaceSize(-10d)
                .build();

        when(repository.findById((short) 1)).thenReturn(Optional.of(existing));
        when(repository.save(any(CadSystemSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CadSystemSettingsDTO settings = cadSystemSettingsService.updateSettings(request);

        assertEquals("cm", settings.getMeasurementUnit());
        assertEquals(1000d, settings.getNewDocumentWorkspaceSize());
    }

    @Test
    void shouldReturnNormalizedEffectiveMeasurementUnit() {
        CadSystemSettings existing = CadSystemSettings.builder()
                .id((short) 1)
                .measurementUnit(" M ")
                .newDocumentWorkspaceSize(10d)
                .build();

        when(repository.findById((short) 1)).thenReturn(Optional.of(existing));

        assertEquals("m", cadSystemSettingsService.getEffectiveMeasurementUnit());
    }
}
