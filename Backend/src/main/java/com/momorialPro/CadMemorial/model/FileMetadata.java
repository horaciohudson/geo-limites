package com.momorialPro.CadMemorial.model;



import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "tab_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileMetadata extends AuditBase {

    @Id
    @GeneratedValue
    @Column(name = "file_id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "stored_name", nullable = false, length = 255)
    private String storedName;

    @Column(name = "extension", length = 20)
    private String extension;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "checksum_sha256", length = 64)
    private String checksumSha256;

    @Column(name = "disk_path", nullable = false, length = 500)
    private String diskPath;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    private Tenant tenant;

    // Novo relacionamento com User
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;
}
