package com.momorialPro.CadMemorial.model;



import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tab_audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id")
    private Long id;

    @Column(nullable = false)
    private String action; // ex: CREATE_FILE, DELETE_USER

    @Column(nullable = false)
    private String entity; // nome da entidade afetada

    @Column(name = "entity_id")
    private String entityId; // pode ser Long ou UUID (armazenado como texto)

    @Column(length = 500)
    private String description;

    @Column(name = "username")
    private String username;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}