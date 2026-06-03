package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.config.AuthFlowProperties;
import com.momorialPro.CadMemorial.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountEmailService {

    private final SmtpMailService smtpMailService;
    private final AuthFlowProperties authFlowProperties;

    public void sendVerificationEmail(User user, String token) {
        String verificationUrl = buildVerificationUrl(token);
        String subject = "Confirme seu e-mail no Geo Limites";
        String html = """
                <p>Olá, %s.</p>
                <p>Sua conta foi criada no Geo Limites. Para liberar o acesso, confirme seu e-mail clicando no link abaixo:</p>
                <p><a href="%s">%s</a></p>
                <p>Se você não solicitou esse cadastro, ignore esta mensagem.</p>
                """.formatted(safeName(user), verificationUrl, verificationUrl);

        smtpMailService.sendHtml(user.getEmail(), subject, html);
    }

    private String buildVerificationUrl(String token) {
        String baseUrl = authFlowProperties.getFrontendUrl();
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
}
