package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.config.MailSettingsProperties;
import com.momorialPro.CadMemorial.dto.SmtpSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateSmtpSettingsRequest;
import com.momorialPro.CadMemorial.model.SmtpSettings;
import com.momorialPro.CadMemorial.repository.SmtpSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmtpSettingsService {

    private final SmtpSettingsRepository smtpSettingsRepository;
    private final SettingCryptoService settingCryptoService;
    private final MailSettingsProperties mailSettingsProperties;

    @Transactional(readOnly = true)
    public SmtpSettingsDTO getSettings() {
        return toDto(getCurrentSettings());
    }

    @Transactional(readOnly = true)
    public String getResolvedPassword() {
        return settingCryptoService.decrypt(getCurrentSettings().getPasswordEncrypted());
    }

    @Transactional
    public SmtpSettingsDTO updateSettings(UpdateSmtpSettingsRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados SMTP nao informados.");
        }

        SmtpSettings settings = getOrCreateManagedSettings();

        if (request.getEnabled() != null) {
            settings.setEnabled(request.getEnabled());
        }
        if (request.getHost() != null) {
            settings.setHost(normalize(request.getHost()));
        }
        if (request.getPort() != null) {
            settings.setPort(request.getPort());
        }
        if (request.getUsername() != null) {
            settings.setUsername(normalize(request.getUsername()));
        }
        if (request.getPassword() != null && StringUtils.hasText(request.getPassword())) {
            settings.setPasswordEncrypted(settingCryptoService.encrypt(request.getPassword().trim()));
        }
        if (request.getAuth() != null) {
            settings.setAuth(request.getAuth());
        }
        if (request.getStartTls() != null) {
            settings.setStartTlsEnabled(request.getStartTls());
        }
        if (request.getSslEnabled() != null) {
            settings.setSslEnabled(request.getSslEnabled());
        }
        if (request.getFromAddress() != null) {
            settings.setFromAddress(normalize(request.getFromAddress()));
        }
        if (request.getFromName() != null) {
            settings.setFromName(normalizeName(request.getFromName()));
        }

        return toDto(smtpSettingsRepository.save(settings));
    }

    @Transactional
    public SmtpSettingsDTO clearPassword() {
        SmtpSettings settings = getOrCreateManagedSettings();
        settings.setPasswordEncrypted("");
        return toDto(smtpSettingsRepository.save(settings));
    }

    @Transactional(readOnly = true)
    public SmtpSettings getCurrentSettings() {
        try {
            return smtpSettingsRepository.findById(SmtpSettings.DEFAULT_ID)
                    .orElseGet(this::buildDefaultSettings);
        } catch (RuntimeException ex) {
            log.warn("Nao foi possivel carregar tab_smtp_settings. Usando configuracao SMTP padrao.", ex);
            return buildDefaultSettings();
        }
    }

    private SmtpSettings getOrCreateManagedSettings() {
        try {
            return smtpSettingsRepository.findById(SmtpSettings.DEFAULT_ID)
                    .orElseGet(() -> smtpSettingsRepository.save(buildDefaultSettings()));
        } catch (RuntimeException ex) {
            log.warn("Nao foi possivel persistir tab_smtp_settings. Usando configuracao SMTP padrao em memoria.", ex);
            return buildDefaultSettings();
        }
    }

    private SmtpSettings buildDefaultSettings() {
        return SmtpSettings.builder()
                .id(SmtpSettings.DEFAULT_ID)
                .enabled(false)
                .host("")
                .port(587)
                .username("")
                .passwordEncrypted("")
                .auth(true)
                .startTlsEnabled(true)
                .sslEnabled(false)
                .fromAddress(normalize(mailSettingsProperties.getFromAddress()))
                .fromName(normalizeName(mailSettingsProperties.getFromName()))
                .build();
    }

    private SmtpSettingsDTO toDto(SmtpSettings settings) {
        String encryptedPassword = settings.getPasswordEncrypted();

        return SmtpSettingsDTO.builder()
                .enabled(Boolean.TRUE.equals(settings.getEnabled()))
                .host(normalize(settings.getHost()))
                .port(settings.getPort() != null ? settings.getPort() : 587)
                .username(normalize(settings.getUsername()))
                .passwordMasked(maskPassword(encryptedPassword))
                .hasPassword(StringUtils.hasText(encryptedPassword))
                .auth(Boolean.TRUE.equals(settings.getAuth()))
                .startTls(Boolean.TRUE.equals(settings.getStartTlsEnabled()))
                .sslEnabled(Boolean.TRUE.equals(settings.getSslEnabled()))
                .fromAddress(normalize(settings.getFromAddress()))
                .fromName(normalizeName(settings.getFromName()))
                .build();
    }

    private String maskPassword(String encryptedPassword) {
        if (!StringUtils.hasText(encryptedPassword)) {
            return "";
        }

        String decrypted = settingCryptoService.decrypt(encryptedPassword);
        if (!StringUtils.hasText(decrypted)) {
            return "";
        }

        if (decrypted.length() <= 4) {
            return "*".repeat(decrypted.length());
        }

        return "*".repeat(Math.max(0, decrypted.length() - 4)) + decrypted.substring(decrypted.length() - 4);
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : "";
    }

    private String normalizeName(String value) {
        String normalized = normalize(value);
        return normalized.isBlank() ? "Geo Limites" : normalized;
    }
}
