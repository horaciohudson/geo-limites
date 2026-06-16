package com.momorialPro.CadMemorial.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Configurar para servir arquivos JSON da raiz do projeto
        registry.addResourceHandler("/*.json")
                .addResourceLocations("file:./")
                .setCachePeriod(0); // Sem cache para desenvolvimento
    }
}