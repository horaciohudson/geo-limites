package com.momorialPro.CadMemorial.config;



import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.*;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class SwaggerConfig {

    @Value("${geolimites.public-url:https://www.geolimites.com.br}")
    private String publicUrl;

    @Bean
    public OpenAPI geoLimitesApi() {
        List<Server> servers = new ArrayList<>();
        String normalizedPublicUrl = publicUrl == null ? "" : publicUrl.trim().replaceAll("/+$", "");
        if (!normalizedPublicUrl.isBlank()) {
            servers.add(new Server().url(normalizedPublicUrl).description("Servidor publico"));
        }
        servers.add(new Server().url("http://localhost:9010").description("Servidor local"));

        return new OpenAPI()
                .info(new Info()
                        .title("GeoLimites API")
                        .description("API para geração e gerenciamento de memoriais descritivos baseados em DXF.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Equipe GeoLimites")
                                .email("contato@geolimites.com")))
                .servers(servers);
    }
}
