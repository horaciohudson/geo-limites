package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.config.MailSettingsProperties;
import com.momorialPro.CadMemorial.dto.SmtpOperationResultDTO;
import com.momorialPro.CadMemorial.model.SmtpSettings;
import jakarta.mail.internet.MimeMessage;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Properties;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmtpMailService {

    private final SmtpSettingsService smtpSettingsService;
    private final MailSettingsProperties mailSettingsProperties;

    @Value("${spring.mail.host:}")
    private String defaultHost;

    @Value("${spring.mail.port:587}")
    private Integer defaultPort;

    @Value("${spring.mail.username:}")
    private String defaultUsername;

    @Value("${spring.mail.password:}")
    private String defaultPassword;

    @Value("${spring.mail.properties.mail.smtp.auth:true}")
    private boolean defaultAuth;

    @Value("${spring.mail.properties.mail.smtp.starttls.enable:true}")
    private boolean defaultStartTls;

    @Value("${spring.mail.properties.mail.smtp.ssl.enable:false}")
    private boolean defaultSslEnabled;

    @Value("${spring.mail.properties.mail.smtp.connectiontimeout:5000}")
    private int connectionTimeout;

    @Value("${spring.mail.properties.mail.smtp.timeout:5000}")
    private int timeout;

    @Value("${spring.mail.properties.mail.smtp.writetimeout:5000}")
    private int writeTimeout;

    public void sendHtml(String to, String subject, String html) {
        ResolvedSmtpConfiguration config = resolveActiveConfiguration();

        try {
            JavaMailSenderImpl mailSender = buildMailSender(config);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);

            if (StringUtils.hasText(config.getFromName())) {
                helper.setFrom(config.getFromAddress(), config.getFromName());
            } else {
                helper.setFrom(config.getFromAddress());
            }

            mailSender.send(message);
        } catch (MailException ex) {
            log.error("Falha ao enviar e-mail via SMTP [{}]: {}", config.getSource(), ex.getMessage(), ex);
            throw new IllegalStateException("Nao foi possivel enviar o e-mail. Verifique a configuracao SMTP.");
        } catch (Exception ex) {
            log.error("Falha ao montar e-mail via SMTP [{}]: {}", config.getSource(), ex.getMessage(), ex);
            throw new IllegalStateException("Nao foi possivel enviar o e-mail. Verifique a configuracao SMTP.");
        }
    }

    public SmtpOperationResultDTO testConnection() {
        ResolvedSmtpConfiguration config = resolveActiveConfiguration();

        try {
            buildMailSender(config).testConnection();
            return toResult(config);
        } catch (Exception ex) {
            log.error("Falha ao testar conexao SMTP [{}]: {}", config.getSource(), ex.getMessage(), ex);
            throw new IllegalStateException("Nao foi possivel conectar ao servidor SMTP. Verifique host, porta, usuario e senha.");
        }
    }

    public SmtpOperationResultDTO sendTestEmail(String to) {
        ResolvedSmtpConfiguration config = resolveActiveConfiguration();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(config.getFromAddress());
        message.setTo(to);
        message.setSubject("Teste de SMTP - GeoLimites");
        message.setText(
                "Este e-mail confirma que a configuracao SMTP do GeoLimites esta funcionando.\n\n" +
                        "Host: " + config.getHost() + "\n" +
                        "Porta: " + config.getPort() + "\n" +
                        "Origem: " + config.getSource()
        );

        try {
            buildMailSender(config).send(message);
            return toResult(config);
        } catch (MailException ex) {
            log.error("Falha ao enviar e-mail de teste via SMTP [{}]: {}", config.getSource(), ex.getMessage(), ex);
            throw new IllegalStateException("Nao foi possivel enviar o e-mail de teste. Verifique a configuracao SMTP.");
        }
    }

    private ResolvedSmtpConfiguration resolveActiveConfiguration() {
        SmtpSettings settings = smtpSettingsService.getCurrentSettings();
        boolean hasDatabaseHost = StringUtils.hasText(settings.getHost());

        if (Boolean.TRUE.equals(settings.getEnabled()) && hasDatabaseHost) {
            return buildDatabaseConfiguration(settings);
        }

        return buildFallbackConfiguration();
    }

    private ResolvedSmtpConfiguration buildDatabaseConfiguration(SmtpSettings settings) {
        String password = smtpSettingsService.getResolvedPassword();
        String fromAddress = StringUtils.hasText(settings.getFromAddress())
                ? settings.getFromAddress().trim()
                : trim(mailSettingsProperties.getFromAddress());
        String fromName = StringUtils.hasText(settings.getFromName())
                ? settings.getFromName().trim()
                : trim(mailSettingsProperties.getFromName());

        validateConfiguration(settings.getHost(), settings.getPort(), settings.getAuth(), settings.getUsername(), password, fromAddress);

        return new ResolvedSmtpConfiguration(
                "DATABASE_SETTINGS",
                true,
                settings.getHost().trim(),
                settings.getPort(),
                trim(settings.getUsername()),
                password,
                Boolean.TRUE.equals(settings.getAuth()),
                Boolean.TRUE.equals(settings.getStartTlsEnabled()),
                Boolean.TRUE.equals(settings.getSslEnabled()),
                fromAddress,
                fromName
        );
    }

    private ResolvedSmtpConfiguration buildFallbackConfiguration() {
        String fromAddress = trim(mailSettingsProperties.getFromAddress());
        String fromName = trim(mailSettingsProperties.getFromName());
        boolean enabled = mailSettingsProperties.isEnabled() && StringUtils.hasText(defaultHost);

        if (enabled) {
            validateConfiguration(defaultHost, defaultPort, defaultAuth, defaultUsername, defaultPassword, fromAddress);
        }

        return new ResolvedSmtpConfiguration(
                "APPLICATION_PROPERTIES",
                enabled,
                trim(defaultHost),
                defaultPort,
                trim(defaultUsername),
                defaultPassword,
                defaultAuth,
                defaultStartTls,
                defaultSslEnabled,
                fromAddress,
                fromName
        );
    }

    private void validateConfiguration(String host, Integer port, boolean auth, String username, String password, String fromAddress) {
        if (!StringUtils.hasText(host)) {
            throw new IllegalStateException("SMTP nao configurado. Informe o host do servidor SMTP.");
        }
        if (port == null || port < 1 || port > 65535) {
            throw new IllegalStateException("SMTP nao configurado. Informe uma porta valida.");
        }
        if (auth && !StringUtils.hasText(username)) {
            throw new IllegalStateException("SMTP com autenticacao exige um usuario configurado.");
        }
        if (auth && !StringUtils.hasText(password)) {
            throw new IllegalStateException("SMTP com autenticacao exige uma senha configurada.");
        }
        if (!StringUtils.hasText(fromAddress)) {
            throw new IllegalStateException("Informe o e-mail remetente para o envio SMTP.");
        }
    }

    private JavaMailSenderImpl buildMailSender(ResolvedSmtpConfiguration config) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(config.getHost());
        mailSender.setPort(config.getPort());
        mailSender.setUsername(config.getUsername());
        mailSender.setPassword(config.getPassword());

        Properties properties = mailSender.getJavaMailProperties();
        properties.put("mail.smtp.auth", String.valueOf(config.isAuth()));
        properties.put("mail.smtp.starttls.enable", String.valueOf(config.isStartTls()));
        properties.put("mail.smtp.ssl.enable", String.valueOf(config.isSslEnabled()));
        properties.put("mail.smtp.connectiontimeout", String.valueOf(connectionTimeout));
        properties.put("mail.smtp.timeout", String.valueOf(timeout));
        properties.put("mail.smtp.writetimeout", String.valueOf(writeTimeout));

        return mailSender;
    }

    private SmtpOperationResultDTO toResult(ResolvedSmtpConfiguration config) {
        return SmtpOperationResultDTO.builder()
                .source(config.getSource())
                .host(config.getHost())
                .port(config.getPort())
                .username(config.getUsername())
                .fromAddress(config.getFromAddress())
                .fromName(config.getFromName())
                .startTls(config.isStartTls())
                .sslEnabled(config.isSslEnabled())
                .build();
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : "";
    }

    @Getter
    private static class ResolvedSmtpConfiguration {
        private final String source;
        private final boolean enabled;
        private final String host;
        private final Integer port;
        private final String username;
        private final String password;
        private final boolean auth;
        private final boolean startTls;
        private final boolean sslEnabled;
        private final String fromAddress;
        private final String fromName;

        private ResolvedSmtpConfiguration(
                String source,
                boolean enabled,
                String host,
                Integer port,
                String username,
                String password,
                boolean auth,
                boolean startTls,
                boolean sslEnabled,
                String fromAddress,
                String fromName
        ) {
            this.source = source;
            this.enabled = enabled;
            this.host = host;
            this.port = port;
            this.username = username;
            this.password = password;
            this.auth = auth;
            this.startTls = startTls;
            this.sslEnabled = sslEnabled;
            this.fromAddress = fromAddress;
            this.fromName = fromName;
        }
    }
}
