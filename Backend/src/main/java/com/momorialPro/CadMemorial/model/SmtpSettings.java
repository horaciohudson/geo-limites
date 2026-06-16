package com.momorialPro.CadMemorial.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tab_smtp_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmtpSettings extends AuditBase {

    public static final short DEFAULT_ID = 1;

    @Id
    @Column(name = "smtp_config_id", nullable = false)
    @Builder.Default
    private Short id = DEFAULT_ID;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private Boolean enabled = false;

    @Column(name = "host", nullable = false, length = 255)
    @Builder.Default
    private String host = "";

    @Column(name = "port", nullable = false)
    @Builder.Default
    private Integer port = 587;

    @Column(name = "username", nullable = false, length = 255)
    @Builder.Default
    private String username = "";

    @Column(name = "password_encrypted", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private String passwordEncrypted = "";

    @Column(name = "auth", nullable = false)
    @Builder.Default
    private Boolean auth = true;

    @Column(name = "starttls_enabled", nullable = false)
    @Builder.Default
    private Boolean startTlsEnabled = true;

    @Column(name = "ssl_enabled", nullable = false)
    @Builder.Default
    private Boolean sslEnabled = false;

    @Column(name = "from_address", nullable = false, length = 255)
    @Builder.Default
    private String fromAddress = "";

    @Column(name = "from_name", nullable = false, length = 150)
    @Builder.Default
    private String fromName = "Geo Limites";

    @PrePersist
    protected void ensureSingletonId() {
        if (id == null) {
            id = DEFAULT_ID;
        }
    }
}
