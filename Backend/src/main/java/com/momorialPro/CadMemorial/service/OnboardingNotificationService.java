package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.config.AuthFlowProperties;
import com.momorialPro.CadMemorial.model.OnboardingNotificationSettings;
import com.momorialPro.CadMemorial.model.Tenant;
import com.momorialPro.CadMemorial.model.User;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class OnboardingNotificationService {

    private final OnboardingNotificationSettingsService settingsService;
    private final SmtpMailService smtpMailService;
    private final AuthFlowProperties authFlowProperties;

    public DispatchResult notifyPendingApproval(User user) {
        OnboardingNotificationSettings settings = settingsService.getOrCreateEntity();

        if (!Boolean.TRUE.equals(settings.getActive())) {
            return DispatchResult.skipped("Notificacoes de onboarding desativadas.");
        }

        if (!Boolean.TRUE.equals(settings.getNotifyOnPendingApproval())) {
            return DispatchResult.skipped("Evento de pending approval desativado.");
        }

        String responsibleEmail = normalizeEmail(settings.getResponsibleEmail());
        if (responsibleEmail == null) {
            return DispatchResult.skipped("E-mail do responsavel nao configurado.");
        }

        if (!smtpMailService.isDeliveryEnabled()) {
            return DispatchResult.skipped("Entrega SMTP indisponivel neste ambiente.");
        }

        String subject = "Novo cliente aguardando analise no GeoLimites";
        String html = buildPendingApprovalHtml(user, settings.getResponsibleName());

        try {
            smtpMailService.sendHtml(responsibleEmail, subject, html);
            return DispatchResult.sent(responsibleEmail);
        } catch (RuntimeException ex) {
            log.error("Falha ao enviar notificacao de onboarding para [{}]: {}", responsibleEmail, ex.getMessage(), ex);
            return DispatchResult.failed(responsibleEmail, ex.getMessage());
        }
    }

    private String buildPendingApprovalHtml(User user, String responsibleName) {
        Tenant tenant = user.getTenant();
        String adminUrl = buildAdminUrl();
        String greeting = normalizeText(responsibleName) != null ? responsibleName.trim() : "Administrador";
        String tenantName = tenant != null ? tenant.getName() : "Tenant nao identificado";
        String tenantCode = tenant != null ? tenant.getCode() : "-";

        return """
                <p>Olá, %s.</p>
                <p>Um novo cliente confirmou o e-mail e entrou em fila de analise no GeoLimites.</p>
                <ul>
                    <li><strong>Empresa:</strong> %s</li>
                    <li><strong>Codigo do tenant:</strong> %s</li>
                    <li><strong>Responsavel:</strong> %s</li>
                    <li><strong>E-mail:</strong> %s</li>
                </ul>
                <p>Acesse o painel administrativo para revisar e concluir a liberacao operacional.</p>
                <p><a href="%s">%s</a></p>
                """.formatted(
                greeting,
                escapeHtml(tenantName),
                escapeHtml(tenantCode),
                escapeHtml(resolveFullName(user)),
                escapeHtml(user.getEmail()),
                adminUrl,
                adminUrl
        );
    }

    private String buildAdminUrl() {
        String baseUrl = authFlowProperties.getFrontendUrl() != null
                ? authFlowProperties.getFrontendUrl().trim().replaceAll("/+$", "")
                : "";
        return baseUrl.isBlank() ? "/" : baseUrl + "/admin";
    }

    private String resolveFullName(User user) {
        String fullName = normalizeText(user.getFullName());
        return fullName != null ? fullName : user.getUsername();
    }

    private String normalizeEmail(String value) {
        String normalized = normalizeText(value);
        return normalized != null ? normalized.toLowerCase() : null;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    @lombok.Value
    @Builder
    public static class DispatchResult {
        boolean attempted;
        boolean sent;
        String targetEmail;
        String detail;

        public static DispatchResult skipped(String detail) {
            return DispatchResult.builder()
                    .attempted(false)
                    .sent(false)
                    .detail(detail)
                    .build();
        }

        public static DispatchResult sent(String targetEmail) {
            return DispatchResult.builder()
                    .attempted(true)
                    .sent(true)
                    .targetEmail(targetEmail)
                    .detail("Notificacao enviada com sucesso.")
                    .build();
        }

        public static DispatchResult failed(String targetEmail, String detail) {
            return DispatchResult.builder()
                    .attempted(true)
                    .sent(false)
                    .targetEmail(targetEmail)
                    .detail(detail)
                    .build();
        }
    }
}
