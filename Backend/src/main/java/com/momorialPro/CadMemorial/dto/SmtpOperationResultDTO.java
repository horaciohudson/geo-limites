package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmtpOperationResultDTO {
    private String source;
    private String host;
    private Integer port;
    private String username;
    private String fromAddress;
    private String fromName;
    private boolean startTls;
    private boolean sslEnabled;
}
