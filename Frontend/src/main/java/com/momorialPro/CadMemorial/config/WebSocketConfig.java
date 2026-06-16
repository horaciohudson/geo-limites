package com.momorialPro.CadMemorial.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilitar broker simples para envio de mensagens
        config.enableSimpleBroker("/topic", "/queue");
        
        // Prefixo para mensagens enviadas pelo cliente
        config.setApplicationDestinationPrefixes("/app");
        
        // Prefixo para mensagens diretas ao usuário
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WebSocket com fallback SockJS
        registry.addEndpoint("/ws/memorial")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}