package com.momorialPro.CadMemorial.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "memorialpro.auth")
@Getter
@Setter
public class AuthFlowProperties {
    private boolean autoVerifyUsers = false;
    private long verificationTokenHours = 24;
    private String frontendUrl = "https://www.geolimites.com.br";
}
