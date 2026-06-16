package com.momorialPro.CadMemorial.service;




import com.momorialPro.CadMemorial.model.AuditLog;
import com.momorialPro.CadMemorial.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repository;

    public void register(String action, String entity, String entityId, String description, String username) {
        AuditLog log = AuditLog.builder()
                .action(action)
                .entity(entity)
                .entityId(entityId)
                .description(description)
                .username(username)
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(log);
    }
}