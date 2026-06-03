package com.momorialPro.CadMemorial.repository;




import com.momorialPro.CadMemorial.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}