package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.config.AuthFlowProperties;
import com.momorialPro.CadMemorial.model.User;
import lombok.Builder;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.net.URISyntaxException;

@Service
@Slf4j
@RequiredArgsConstructor
public class AccountEmailService {

    private final SmtpMailService smtpMailService;
    private final AuthFlowProperties authFlowProperties;

    public DispatchResult sendVerificationEmail(User user, String token) {
        String verificationUrl = buildVerificationUrl(token);

        if (!smtpMailService.isDeliveryEnabled()) {
            return DispatchResult.builder()
                    .emailSent(false)
                    .verificationUrl(verificationUrl)
                    .build();
        }

        String subject = "Confirme seu e-mail no Geo Limites";
        String html = """
                <p>Olá, %s.</p>
                <p>Sua conta foi criada no Geo Limites. Para liberar o acesso, confirme seu e-mail clicando no link abaixo:</p>
                <p><a href="%s">%s</a></p>
                <p>Se você não solicitou esse cadastro, ignore esta mensagem.</p>
                """.formatted(safeName(user), verificationUrl, verificationUrl);

        smtpMailService.sendHtml(user.getEmail(), subject, html);
        return DispatchResult.builder()
                .emailSent(true)
                .verificationUrl(null)
                .build();
    }

    private String buildVerificationUrl(String token) {
        String baseUrl = resolveFrontendBaseUrl();
        String normalizedBaseUrl = baseUrl != null ? baseUrl.strip().replaceAll("/+$", "") : "";
        if (normalizedBaseUrl.isBlank()) {
            throw new IllegalStateException("APP_FRONTEND_URL não foi configurado.");
        }
        return normalizedBaseUrl + "/verify-email?token=" + token;
    }

    private String safeName(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getUsername();
    }

    private String resolveFrontendBaseUrl() {
        String requestOrigin = resolveRequestOrigin();
        if (requestOrigin != null && !requestOrigin.isBlank()) {
            return requestOrigin;
        }
        return authFlowProperties.getFrontendUrl();
    }

    private String resolveRequestOrigin() {
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        if (!(requestAttributes instanceof ServletRequestAttributes servletRequestAttributes)) {
            return null;
        }

        HttpServletRequest request = servletRequestAttributes.getRequest();
        String originHeader = normalizeOrigin(extractOrigin(request.getHeader("Origin")));
        if (originHeader != null) {
            return originHeader;
        }

        String refererHeader = normalizeOrigin(extractOrigin(request.getHeader("Referer")));
        if (refererHeader != null) {
            return refererHeader;
        }

        return null;
    }

    private String extractOrigin(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            URI uri = new URI(value.trim());
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }

            StringBuilder origin = new StringBuilder()
                    .append(uri.getScheme())
                    .append("://")
                    .append(uri.getHost());

            if (uri.getPort() > 0) {
                origin.append(":").append(uri.getPort());
            }

            return origin.toString();
        } catch (URISyntaxException ex) {
            log.warn("Nao foi possivel interpretar a origem da requisicao para montar o link de verificacao: {}", value);
            return null;
        }
    }

    private String normalizeOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return null;
        }

        return origin.strip().replaceAll("/+$", "");
    }

    @lombok.Value
    @Builder
    public static class DispatchResult {
        boolean emailSent;
        String verificationUrl;
    }
}
