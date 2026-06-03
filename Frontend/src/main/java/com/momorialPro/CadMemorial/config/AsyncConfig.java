package com.momorialPro.CadMemorial.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "memorialTaskExecutor")
    public Executor memorialTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Pool otimizado para tarefas CPU-intensivas de longa duração
        executor.setCorePoolSize(2);           // Threads mínimas
        executor.setMaxPoolSize(5);            // Threads máximas
        executor.setQueueCapacity(10);         // Fila de espera
        executor.setKeepAliveSeconds(60);      // Tempo de vida das threads extras
        
        // Configurações de nomenclatura e rejeição
        executor.setThreadNamePrefix("Memorial-");
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        
        // Aguardar conclusão das tarefas no shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        
        executor.initialize();
        return executor;
    }

    @Bean(name = "notificationTaskExecutor")
    public Executor notificationTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Pool para notificações rápidas
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(3);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("Notification-");
        
        executor.initialize();
        return executor;
    }
}