package com.momorialPro.CadMemorial.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "memorialpro.mail")
@Getter
@Setter
public class MailSettingsProperties {
    private boolean enabled = false;
    private String fromAddress = "";
    private String fromName = "Geo Limites";
}
