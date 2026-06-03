package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateSmtpSettingsRequest {
    private Boolean enabled;

    @Size(max = 255)
    private String host;

    @Min(1)
    @Max(65535)
    private Integer port;

    @Size(max = 255)
    private String username;

    @Size(max = 255)
    private String password;

    private Boolean auth;
    private Boolean startTls;
    private Boolean sslEnabled;

    @Email
    @Size(max = 255)
    private String fromAddress;

    @Size(max = 150)
    private String fromName;
}
