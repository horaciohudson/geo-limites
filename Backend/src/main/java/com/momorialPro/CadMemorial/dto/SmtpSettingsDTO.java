package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmtpSettingsDTO {
    private boolean enabled;
    private String host;
    private Integer port;
    private String username;
    private String passwordMasked;
    private boolean hasPassword;
    private boolean auth;
    private boolean sslEnabled;
    private boolean startTls;
    private String fromAddress;
    private String fromName;
}
