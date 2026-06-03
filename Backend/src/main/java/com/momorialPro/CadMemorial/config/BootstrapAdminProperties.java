package com.momorialPro.CadMemorial.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "memorialpro.bootstrap.admin")
@Getter
@Setter
public class BootstrapAdminProperties {

    private boolean enabled = false;
    private String username;
    private String password;
    private String fullName = "Administrador GeoLimites";
}
